from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from datetime import date
from ..database import get_session, CalendarEvent
from .auth import get_current_user, User

router = APIRouter()

@router.get("/")
def list_events(session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    today = date.today()
    return session.exec(select(CalendarEvent).where(CalendarEvent.start_date >= today).order_by(CalendarEvent.start_date)).all()
