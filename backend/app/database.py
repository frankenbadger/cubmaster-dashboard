from sqlmodel import SQLModel, create_engine, Session, Field
from typing import Optional
from datetime import datetime, date
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////data/cubmaster.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

def init_db():
    SQLModel.metadata.create_all(engine)
    _migrate_db()
    _seed_dens()

def _migrate_db():
    """Add columns that may be missing from databases created before a schema change."""
    from sqlalchemy import text
    migrations = [
        "ALTER TABLE den ADD COLUMN den_number TEXT",
        "ALTER TABLE den ADD COLUMN scout_count INTEGER",
        "ALTER TABLE den ADD COLUMN leader_name TEXT",
        "ALTER TABLE den ADD COLUMN leader_email TEXT",
        "ALTER TABLE den ADD COLUMN asst_leader_name TEXT",
        "ALTER TABLE den ADD COLUMN asst_leader_email TEXT",
        "ALTER TABLE monthlyreport ADD COLUMN extra_sections TEXT",
        "ALTER TABLE monthlyreport ADD COLUMN last_meeting_name TEXT",
        "ALTER TABLE monthlyreport ADD COLUMN potential_outings TEXT",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # column already exists

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


# ── Monthly task templates ────────────────────────────────────────────────────

MONTH_TASKS_TEMPLATE = {
    8:  [{"label": "Check in with all 6 den leaders",          "tag": "Week 1",     "urgent": False},
         {"label": "Review Scoutbook — advancements pending?", "tag": "Week 1",     "urgent": False},
         {"label": "Confirm pack meeting date & location",      "tag": "Week 1",     "urgent": False},
         {"label": "Recruitment signup night at school",        "tag": "Critical",   "urgent": True},
         {"label": "Annual pack calendar shared with families", "tag": "Week 2",     "urgent": False}],
    9:  [{"label": "Kickoff pack meeting — welcome everyone",  "tag": "Pack meeting","urgent": False},
         {"label": "Confirm all 6 den leaders are set",        "tag": "Week 1",     "urgent": False},
         {"label": "Popcorn sale kickoff announced",           "tag": "Fundraiser", "urgent": False},
         {"label": "Follow up with recruitment leads",         "tag": "Recruitment","urgent": True}],
    10: [{"label": "Popcorn sale — push final week",           "tag": "Fundraiser", "urgent": True},
         {"label": "Check advancement progress with all DLs",  "tag": "Advancement","urgent": False},
         {"label": "Fall outing / Trunk-or-Treat planned",     "tag": "Event",      "urgent": False},
         {"label": "Pinewood Derby kits distributed",          "tag": "Dec prep",   "urgent": False}],
    11: [{"label": "Scouting for Food service project",        "tag": "Service",    "urgent": False},
         {"label": "Rechartering — start roster review",       "tag": "Admin",      "urgent": True},
         {"label": "Mid-year committee budget check",          "tag": "Finances",   "urgent": False},
         {"label": "Advancement check-in with all DLs",        "tag": "Advancement","urgent": False}],
    0:  [{"label": "Recharter submitted to council",           "tag": "Admin",      "urgent": True},
         {"label": "Pinewood Derby — race day!",               "tag": "Event",      "urgent": False},
         {"label": "Holiday party / pack celebration",         "tag": "Event",      "urgent": False},
         {"label": "Scoutbook fully updated before year-end",  "tag": "Admin",      "urgent": False}],
    1:  [{"label": "New year kickoff — review calendar",       "tag": "Week 1",     "urgent": False},
         {"label": "Mid-year advancement check all dens",      "tag": "Advancement","urgent": False},
         {"label": "Summer camp — start promoting",            "tag": "Camp",       "urgent": True},
         {"label": "Blue & Gold planning begins",              "tag": "Event",      "urgent": False}],
    2:  [{"label": "Blue & Gold Banquet",                      "tag": "Big event",  "urgent": True},
         {"label": "Summer camp registration — push hard",     "tag": "Camp",       "urgent": True},
         {"label": "Winter outing",                            "tag": "Event",      "urgent": False},
         {"label": "Scout anniversary month — celebrate!",     "tag": "Recognition","urgent": False}],
    3:  [{"label": "Spring recruitment planning locked in",    "tag": "Recruitment","urgent": True},
         {"label": "Camp deadlines — follow up families",      "tag": "Camp",       "urgent": True},
         {"label": "Check AOL crossover timeline with troop",  "tag": "AOL",        "urgent": True},
         {"label": "Order advancement patches NOW",            "tag": "Urgent",     "urgent": True}],
    4:  [{"label": "AOL crossover ceremony — the big one",     "tag": "URGENT",     "urgent": True},
         {"label": "ALL rank advancements awarded",            "tag": "URGENT",     "urgent": True},
         {"label": "Confirm ALL den leaders returning in fall","tag": "Leadership", "urgent": True},
         {"label": "Fall recruitment plan finalized",          "tag": "Recruitment","urgent": False},
         {"label": "Thank-you notes — leaders & volunteers",   "tag": "Recognition","urgent": False}],
    5:  [{"label": "Summer program running",                   "tag": "Ongoing",    "urgent": False},
         {"label": "Day camp / resident camp",                 "tag": "Event",      "urgent": False},
         {"label": "Fall program outline drafted",             "tag": "Planning",   "urgent": False},
         {"label": "Informal DL check-ins",                    "tag": "Leadership", "urgent": False}],
    6:  [{"label": "Final summer activity",                    "tag": "Event",      "urgent": False},
         {"label": "Recruit follow-up before school starts",   "tag": "Recruitment","urgent": True},
         {"label": "Sept meeting planned & ready",             "tag": "Urgent",     "urgent": True},
         {"label": "Fall materials, space, calendar — all set","tag": "Admin",      "urgent": False}],
    7:  [{"label": "Fall kickoff prep done",                   "tag": "Admin",      "urgent": True},
         {"label": "Families re-engaged",                      "tag": "Outreach",   "urgent": False},
         {"label": "Den leaders confirmed and briefed",        "tag": "Leadership", "urgent": True},
         {"label": "Popcorn sale prep",                        "tag": "Fundraiser", "urgent": False}],
}


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
    den_number: Optional[str] = None
    scout_count: Optional[int] = None
    leader_name: Optional[str] = None
    leader_email: Optional[str] = None
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
    # Section 1.1 meeting name/theme
    last_meeting_name: Optional[str] = None
    # Section 5 — general notes (may have __sections__ prefix for optional sections)
    notes: Optional[str] = None
    # Extra custom sections — legacy, superseded by __sections__ prefix in notes
    extra_sections: Optional[str] = None
    # Section 6 — potential outings (JSON array)
    potential_outings: Optional[str] = None
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


class CouncilEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    external_id: str = Field(unique=True, index=True)  # council+title+date slug
    title: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    council: str                          # "JVC" | "Bucktail" | "Laurel Highlands"
    url: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    status: str = Field(default="new")   # "new" | "saved" | "dismissed" | "promoted"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ParsedDocument(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str
    event_name: Optional[str] = None
    event_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    registration_deadline: Optional[date] = None
    location: Optional[str] = None
    address: Optional[str] = None
    cost_scout: Optional[str] = None
    cost_adult: Optional[str] = None
    cost_notes: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    registration_url: Optional[str] = None
    age_requirements: Optional[str] = None
    what_to_bring: Optional[str] = None
    key_notes: Optional[str] = None      # JSON array stored as string
    family_summary: Optional[str] = None
    raw_text: Optional[str] = None
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    uploaded_by: Optional[str] = None
