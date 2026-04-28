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


@router.post("/scrape")
def trigger_scrape(_: User = Depends(get_current_user)):
    """Manually trigger a council scrape. Returns a count of events now in DB."""
    from ..services.council_scraper import scrape_all_councils
    from ..database import engine
    scrape_all_councils()
    with Session(engine) as s:
        count = len(s.exec(select(CouncilEvent)).all())
    return {"scraped": True, "total_events": count}


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
