from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from ..database import get_session, MonthlyTask
from .auth import get_current_user, User
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()

class TaskToggle(BaseModel):
    done: bool

@router.get("/{year}/{month}")
def get_tasks(year: int, month: int, session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    return session.exec(select(MonthlyTask).where(MonthlyTask.year == year, MonthlyTask.month == month)).all()

@router.patch("/{task_id}")
def toggle_task(task_id: int, body: TaskToggle, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    task = session.get(MonthlyTask, task_id)
    if not task:
        from fastapi import HTTPException
        raise HTTPException(404, "Task not found")
    task.done = body.done
    task.done_by = current_user.username if body.done else None
    task.done_at = datetime.utcnow() if body.done else None
    session.add(task)
    session.commit()
    session.refresh(task)
    return task
