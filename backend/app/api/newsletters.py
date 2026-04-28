from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, Response
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json
import os

from ..database import get_session, Newsletter, Den
from .auth import get_current_user, User

router = APIRouter()

PACK_NUMBER = os.getenv("PACK_NUMBER", "44")
PACK_LOCATION = os.getenv("PACK_LOCATION", "Philipsburg, PA")

MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
               "July", "August", "September", "October", "November", "December"]

DEN_ORDER = ["Lions", "Tigers", "Wolves", "Bears", "Webelos", "AOL"]

DEN_COLORS = {
    "Lions":   "#FFD700",
    "Tigers":  "#FF8C00",
    "Wolves":  "#6B8E23",
    "Bears":   "#8B4513",
    "Webelos": "#4682B4",
    "AOL":     "#2E4057",
}


class NewsletterUpsert(BaseModel):
    date_range_label: Optional[str] = None
    monthly_notes: Optional[str] = None
    events: Optional[str] = None
    fundraising_items: Optional[str] = None
    update_items: Optional[str] = None
    extra_calendar_events: Optional[str] = None
    band_url: Optional[str] = None


@router.get("/")
def list_newsletters(session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    return session.exec(
        select(Newsletter).order_by(Newsletter.year.desc(), Newsletter.month.desc())
    ).all()


@router.get("/{year}/{month}")
def get_newsletter(year: int, month: int, session: Session = Depends(get_session), _: User = Depends(get_current_user)):
    nl = session.exec(
        select(Newsletter).where(Newsletter.year == year, Newsletter.month == month)
    ).first()
    if not nl:
        return Newsletter(year=year, month=month, date_range_label="")
    return nl


@router.put("/{year}/{month}")
def upsert_newsletter(year: int, month: int, data: NewsletterUpsert,
                      session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    nl = session.exec(
        select(Newsletter).where(Newsletter.year == year, Newsletter.month == month)
    ).first()
    if not nl:
        nl = Newsletter(year=year, month=month, date_range_label="")
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(nl, field, value)
    nl.updated_by = current_user.username
    session.add(nl)
    session.commit()
    session.refresh(nl)
    return nl


@router.get("/{year}/{month}/preview", response_class=HTMLResponse)
def preview_newsletter(year: int, month: int, session: Session = Depends(get_session)):
    nl = session.exec(
        select(Newsletter).where(Newsletter.year == year, Newsletter.month == month)
    ).first()
    dens = session.exec(select(Den)).all()
    html = _render_newsletter(nl, dens, year, month)
    return HTMLResponse(content=html)


@router.get("/{year}/{month}/download")
def download_newsletter(year: int, month: int, session: Session = Depends(get_session),
                        _: User = Depends(get_current_user)):
    nl = session.exec(
        select(Newsletter).where(Newsletter.year == year, Newsletter.month == month)
    ).first()
    dens = session.exec(select(Den)).all()
    html = _render_newsletter(nl, dens, year, month)
    filename = f"Pack{PACK_NUMBER}_Newsletter_{MONTH_NAMES[month]}_{year}.html"
    return Response(
        content=html,
        media_type="text/html",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _safe_json(val, default):
    if not val:
        return default
    try:
        return json.loads(val)
    except Exception:
        return default


def _render_newsletter(nl: Optional[Newsletter], dens: list, year: int, month: int) -> str:
    events = _safe_json(nl.events if nl else None, [])
    fundraising = _safe_json(nl.fundraising_items if nl else None, [])
    updates = _safe_json(nl.update_items if nl else None, [])
    extra_cal = _safe_json(nl.extra_calendar_events if nl else None, [])
    monthly_notes = (nl.monthly_notes if nl else None) or ""
    date_range = (nl.date_range_label if nl else None) or f"{MONTH_NAMES[month][:3].upper()} {year}"
    band_url = (nl.band_url if nl else None) or ""

    # Build all calendar events (page 1 events + extra)
    all_cal_events = events + extra_cal

    # Events HTML for page 1
    events_html = ""
    for ev in events:
        d = ev.get("date", "")
        t = ev.get("time", "")
        n = ev.get("name", "")
        loc = ev.get("location", "")
        events_html += f"""
        <div class="event-item">
          <div class="event-datetime">{d}{" | " + t if t else ""}</div>
          <div class="event-name">{n}</div>
          {"<div class='event-location'>" + loc + "</div>" if loc else ""}
        </div>"""

    # Fundraising HTML
    fundraising_html = "".join(f"<li>{item}</li>" for item in fundraising if item)

    # Updates HTML
    updates_html = "".join(f"<li>{item}</li>" for item in updates if item)

    # Calendar HTML for page 2
    cal_html = ""
    for ev in all_cal_events:
        d = ev.get("date", "")
        t = ev.get("time", "")
        n = ev.get("name", "")
        loc = ev.get("location", "")
        cal_html += f"""
        <div class="event-item">
          <div class="event-datetime">{d}{" | " + t if t else ""}</div>
          <div class="event-name">{n}</div>
          {"<div class='event-location'>" + loc + "</div>" if loc else ""}
        </div>"""

    # Den leaders HTML
    den_map = {d.name: d for d in dens}
    dens_html = ""
    for den_name in DEN_ORDER:
        den = den_map.get(den_name)
        color = DEN_COLORS.get(den_name, "#888")
        leader = (den.leader_name if den else None) or "TBD"
        asst = (den.asst_leader_name if den else None) or ""
        dens_html += f"""
        <div class="den-item">
          <span class="den-badge" style="background:{color};">{den_name}</span>
          <div class="den-leaders">
            <div>{leader}</div>
            {"<div class='den-asst'>" + asst + "</div>" if asst else ""}
          </div>
        </div>"""

    # QR code / Band URL block
    if band_url:
        band_html = f"""
        <div id="qrcode-container"></div>
        <div class="band-url">{band_url}</div>
        <script>
          if (typeof QRCode !== 'undefined') {{
            new QRCode(document.getElementById('qrcode-container'), {{
              text: '{band_url}',
              width: 100, height: 100,
              colorDark: '#003087', colorLight: '#ffffff'
            }});
          }}
        </script>"""
    else:
        band_html = "<div class='band-url'>Band URL not set</div>"

    month_name = MONTH_NAMES[month]

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pack {PACK_NUMBER} Newsletter – {month_name} {year}</title>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Open Sans', sans-serif; background: #f0f0f0; color: #1a1a1a; font-size: 13px; }}
  h1, h2, h3, .section-heading {{ font-family: 'Oswald', sans-serif; }}

  .page {{
    width: 8.5in;
    min-height: 11in;
    margin: 0 auto 0.5in;
    background: white;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }}

  /* ── Header ── */
  .header {{
    background: #003087;
    display: flex;
    align-items: stretch;
    min-height: 100px;
  }}
  .header-logo {{
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px 24px;
    flex-shrink: 0;
  }}
  .cub-diamond {{
    width: 70px;
    height: 70px;
    background: #FDB827;
    transform: rotate(45deg);
    display: flex;
    align-items: center;
    justify-content: center;
  }}
  .cub-diamond-text {{
    transform: rotate(-45deg);
    font-family: 'Oswald', sans-serif;
    font-size: 9px;
    font-weight: 700;
    color: #003087;
    text-align: center;
    line-height: 1.1;
  }}
  .header-title-block {{
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-end;
    padding: 12px 24px 12px 12px;
  }}
  .header-date-range {{
    font-family: 'Oswald', sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: white;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 4px;
  }}
  .header-pack-name {{
    background: white;
    color: #1a1a1a;
    font-family: 'Oswald', sans-serif;
    font-size: 36px;
    font-weight: 700;
    padding: 4px 16px;
    letter-spacing: 0.02em;
    line-height: 1;
  }}

  /* ── Monthly Notes ── */
  .monthly-notes {{
    background: white;
    margin: 12px;
    border-radius: 8px;
    padding: 14px 18px;
    border: 1px solid #e0e0e0;
  }}
  .section-heading {{
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #1a1a1a;
    margin-bottom: 8px;
  }}
  .monthly-notes p {{
    font-size: 12px;
    line-height: 1.6;
    color: #333;
  }}

  /* ── Two-column bottom ── */
  .two-col {{
    background: #003087;
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 10px 12px 14px;
    min-height: 0;
  }}
  .col-panel {{
    background: white;
    border-radius: 8px;
    padding: 12px 14px;
  }}
  .right-stack {{
    display: flex;
    flex-direction: column;
    gap: 10px;
  }}

  /* ── Events ── */
  .event-item {{ margin-bottom: 8px; padding-bottom: 8px; border-bottom: 0.5px solid #eee; }}
  .event-item:last-child {{ border-bottom: none; margin-bottom: 0; }}
  .event-datetime {{ font-family: 'Oswald', sans-serif; font-size: 12px; font-weight: 700; color: #FDB827; }}
  .event-name {{ font-family: 'Oswald', sans-serif; font-size: 13px; font-weight: 700; color: #1a1a1a; }}
  .event-location {{ font-size: 11px; color: #777; font-style: italic; }}

  /* ── Lists ── */
  .bullet-list {{ list-style: none; padding: 0; }}
  .bullet-list li {{ font-size: 11.5px; padding: 2px 0; padding-left: 12px; position: relative; color: #333; }}
  .bullet-list li::before {{ content: "•"; position: absolute; left: 0; color: #FDB827; font-weight: 700; }}

  /* ── Den leaders ── */
  .den-item {{ display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }}
  .den-badge {{
    font-family: 'Oswald', sans-serif;
    font-size: 9px;
    font-weight: 700;
    color: white;
    padding: 3px 6px;
    border-radius: 4px;
    flex-shrink: 0;
    min-width: 52px;
    text-align: center;
    text-transform: uppercase;
  }}
  .den-leaders {{ font-size: 11.5px; }}
  .den-asst {{ font-size: 10.5px; color: #777; }}

  /* ── Page 2 bottom ── */
  .page2-bottom {{
    background: #003087;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 10px 12px;
  }}
  .band-box {{
    background: white;
    border-radius: 8px;
    padding: 12px 14px;
    text-align: center;
  }}
  .band-box .section-heading {{ margin-bottom: 8px; }}
  #qrcode-container {{ display: flex; justify-content: center; margin: 8px 0; }}
  .band-url {{ font-size: 10px; color: #555; word-break: break-all; margin-top: 4px; }}

  /* ── Scout Oath footer ── */
  .oath-footer {{
    background: #FDB827;
    padding: 10px 20px;
    text-align: center;
  }}
  .oath-footer p {{
    font-family: 'Oswald', sans-serif;
    font-size: 11px;
    font-weight: 700;
    color: #003087;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }}

  /* ── Print ── */
  @media print {{
    body {{ background: white; }}
    .page {{ margin: 0; width: 100%; min-height: 0; page-break-after: always; }}
    .page:last-child {{ page-break-after: auto; }}
    @page {{ size: letter; margin: 0; }}
  }}
</style>
</head>
<body>

<!-- ═══════════════════ PAGE 1 ═══════════════════ -->
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-logo">
      <div class="cub-diamond">
        <div class="cub-diamond-text">CUB<br>SCOUTS</div>
      </div>
    </div>
    <div class="header-title-block">
      <div class="header-date-range">{date_range}</div>
      <div class="header-pack-name">PACK {PACK_NUMBER} NEWS</div>
    </div>
  </div>

  <!-- Monthly Notes -->
  <div class="monthly-notes">
    <div class="section-heading">Monthly Notes</div>
    <p>{monthly_notes or "No notes this month."}</p>
  </div>

  <!-- Two-column bottom -->
  <div class="two-col">
    <!-- Left: Upcoming Events -->
    <div class="col-panel">
      <div class="section-heading">Upcoming Events</div>
      {events_html if events_html else '<p style="font-size:11px;color:#999">No events listed.</p>'}
    </div>

    <!-- Right: Fundraising + Updates stacked -->
    <div class="right-stack">
      <div class="col-panel">
        <div class="section-heading">Fundraising</div>
        <ul class="bullet-list">
          {fundraising_html if fundraising_html else '<li>No fundraising items.</li>'}
        </ul>
      </div>
      <div class="col-panel">
        <div class="section-heading">Important Updates:</div>
        <ul class="bullet-list">
          {updates_html if updates_html else '<li>No updates.</li>'}
        </ul>
      </div>
    </div>
  </div>

</div>

<!-- ═══════════════════ PAGE 2 ═══════════════════ -->
<div class="page">

  <!-- Two-column: Calendar + Den Leaders -->
  <div class="two-col" style="flex:1;">
    <!-- Left: Calendar -->
    <div class="col-panel">
      <div class="section-heading">{month_name} Calendar</div>
      {cal_html if cal_html else '<p style="font-size:11px;color:#999">No calendar events.</p>'}
    </div>

    <!-- Right: Den Leaders -->
    <div class="col-panel">
      <div class="section-heading">Den Leaders</div>
      {dens_html}
    </div>
  </div>

  <!-- Bottom: Band + empty right -->
  <div class="page2-bottom">
    <div class="band-box">
      <div class="section-heading">Stay Up to Date by Joining Our Band!</div>
      {band_html}
    </div>
    <div style="background:white;border-radius:8px;padding:12px 14px;">
      <div class="section-heading">Pack {PACK_NUMBER}</div>
      <p style="font-size:11px;color:#555;margin-top:4px;">{PACK_LOCATION}</p>
    </div>
  </div>

  <!-- Scout Oath Footer -->
  <div class="oath-footer">
    <p>On My Honor I Will Do My Best · To Do My Duty to God and My Country · And to Obey the Scout Law</p>
  </div>

</div>

</body>
</html>"""
