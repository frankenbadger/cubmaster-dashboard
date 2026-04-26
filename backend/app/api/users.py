from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from ..database import get_session, User
from .auth import get_current_user, require_cubmaster

router = APIRouter()

@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "role": current_user.role, "email": current_user.email}

@router.get("/")
def list_users(session: Session = Depends(get_session), _: User = Depends(require_cubmaster)):
    users = session.exec(select(User)).all()
    return [{"id": u.id, "username": u.username, "email": u.email, "role": u.role} for u in users]
