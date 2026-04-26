from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime, date
from pydantic import BaseModel
from typing import Optional
import json

from ..database import get_session, PackMeetingAgenda, CalendarEvent
from .auth import get_current_user, User

router = APIRouter()

# BSA 7-part pack meeting structure
DEFAULT_AGENDA = [
    {"part": 1, "title": "Gathering activity",        "duration": 10, "owner": "Den leaders",      "notes": ""},
    {"part": 2, "title": "Opening ceremony",           "duration": 5,  "owner": "Assigned den",     "notes": "Flag ceremony, Pledge, Scout Oath/Law"},
    {"part": 3, "title": "Business items",             "duration": 10, "owner": "Cubmaster",        "notes": "Announcements, upcoming events"},
    {"part": 4, "title": "Program / activities",       "duration": 20, "owner": "Cubmaster",        "notes": "Main event or theme activity"},
    {"part": 5, "title": "Den demonstrations",         "duration": 10, "owner": "Dens",             "notes": "Each den shares something from the month"},
    {"part": 6, "title": "Advancement & recognition",  "duration": 10, "owner": "Cubmaster",        "notes": "Rank awards, belt loops, special recognition"},
    {"part": 7, "title": "Closing ceremony",           "duration": 5,  "owner": "Assigned den",     "notes": "Cubmaster Minute, Scouts own"},
]


class AgendaUpsert(BaseModel):
    year: int
    month: int
    meeting_date: Optional[date] = None
    theme: Optional[str] = None
    agenda_json: Optional[str] = None
    notes: Optional[str] = None


@router.get("/{year}/{month}")
def get_agenda(year: int, month: int, session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    agenda = session.exec(select(PackMeetingAgenda).where(
        PackMeetingAgenda.year == year, PackMeetingAgenda.month == month)).first()
    if not agenda:
        return {
            "year": year, "month": month,
            "meeting_date": None,
            "theme": None,
            "agenda_json": json.dumps(DEFAULT_AGENDA),
            "notes": None,
        }
    return agenda


@router.put("/{year}/{month}")
def upsert_agenda(year: int, month: int, data: AgendaUpsert, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    agenda = session.exec(select(PackMeetingAgenda).where(
        PackMeetingAgenda.year == year, PackMeetingAgenda.month == month)).first()
    if not agenda:
        agenda = PackMeetingAgenda(year=year, month=month)
    for field, value in data.model_dump(exclude={"year","month"}).items():
        if value is not None:
            setattr(agenda, field, value)
    agenda.updated_by = current_user.username
    session.add(agenda)
    session.commit()
    session.refresh(agenda)
    return agenda


@router.get("/{year}/{month}/template")
def get_template(_year: int, _month: int, _: User = Depends(get_current_user)):
    """Always returns the default 7-part BSA agenda template."""
    return DEFAULT_AGENDA
