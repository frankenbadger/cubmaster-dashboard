from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
import json
import io
import os

from ..database import get_session, MonthlyReport, Den
from .auth import get_current_user, User

router = APIRouter()

PACK_NUMBER = os.getenv("PACK_NUMBER", "44")
PACK_LOCATION = os.getenv("PACK_LOCATION", "Philipsburg, PA")


class ReportUpsert(BaseModel):
    year: int
    month: int
    last_meeting_summary: Optional[str] = None
    last_meeting_attendance: Optional[str] = None
    last_meeting_went_well: Optional[str] = None
    last_meeting_needs_improvement: Optional[str] = None
    upcoming_meeting_program: Optional[str] = None
    upcoming_meeting_agenda: Optional[str] = None
    upcoming_events: Optional[str] = None
    den_updates: Optional[str] = None   # JSON string
    notes: Optional[str] = None


MONTH_NAMES = ["January","February","March","April","May","June",
               "July","August","September","October","November","December"]


@router.get("/")
def list_reports(session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    reports = session.exec(select(MonthlyReport).order_by(MonthlyReport.year.desc(), MonthlyReport.month.desc())).all()
    return reports


@router.get("/{year}/{month}")
def get_report(year: int, month: int, session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    report = session.exec(select(MonthlyReport).where(MonthlyReport.year == year, MonthlyReport.month == month)).first()
    if not report:
        # Return empty template
        return MonthlyReport(year=year, month=month)
    return report


@router.put("/{year}/{month}")
def upsert_report(year: int, month: int, data: ReportUpsert, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    report = session.exec(select(MonthlyReport).where(MonthlyReport.year == year, MonthlyReport.month == month)).first()
    if not report:
        report = MonthlyReport(year=year, month=month)
    for field, value in data.model_dump(exclude={"year", "month"}).items():
        if value is not None:
            setattr(report, field, value)
    report.updated_at = datetime.utcnow()
    report.updated_by = current_user.username
    session.add(report)
    session.commit()
    session.refresh(report)
    return report


@router.get("/{year}/{month}/download")
def download_report(year: int, month: int, session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    """Generate and stream a .docx cubmaster report."""
    report = session.exec(select(MonthlyReport).where(MonthlyReport.year == year, MonthlyReport.month == month)).first()
    dens = session.exec(select(Den)).all()

    try:
        from docx import Document
        from docx.shared import Pt, RGBColor
        from docx.enum.text import WD_ALIGN_PARAGRAPH
    except ImportError:
        raise HTTPException(status_code=500, detail="python-docx not installed")

    doc = Document()

    # Title
    title = doc.add_heading(f"Cubmaster's Report", 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub = doc.add_paragraph(f"Pack {PACK_NUMBER} · {PACK_LOCATION} · {MONTH_NAMES[month]} {year}")
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_heading("1. Monthly Review", 1)
    doc.add_heading("1.1 Last Pack Meeting", 2)
    if report:
        _add_field(doc, "Summary", report.last_meeting_summary)
        _add_field(doc, "Attendance", report.last_meeting_attendance)
        _add_bullets(doc, "Went Well", report.last_meeting_went_well)
        _add_bullets(doc, "Needs Improvement", report.last_meeting_needs_improvement)

    doc.add_heading("2. Upcoming Pack Meeting", 1)
    if report:
        _add_field(doc, "Program", report.upcoming_meeting_program)
        _add_field(doc, "Agenda", report.upcoming_meeting_agenda)

    doc.add_heading("3. Upcoming Events", 1)
    if report and report.upcoming_events:
        _add_bullets(doc, None, report.upcoming_events)

    doc.add_heading("4. Den Updates", 1)
    den_updates = {}
    if report and report.den_updates:
        try:
            den_updates = json.loads(report.den_updates)
        except Exception:
            pass
    for den in dens:
        doc.add_heading(f"{den.name}", 3)
        update_text = den_updates.get(den.name, "")
        if den.status:
            status_map = {"good": "On track", "checkin": "Needs check-in", "help": "Help needed"}
            p = doc.add_paragraph(f"Status: {status_map.get(den.status, den.status)}")
        if den.notes:
            doc.add_paragraph(f"Notes: {den.notes}")
        if update_text:
            _add_bullets(doc, None, update_text)

    doc.add_heading("5. Notes", 1)
    if report and report.notes:
        doc.add_paragraph(report.notes)
    else:
        doc.add_paragraph("")

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)

    filename = f"Pack{PACK_NUMBER}_Cubmaster_Report_{MONTH_NAMES[month]}_{year}.docx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


def _add_field(doc, label, value):
    p = doc.add_paragraph()
    p.add_run(f"{label}: ").bold = True
    p.add_run(value or "")


def _add_bullets(doc, label, value):
    if label:
        doc.add_paragraph(label + ":").runs[0].bold = True
    if not value:
        return
    for line in value.split("\n"):
        line = line.strip().lstrip("-•").strip()
        if line:
            doc.add_paragraph(line, style="List Bullet")
