"""
Scrape event listings from nearby BSA council calendars.
Supports scoutingevent.com (primary) with generic BeautifulSoup fallback.
Each council is wrapped in its own try/except so one failure doesn't block others.
"""
import re
import os
import logging
from datetime import date, datetime
from typing import Optional, Tuple

import requests
from bs4 import BeautifulSoup
from dateutil import parser as dateutil_parser
from sqlmodel import Session, select

from ..database import engine, CouncilEvent

logger = logging.getLogger(__name__)

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; CubmasterDashboard/1.0; +https://pack44.local)"}

COUNCILS = [
    {
        "name": "JVC",
        "url_env": "JVC_CALENDAR_URL",
        "default_url": "https://scoutingevent.com/497/Calendar/",
        "base_url": "https://scoutingevent.com",
    },
    {
        "name": "Bucktail",
        "url_env": "BUCKTAIL_CALENDAR_URL",
        "default_url": "https://scoutingevent.com/509/Calendar/",
        "base_url": "https://scoutingevent.com",
    },
    {
        "name": "Laurel Highlands",
        "url_env": "LH_CALENDAR_URL",
        "default_url": "https://scoutingevent.com/527/Calendar/",
        "base_url": "https://scoutingevent.com",
    },
]


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")[:200]


def _parse_date_range(date_str: str) -> Tuple[Optional[date], Optional[date]]:
    """Parse a date string that may contain a range. Returns (start, end)."""
    date_str = date_str.strip()
    date_str = date_str.replace("–", " - ").replace("—", " - ")

    if " - " in date_str:
        parts = date_str.split(" - ", 1)
        try:
            start_dt = dateutil_parser.parse(parts[0].strip(), default=datetime(datetime.utcnow().year, 1, 1))
            try:
                # End part may be just "20, 2026" — inherit month/year from start
                end_dt = dateutil_parser.parse(
                    parts[1].strip(),
                    default=datetime(start_dt.year, start_dt.month, 1),
                )
            except Exception:
                end_dt = None
            return start_dt.date(), end_dt.date() if end_dt else None
        except Exception:
            pass

    try:
        dt = dateutil_parser.parse(date_str, default=datetime(datetime.utcnow().year, 1, 1))
        return dt.date(), None
    except Exception:
        return None, None


def _scrape_scoutingevent(url: str, council_name: str, base_url: str) -> list[dict]:
    """
    Scrape a scoutingevent.com council calendar page.
    Returns a list of raw event dicts: {title, start_date, end_date, url, location}.

    scoutingevent.com renders a card-list view. Date headers use the class
    `cal-event-dark` containing a `cal-date-title` div, followed by sibling
    `cal-event` rows for each event on that date. Event links use the format
    `/{council_id}-{event_id}` or `/?OrgKey=...&calendarID=...`.
    """
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
    except Exception as e:
        logger.warning(f"[{council_name}] Failed to fetch {url}: {e}")
        return []

    soup = BeautifulSoup(resp.content, "html.parser")
    events = []
    current_date_str: Optional[str] = None

    # Walk all cal-event rows in document order; dark rows carry the date header.
    for row in soup.select(".cal-event"):
        if "cal-event-dark" in row.get("class", []):
            date_el = row.select_one(".cal-date-title")
            current_date_str = date_el.get_text(strip=True) if date_el else None
            continue

        title_el = row.select_one(".cal-title a")
        if not title_el:
            continue
        title = title_el.get_text(strip=True)
        if not title or len(title) < 3:
            continue

        href = title_el.get("href", "")
        full_url = href if href.startswith("http") else base_url + href

        loc_el = row.select_one(".cal-loc-content")
        location = loc_el.get_text(strip=True) if loc_el else None
        # Strip "Read more" / map links that bleed into location text
        if location:
            location = re.split(r"\s{2,}", location)[0].strip() or None

        start_date, end_date = _parse_date_range(current_date_str) if current_date_str else (None, None)

        events.append({
            "title": title,
            "start_date": start_date,
            "end_date": end_date,
            "url": full_url,
            "location": location,
        })

    logger.info(f"[{council_name}] Found {len(events)} raw events from {url}")
    return events


def scrape_all_councils() -> None:
    """Main entry point — called by the scheduler. Scrapes all councils and upserts into DB."""
    today = date.today()

    with Session(engine) as session:
        for council_cfg in COUNCILS:
            council_name = council_cfg["name"]
            url = os.getenv(council_cfg["url_env"], council_cfg["default_url"])

            try:
                raw_events = _scrape_scoutingevent(url, council_name, council_cfg["base_url"])
                new_count = 0
                for ev in raw_events:
                    if not ev["title"]:
                        continue
                    # Skip past events
                    if ev["start_date"] and ev["start_date"] < today:
                        continue

                    external_id = _slugify(f"{council_name}_{ev['title']}_{ev['start_date']}")
                    existing = session.exec(
                        select(CouncilEvent).where(CouncilEvent.external_id == external_id)
                    ).first()

                    if existing:
                        # Update details but preserve status
                        existing.title = ev["title"]
                        existing.start_date = ev["start_date"]
                        existing.end_date = ev["end_date"]
                        existing.url = ev["url"] or existing.url
                        existing.location = ev["location"] or existing.location
                        session.add(existing)
                    else:
                        session.add(CouncilEvent(
                            external_id=external_id,
                            title=ev["title"],
                            start_date=ev["start_date"],
                            end_date=ev["end_date"],
                            council=council_name,
                            url=ev["url"],
                            location=ev["location"],
                        ))
                        new_count += 1

                session.commit()
                logger.info(f"[{council_name}] Upsert complete — {new_count} new events")

            except Exception as e:
                logger.error(f"[{council_name}] Scrape failed: {e}")
