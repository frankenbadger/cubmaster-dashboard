from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from ..database import get_session, MonthlyTask, MONTH_TASKS_TEMPLATE
from .auth import get_current_user, User
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter()


class TaskToggle(BaseModel):
    done: bool


class TaskNotesPatch(BaseModel):
    notes: Optional[str] = None
    subtasks: Optional[str] = None  # JSON string


def _seed_tasks(year: int, month: int, session: Session):
    if month not in MONTH_TASKS_TEMPLATE:
        return []
    for i, t in enumerate(MONTH_TASKS_TEMPLATE[month]):
        session.add(MonthlyTask(
            year=year, month=month, task_index=i,
            label=t["label"], tag=t["tag"], urgent=t["urgent"],
            due_reminder=t.get("due_reminder"),
        ))
    session.commit()
    return session.exec(
        select(MonthlyTask)
        .where(MonthlyTask.year == year, MonthlyTask.month == month)
        .order_by(MonthlyTask.task_index)
    ).all()


@router.get("/{year}/{month}")
def get_tasks(year: int, month: int, session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    tasks = session.exec(
        select(MonthlyTask)
        .where(MonthlyTask.year == year, MonthlyTask.month == month)
        .order_by(MonthlyTask.task_index)
    ).all()
    if not tasks:
        tasks = _seed_tasks(year, month, session)
    return tasks


@router.get("/{year}/{month}/initialize")
def initialize_tasks(year: int, month: int, session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    """Ensure tasks exist for year/month, seed from template if not. Return all tasks."""
    tasks = session.exec(
        select(MonthlyTask)
        .where(MonthlyTask.year == year, MonthlyTask.month == month)
        .order_by(MonthlyTask.task_index)
    ).all()
    if not tasks:
        tasks = _seed_tasks(year, month, session)
    return tasks


@router.patch("/{task_id}")
def toggle_task(task_id: int, body: TaskToggle, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    task = session.get(MonthlyTask, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    task.done = body.done
    task.done_by = current_user.username if body.done else None
    task.done_at = datetime.utcnow() if body.done else None
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.patch("/{task_id}/notes")
def update_task_notes(task_id: int, body: TaskNotesPatch, session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    task = session.get(MonthlyTask, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    if body.notes is not None:
        task.notes = body.notes
    if body.subtasks is not None:
        task.subtasks = body.subtasks
    session.add(task)
    session.commit()
    session.refresh(task)
    return task
