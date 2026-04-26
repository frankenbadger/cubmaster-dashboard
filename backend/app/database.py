from sqlmodel import SQLModel, create_engine, Session, Field
from typing import Optional
from datetime import datetime, date
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////data/cubmaster.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

def init_db():
    SQLModel.metadata.create_all(engine)
    _seed_dens()

def get_session():
    with Session(engine) as session:
        yield session

def _seed_dens():
    """Ensure the 6 Pack 44 dens always exist."""
    from sqlmodel import select
    dens = ["Lions", "Tigers", "Wolves", "Bears", "Webelos", "AOL"]
    with Session(engine) as session:
        for name in dens:
            existing = session.exec(select(Den).where(Den.name == name)).first()
            if not existing:
                session.add(Den(name=name))
        session.commit()


# ── Models ────────────────────────────────────────────────────────────────────

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True)
    hashed_password: str
    role: str = Field(default="assistant")  # "cubmaster" | "assistant"
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Den(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True)   # Lions, Tigers, etc.
    status: Optional[str] = None     # "good" | "checkin" | "help"
    notes: Optional[str] = None
    advancements_current: Optional[bool] = None
    leader_name: Optional[str] = None
    asst_leader_name: Optional[str] = None
    asst_leader_email: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None


class MonthlyTask(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    year: int
    month: int                        # 0-indexed to match JS
    task_index: int
    label: str
    tag: str
    urgent: bool = False
    done: bool = False
    done_by: Optional[str] = None
    done_at: Optional[datetime] = None


class CalendarEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    uid: str = Field(unique=True, index=True)   # iCal UID
    summary: str
    start_date: date
    end_date: Optional[date] = None
    location: Optional[str] = None
    description: Optional[str] = None
    source: str = Field(default="ical")         # "ical" | "manual"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MonthlyReport(SQLModel, table=True):
    """One report per month. Cubmaster fills notes; app generates the doc."""
    id: Optional[int] = Field(default=None, primary_key=True)
    year: int
    month: int
    # Section 1 — last pack meeting
    last_meeting_summary: Optional[str] = None
    last_meeting_attendance: Optional[str] = None
    last_meeting_went_well: Optional[str] = None
    last_meeting_needs_improvement: Optional[str] = None
    # Section 2 — upcoming meeting
    upcoming_meeting_program: Optional[str] = None
    upcoming_meeting_agenda: Optional[str] = None
    # Section 3 — events
    upcoming_events: Optional[str] = None
    # Section 4 — den updates (stored as JSON string)
    den_updates: Optional[str] = None
    # Section 5 — general notes
    notes: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None


class PackMeetingAgenda(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    year: int
    month: int
    meeting_date: Optional[date] = None
    theme: Optional[str] = None
    # The 7-part BSA pack meeting structure stored as JSON
    agenda_json: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None
