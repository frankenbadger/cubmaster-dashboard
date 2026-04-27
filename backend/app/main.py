from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import init_db
from .scheduler import start_scheduler
from .api import auth, users, dens, tasks, events, reports, agenda, council_events, documents

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_scheduler()
    yield

app = FastAPI(
    title="Cubmaster Dashboard",
    description="Pack 44 Cubmaster management app",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production via env var
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,           prefix="/api/auth",           tags=["auth"])
app.include_router(users.router,          prefix="/api/users",          tags=["users"])
app.include_router(dens.router,           prefix="/api/dens",           tags=["dens"])
app.include_router(tasks.router,          prefix="/api/tasks",          tags=["tasks"])
app.include_router(events.router,         prefix="/api/events",         tags=["events"])
app.include_router(reports.router,        prefix="/api/reports",        tags=["reports"])
app.include_router(agenda.router,         prefix="/api/agenda",         tags=["agenda"])
app.include_router(council_events.router, prefix="/api/council-events", tags=["council-events"])
app.include_router(documents.router,      prefix="/api/documents",      tags=["documents"])

@app.get("/health")
def health():
    return {"status": "ok"}
