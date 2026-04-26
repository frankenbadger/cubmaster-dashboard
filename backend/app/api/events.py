from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import date
from pydantic import BaseModel
from typing import Optional
import uuid

from ..database import get_session, CalendarEvent
from .auth import get_current_user, User
from ..scheduler import get_last_sync

router = APIRouter()


class EventCreate(BaseModel):
    summary: str
    start_date: date
    end_date: Optional[date] = None
    location: Optional[str] = None
    description: Optional[str] = None


@router.get("/sync-status")
def sync_status(_: User = Depends(get_current_user)):
    sync_time = get_last_sync()
    return {"last_sync": sync_time.isoformat() if sync_time else None}


@router.get("/")
def list_events(session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    today = date.today()
    return session.exec(
        select(CalendarEvent)
        .where(CalendarEvent.start_date >= today)
        .order_by(CalendarEvent.start_date)
    ).all()


@router.post("/", status_code=201)
def create_event(event: EventCreate, session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    new_event = CalendarEvent(
        uid=f"manual-{uuid.uuid4()}",
        summary=event.summary,
        start_date=event.start_date,
        end_date=event.end_date,
        location=event.location or "",
        description=event.description or "",
        source="manual",
    )
    session.add(new_event)
    session.commit()
    session.refresh(new_event)
    return new_event


@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: int, session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    event = session.get(CalendarEvent, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    if event.source != "manual":
        raise HTTPException(400, "Cannot delete synced events")
    session.delete(event)
    session.commit()
