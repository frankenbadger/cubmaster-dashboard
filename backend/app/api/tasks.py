from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from ..database import get_session, MonthlyTask, MONTH_TASKS_TEMPLATE
from .auth import get_current_user, User
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class TaskToggle(BaseModel):
    done: bool

@router.get("/{year}/{month}")
def get_tasks(year: int, month: int, session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    tasks = session.exec(
        select(MonthlyTask)
        .where(MonthlyTask.year == year, MonthlyTask.month == month)
        .order_by(MonthlyTask.task_index)
    ).all()
    if not tasks and month in MONTH_TASKS_TEMPLATE:
        for i, t in enumerate(MONTH_TASKS_TEMPLATE[month]):
            session.add(MonthlyTask(
                year=year, month=month, task_index=i,
                label=t["label"], tag=t["tag"], urgent=t["urgent"],
            ))
        session.commit()
        tasks = session.exec(
            select(MonthlyTask)
            .where(MonthlyTask.year == year, MonthlyTask.month == month)
            .order_by(MonthlyTask.task_index)
        ).all()
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
