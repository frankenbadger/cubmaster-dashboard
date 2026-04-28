from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional
import uuid

from ..database import get_session, CouncilEvent, CalendarEvent
from .auth import get_current_user, User

router = APIRouter()


class StatusUpdate(BaseModel):
    status: str  # "new" | "saved" | "dismissed" | "promoted"


@router.get("/")
def list_council_events(session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    """List all non-dismissed events ordered by date (nulls last)."""
    events = session.exec(
        select(CouncilEvent)
        .where(CouncilEvent.status != "dismissed")
        .order_by(CouncilEvent.start_date)
    ).all()
    return events


@router.get("/saved")
def list_saved_events(session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    return session.exec(
        select(CouncilEvent).where(CouncilEvent.status == "saved").order_by(CouncilEvent.start_date)
    ).all()


@router.get("/scrape")
def trigger_scrape():
    """Scrape councils and return a per-council debug breakdown."""
    import os
    import requests
    from datetime import date
    from bs4 import BeautifulSoup
    from ..services.council_scraper import (
        COUNCILS, HEADERS, _scrape_scoutingevent, scrape_all_councils
    )
    today = date.today()
    report = []

    for cfg in COUNCILS:
        url = os.getenv(cfg["url_env"], cfg["default_url"])
        # Check HTTP reachability first
        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            http_status = resp.status_code
            cal_event_count = len(BeautifulSoup(resp.content, "html.parser").select(".cal-event"))
        except Exception as e:
            report.append({"council": cfg["name"], "url": url, "error": str(e)})
            continue

        raw = _scrape_scoutingevent(url, cfg["name"], cfg["base_url"])
        past = [e for e in raw if e["start_date"] and e["start_date"] < today]
        future = [e for e in raw if not e["start_date"] or e["start_date"] >= today]

        report.append({
            "council": cfg["name"],
            "url": url,
            "http_status": http_status,
            "cal_event_elements": cal_event_count,
            "raw_events_found": len(raw),
            "filtered_as_past": len(past),
            "will_be_stored": len(future),
            "sample": [{"title": e["title"], "start_date": str(e["start_date"]), "url": e["url"]} for e in future[:3]],
        })

    scrape_all_councils()
    from ..database import engine
    with Session(engine) as s:
        total = len(s.exec(select(CouncilEvent)).all())

    return {"today": str(today), "total_in_db": total, "councils": report}


@router.patch("/{event_id}")
def update_status(event_id: int, body: StatusUpdate, session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    event = session.get(CouncilEvent, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    event.status = body.status
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


@router.post("/{event_id}/promote")
def promote_event(event_id: int, session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    """Copy this council event into the pack CalendarEvent table."""
    event = session.get(CouncilEvent, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    if not event.start_date:
        raise HTTPException(400, "Cannot promote an event with no date")

    cal = CalendarEvent(
        uid=f"council-{event.id}-{uuid.uuid4()}",
        summary=event.title,
        start_date=event.start_date,
        end_date=event.end_date,
        location=event.location or "",
        description=f"[{event.council}] {event.url or ''}",
        source="manual",
    )
    session.add(cal)
    event.status = "promoted"
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: int, session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    event = session.get(CouncilEvent, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    session.delete(event)
    session.commit()
