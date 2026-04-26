from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

from ..database import get_session, Den
from .auth import get_current_user, User

router = APIRouter()


class DenUpdate(BaseModel):
    status: Optional[str] = None       # "good" | "checkin" | "help" | None
    notes: Optional[str] = None
    advancements_current: Optional[bool] = None
    leader_name: Optional[str] = None
    asst_leader_name: Optional[str] = None


@router.get("/")
def list_dens(session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    return session.exec(select(Den)).all()


@router.patch("/{den_id}")
def update_den(den_id: int, update: DenUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    den = session.get(Den, den_id)
    if not den:
        raise HTTPException(status_code=404, detail="Den not found")
    if update.status is not None:
        den.status = update.status
    if update.notes is not None:
        den.notes = update.notes
    if update.advancements_current is not None:
        den.advancements_current = update.advancements_current
    if update.leader_name is not None:
        den.leader_name = update.leader_name
    if update.asst_leader_name is not None:
        den.asst_leader_name = update.asst_leader_name
    den.updated_at = datetime.utcnow()
    den.updated_by = current_user.username
    session.add(den)
    session.commit()
    session.refresh(den)
    return den
