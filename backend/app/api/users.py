from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional

from ..database import get_session, User
from .auth import get_current_user, require_cubmaster

router = APIRouter()


class UserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "role": current_user.role, "email": current_user.email}


@router.get("/")
def list_users(session: Session = Depends(get_session), _: User = Depends(require_cubmaster)):
    users = session.exec(select(User)).all()
    return [{"id": u.id, "username": u.username, "email": u.email, "role": u.role, "is_active": u.is_active} for u in users]


@router.patch("/{user_id}")
def update_user(user_id: int, update: UserUpdate, session: Session = Depends(get_session), current_user: User = Depends(require_cubmaster)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if update.is_active is not None:
        user.is_active = update.is_active
    if update.role is not None:
        user.role = update.role
    session.add(user)
    session.commit()
    session.refresh(user)
    return {"id": user.id, "username": user.username, "email": user.email, "role": user.role, "is_active": user.is_active}


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, session: Session = Depends(get_session), current_user: User = Depends(require_cubmaster)):
    if user_id == current_user.id:
        raise HTTPException(400, "Cannot delete your own account")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    session.delete(user)
    session.commit()
