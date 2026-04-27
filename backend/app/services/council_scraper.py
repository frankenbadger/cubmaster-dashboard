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
    """
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
    except Exception as e:
        logger.warning(f"[{council_name}] Failed to fetch {url}: {e}")
        return []

    soup = BeautifulSoup(resp.content, "html.parser")
    events = []

    # scoutingevent.com renders event rows with a consistent structure.
    # Try the table/row pattern first, then generic link scanning.

    # Strategy 1: look for rows containing event links
    # The site uses <a> tags with href like /497/event/12345 or /Calendar/event/...
    event_links = soup.find_all("a", href=re.compile(r"/\d+/|/event/", re.I))

    seen = set()
    for link in event_links:
        title = link.get_text(strip=True)
        href = link.get("href", "")

        if not title or len(title) < 4:
            continue
        # Skip navigation links
        if any(skip in title.lower() for skip in ["register", "login", "home", "about", "contact", "calendar"]):
            continue
        if title in seen:
            continue
        seen.add(title)

        full_url = href if href.startswith("http") else base_url + href

        # Look for date text near this link (parent container, siblings, next elements)
        container = link.parent
        for _ in range(4):  # walk up to 4 levels up
            if container is None:
                break
            text = container.get_text(" ", strip=True)
            # Look for date-like patterns
            date_match = re.search(
                r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+\d{1,2}"
                r"(\s*[-–]\s*(?:\w+\.?\s+)?\d{1,2})?,?\s+\d{4}",
                text,
                re.IGNORECASE,
            )
            if date_match:
                start_date, end_date = _parse_date_range(date_match.group(0))
                break
            container = container.parent
        else:
            start_date, end_date = None, None

        # Try to extract location from container text
        location = None
        if container is not None:
            loc_match = re.search(r"(?:Location|Where|Camp|at)\s*[:\-]?\s*([A-Z][^\n,]{3,50})", container.get_text(), re.IGNORECASE)
            if loc_match:
                location = loc_match.group(1).strip()

        events.append({
            "title": title,
            "start_date": start_date,
            "end_date": end_date,
            "url": full_url,
            "location": location,
        })

    # Strategy 2: if nothing found yet, try structured table rows
    if not events:
        for row in soup.select("tr, .event-row, .listing-row"):
            cells = row.find_all(["td", "th", "div"])
            if len(cells) < 2:
                continue
            title_cell = cells[0].get_text(strip=True)
            date_cell = cells[1].get_text(strip=True) if len(cells) > 1 else ""
            if not title_cell or len(title_cell) < 4:
                continue
            link_el = row.find("a")
            href = link_el["href"] if link_el and link_el.get("href") else ""
            full_url = href if href.startswith("http") else base_url + href
            start_date, end_date = _parse_date_range(date_cell) if date_cell else (None, None)
            events.append({
                "title": title_cell,
                "start_date": start_date,
                "end_date": end_date,
                "url": full_url or url,
                "location": cells[2].get_text(strip=True) if len(cells) > 2 else None,
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
