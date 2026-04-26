from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlmodel import Session, select
from datetime import date, timedelta
import httpx
import os
import logging

from .database import engine, CalendarEvent

logger = logging.getLogger(__name__)


def poll_ical():
    """Fetch Band iCal feed and sync events into the database."""
    ical_url = os.getenv("ICAL_URL", "")
    if not ical_url:
        return

    try:
        from icalendar import Calendar
        response = httpx.get(ical_url, timeout=15)
        response.raise_for_status()
        cal = Calendar.from_ical(response.content)

        with Session(engine) as session:
            for component in cal.walk():
                if component.name != "VEVENT":
                    continue
                uid = str(component.get("UID", ""))
                summary = str(component.get("SUMMARY", "No title"))
                dtstart = component.get("DTSTART")
                dtend = component.get("DTEND")

                start_date = dtstart.dt if dtstart else None
                if hasattr(start_date, "date"):
                    start_date = start_date.date()
                end_date = dtend.dt if dtend else None
                if hasattr(end_date, "date"):
                    end_date = end_date.date()

                if not uid or not start_date:
                    continue

                existing = session.exec(select(CalendarEvent).where(CalendarEvent.uid == uid)).first()
                if existing:
                    existing.summary = summary
                    existing.start_date = start_date
                    existing.end_date = end_date
                    session.add(existing)
                else:
                    session.add(CalendarEvent(
                        uid=uid, summary=summary,
                        start_date=start_date, end_date=end_date,
                        location=str(component.get("LOCATION", "") or ""),
                        description=str(component.get("DESCRIPTION", "") or ""),
                    ))
            session.commit()
        logger.info("iCal sync complete")
    except Exception as e:
        logger.error(f"iCal sync failed: {e}")


def send_reminders():
    """Email reminders for upcoming events based on ALERT_LEAD_DAYS."""
    lead_days_raw = os.getenv("ALERT_LEAD_DAYS", "7,3,1")
    lead_days = [int(d.strip()) for d in lead_days_raw.split(",")]
    today = date.today()
    target_dates = [today + timedelta(days=d) for d in lead_days]

    smtp_host = os.getenv("SMTP_HOST", "")
    if not smtp_host:
        return

    with Session(engine) as session:
        for target_date in target_dates:
            events = session.exec(
                select(CalendarEvent).where(CalendarEvent.start_date == target_date)
            ).all()
            for event in events:
                days_away = (event.start_date - today).days
                _send_reminder_email(event, days_away)


def _send_reminder_email(event, days_away):
    import aiosmtplib, asyncio, email.message

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)

    if not all([smtp_host, smtp_user, smtp_pass]):
        return

    msg = email.message.EmailMessage()
    msg["Subject"] = f"Pack 44 Reminder: {event.summary} in {days_away} day{'s' if days_away != 1 else ''}"
    msg["From"] = smtp_from
    msg["To"] = smtp_user   # TODO: pull from user table
    msg.set_content(
        f"Heads up — '{event.summary}' is coming up on {event.start_date.strftime('%A, %B %d')}.\n\n"
        f"Location: {event.location or 'TBD'}\n\n"
        f"— Pack 44 Cubmaster Dashboard"
    )

    async def _send():
        await aiosmtplib.send(msg, hostname=smtp_host, port=smtp_port,
                              username=smtp_user, password=smtp_pass, start_tls=True)

    try:
        asyncio.run(_send())
        logger.info(f"Reminder sent for {event.summary}")
    except Exception as e:
        logger.error(f"Email failed: {e}")


def start_scheduler():
    poll_interval = int(os.getenv("ICAL_POLL_INTERVAL", 120))
    scheduler = BackgroundScheduler()
    scheduler.add_job(poll_ical, IntervalTrigger(minutes=poll_interval), id="ical_poll", replace_existing=True)
    scheduler.add_job(send_reminders, IntervalTrigger(hours=12), id="reminders", replace_existing=True)
    scheduler.start()
    logger.info("Scheduler started")
    # Run once immediately
    poll_ical()
