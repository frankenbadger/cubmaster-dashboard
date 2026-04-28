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
    "Lions":   "#E8A000",
    "Tigers":  "#D05A00",
    "Wolves":  "#4A7A1E",
    "Bears":   "#7B3A10",
    "Webelos": "#1A5C9C",
    "AOL":     "#1A2D4A",
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
    events      = _safe_json(nl.events if nl else None, [])
    fundraising = _safe_json(nl.fundraising_items if nl else None, [])
    updates     = _safe_json(nl.update_items if nl else None, [])
    extra_cal   = _safe_json(nl.extra_calendar_events if nl else None, [])
    monthly_notes = (nl.monthly_notes if nl else None) or ""
    date_range    = (nl.date_range_label if nl else None) or f"{MONTH_NAMES[month][:3].upper()} {year}"
    band_url      = (nl.band_url if nl else None) or ""

    all_cal_events = events + extra_cal

    # ── Event card: left "date pill", right name+location ──────────────────────
    def event_card(ev):
        d   = ev.get("date", "")
        t   = ev.get("time", "")
        n   = ev.get("name", "") or "&nbsp;"
        loc = ev.get("location", "")
        time_html = f'<div class="ec-time">{t}</div>' if t else ""
        loc_html  = f'<div class="ec-loc">{loc}</div>' if loc else ""
        return f"""<div class="ec">
          <div class="ec-date">{d}</div>
          <div class="ec-body">
            <div class="ec-name">{n}</div>
            {time_html}{loc_html}
          </div>
        </div>"""

    events_html  = "".join(event_card(ev) for ev in events)
    cal_html     = "".join(event_card(ev) for ev in all_cal_events)

    # ── Bullet lists ───────────────────────────────────────────────────────────
    fundraising_html = "".join(f'<li>{item}</li>' for item in fundraising if item)
    updates_html     = "".join(f'<li>{item}</li>' for item in updates if item)

    # ── Den leaders ───────────────────────────────────────────────────────────
    den_map  = {d.name: d for d in dens}
    dens_html = ""
    for den_name in DEN_ORDER:
        den    = den_map.get(den_name)
        color  = DEN_COLORS.get(den_name, "#555")
        leader = (den.leader_name if den else None) or "TBD"
        asst   = (den.asst_leader_name if den else None) or ""
        initial = den_name[0]
        asst_html = f'<div class="dl-asst">Asst: {asst}</div>' if asst else ""
        dens_html += f"""<div class="dl-row">
          <div class="dl-circle" style="background:{color};">{initial}</div>
          <div class="dl-info">
            <div class="dl-den">{den_name}</div>
            <div class="dl-name">{leader}</div>
            {asst_html}
          </div>
        </div>"""

    # ── QR / Band block ───────────────────────────────────────────────────────
    if band_url:
        band_html = f"""<div id="qrcode-wrap"><div id="qrcode"></div></div>
        <div class="band-url">{band_url}</div>
        <script>
          (function(){{
            if(typeof QRCode==='undefined')return;
            new QRCode(document.getElementById('qrcode'),{{
              text:'{band_url}',width:96,height:96,
              colorDark:'#003087',colorLight:'#fff'
            }});
          }})();
        </script>"""
    else:
        band_html = '<div class="band-url" style="color:#aaa;font-style:italic;">Band URL not set</div>'

    month_name = MONTH_NAMES[month]

    # ── Section heading bar helper (rendered inline) ───────────────────────────
    # Used as: {sh("UPCOMING EVENTS")}
    def sh(text, gold=False):
        bg   = "#FDB827" if gold else "#003087"
        fg   = "#003087" if gold else "#ffffff"
        return (f'<div class="sh" style="background:{bg};color:{fg};">'
                f'<span class="sh-accent" style="background:{"#003087" if gold else "#FDB827"};"></span>'
                f'{text}</div>')

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Pack {PACK_NUMBER} Newsletter — {month_name} {year}</title>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Open+Sans:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<style>
/* ── Reset ── */
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0;}}

/* ── Base ── */
body{{
  font-family:'Open Sans',sans-serif;
  background:#d8dde6;
  color:#1a1a1a;
  font-size:13px;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}}

/* ── Page shell ── */
.page{{
  width:8.5in;
  min-height:11in;
  margin:0.4in auto 0.6in;
  background:#fff;
  display:flex;
  flex-direction:column;
  box-shadow:0 4px 24px rgba(0,0,0,.18);
  overflow:hidden;
}}

/* ════════════════════════════
   HEADER
════════════════════════════ */
.header{{
  background:#003087;
  display:flex;
  align-items:stretch;
  min-height:130px;
  position:relative;
}}
/* gold bottom stripe */
.header::after{{
  content:'';
  position:absolute;
  bottom:0;left:0;right:0;
  height:7px;
  background:#FDB827;
}}

/* Logo block */
.header-logo{{
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px 28px 27px;
  flex-shrink:0;
}}
.diamond-wrap{{
  position:relative;
  width:80px;height:80px;
}}
.diamond{{
  width:80px;height:80px;
  background:#FDB827;
  transform:rotate(45deg);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 2px 8px rgba(0,0,0,.25);
}}
.diamond-inner{{
  transform:rotate(-45deg);
  font-family:'Oswald',sans-serif;
  font-size:10px;font-weight:700;
  color:#003087;text-align:center;
  line-height:1.15;letter-spacing:.05em;
}}

/* Title block */
.header-right{{
  flex:1;
  display:flex;
  flex-direction:column;
  justify-content:center;
  align-items:flex-end;
  padding:16px 28px 24px 12px;
  gap:6px;
}}
.header-tagline{{
  font-family:'Oswald',sans-serif;
  font-size:12px;font-weight:600;
  color:#FDB827;
  letter-spacing:.18em;
  text-transform:uppercase;
}}
.header-title{{
  font-family:'Oswald',sans-serif;
  font-size:52px;font-weight:700;
  color:#fff;
  line-height:1;
  letter-spacing:.01em;
  text-transform:uppercase;
}}
.header-title span{{color:#FDB827;}}
.header-date{{
  font-family:'Oswald',sans-serif;
  font-size:14px;font-weight:600;
  color:rgba(255,255,255,.75);
  letter-spacing:.12em;
  text-transform:uppercase;
  margin-top:2px;
}}

/* ════════════════════════════
   SECTION HEADING BAR
════════════════════════════ */
.sh{{
  display:flex;
  align-items:center;
  gap:0;
  font-family:'Oswald',sans-serif;
  font-size:11.5px;font-weight:700;
  letter-spacing:.1em;
  text-transform:uppercase;
  padding:6px 12px 6px 0;
  border-radius:4px 4px 0 0;
  margin-bottom:10px;
}}
.sh-accent{{
  width:5px;
  align-self:stretch;
  border-radius:4px 0 0 0;
  margin-right:10px;
  flex-shrink:0;
}}

/* ════════════════════════════
   MONTHLY NOTES BAND
════════════════════════════ */
.notes-band{{
  background:#EEF2FF;
  border-left:5px solid #FDB827;
  margin:14px 14px 0;
  border-radius:0 6px 6px 0;
  padding:14px 18px 16px;
}}
.notes-text{{
  font-size:12.5px;
  line-height:1.7;
  color:#222;
  white-space:pre-wrap;
}}

/* ════════════════════════════
   TWO-COLUMN AREA
════════════════════════════ */
.cols{{
  background:#003087;
  flex:1;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
  padding:12px 14px 16px;
}}
.panel{{
  background:#fff;
  border-radius:6px;
  overflow:hidden;
  display:flex;
  flex-direction:column;
}}
.panel-body{{
  padding:10px 14px 14px;
  flex:1;
}}
.right-stack{{
  display:flex;
  flex-direction:column;
  gap:12px;
}}

/* ════════════════════════════
   EVENT CARDS
════════════════════════════ */
.ec{{
  display:flex;
  gap:10px;
  padding:7px 0;
  border-bottom:1px solid #f0f0f0;
  align-items:flex-start;
}}
.ec:last-child{{border-bottom:none;}}
.ec-date{{
  flex-shrink:0;
  min-width:52px;
  background:#003087;
  color:#FDB827;
  font-family:'Oswald',sans-serif;
  font-size:10.5px;font-weight:700;
  text-align:center;
  padding:4px 6px;
  border-radius:4px;
  letter-spacing:.04em;
  line-height:1.3;
  text-transform:uppercase;
}}
.ec-body{{flex:1;min-width:0;}}
.ec-name{{
  font-family:'Oswald',sans-serif;
  font-size:13px;font-weight:700;
  color:#1a1a1a;line-height:1.2;
}}
.ec-time{{font-size:11px;color:#555;margin-top:2px;}}
.ec-loc{{font-size:11px;color:#888;font-style:italic;}}

/* ════════════════════════════
   BULLET LISTS
════════════════════════════ */
.blist{{list-style:none;padding:0;margin:0;}}
.blist li{{
  font-size:12px;color:#333;
  padding:4px 0 4px 18px;
  position:relative;
  border-bottom:1px solid #f5f5f5;
  line-height:1.4;
}}
.blist li:last-child{{border-bottom:none;}}
.blist li::before{{
  content:'▸';
  position:absolute;left:2px;top:4px;
  color:#FDB827;font-size:11px;font-weight:700;
}}

/* ════════════════════════════
   DEN LEADERS
════════════════════════════ */
.dl-row{{
  display:flex;align-items:center;gap:10px;
  padding:6px 0;border-bottom:1px solid #f0f0f0;
}}
.dl-row:last-child{{border-bottom:none;}}
.dl-circle{{
  width:38px;height:38px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-family:'Oswald',sans-serif;
  font-size:16px;font-weight:700;color:#fff;
  flex-shrink:0;
  box-shadow:0 1px 4px rgba(0,0,0,.2);
}}
.dl-info{{flex:1;min-width:0;}}
.dl-den{{
  font-family:'Oswald',sans-serif;
  font-size:9px;font-weight:700;
  text-transform:uppercase;letter-spacing:.1em;
  color:#888;
}}
.dl-name{{font-size:12.5px;font-weight:600;color:#1a1a1a;line-height:1.2;}}
.dl-asst{{font-size:10.5px;color:#777;}}

/* ════════════════════════════
   PAGE 2 BOTTOM BAND
════════════════════════════ */
.p2-bottom{{
  background:#003087;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
  padding:12px 14px;
}}
.band-box{{
  background:#fff;
  border-radius:6px;
  overflow:hidden;
  text-align:center;
}}
.band-body{{padding:12px 14px 14px;}}
.band-tagline{{
  font-size:12px;font-weight:600;
  color:#003087;margin-bottom:8px;
  line-height:1.3;
}}
#qrcode-wrap{{display:flex;justify-content:center;margin:8px 0 6px;}}
.band-url{{font-size:9.5px;color:#666;word-break:break-all;}}

.info-box{{
  background:#fff;
  border-radius:6px;
  overflow:hidden;
  display:flex;flex-direction:column;
}}
.info-box-body{{padding:12px 14px;flex:1;}}
.info-pack{{
  font-family:'Oswald',sans-serif;
  font-size:22px;font-weight:700;color:#003087;
  line-height:1;
}}
.info-loc{{font-size:11px;color:#666;margin-top:4px;}}
.info-tagline{{
  font-size:11px;color:#888;
  margin-top:8px;line-height:1.4;
  font-style:italic;
}}

/* ════════════════════════════
   SCOUT OATH FOOTER
════════════════════════════ */
.oath{{
  background:#FDB827;
  padding:9px 20px;
  text-align:center;
}}
.oath p{{
  font-family:'Oswald',sans-serif;
  font-size:10.5px;font-weight:700;
  color:#003087;
  text-transform:uppercase;
  letter-spacing:.07em;
}}

/* ════════════════════════════
   PRINT
════════════════════════════ */
@media print{{
  body{{background:#fff;}}
  .page{{
    margin:0;width:100%;min-height:0;
    box-shadow:none;
    page-break-after:always;
  }}
  .page:last-child{{page-break-after:auto;}}
  @page{{size:letter;margin:0;}}
}}
</style>
</head>
<body>

<!-- ══════════════════════════════════════
     PAGE 1
══════════════════════════════════════ -->
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-logo">
      <div class="diamond-wrap">
        <div class="diamond">
          <div class="diamond-inner">CUB<br>SCOUTS</div>
        </div>
      </div>
    </div>
    <div class="header-right">
      <div class="header-tagline">Pack {PACK_NUMBER} &nbsp;·&nbsp; {PACK_LOCATION}</div>
      <div class="header-title">PACK <span>{PACK_NUMBER}</span> NEWS</div>
      <div class="header-date">{date_range}</div>
    </div>
  </div>

  <!-- Cubmaster Notes -->
  <div class="notes-band">
    {sh("Cubmaster's Corner")}
    <div class="notes-text">{monthly_notes or "No notes this month."}</div>
  </div>

  <!-- Two columns -->
  <div class="cols">

    <!-- LEFT: Upcoming Events -->
    <div class="panel">
      {sh("Upcoming Events")}
      <div class="panel-body">
        {events_html if events_html else '<p style="font-size:11px;color:#bbb;font-style:italic;">No events listed yet.</p>'}
      </div>
    </div>

    <!-- RIGHT: Fundraising + Updates stacked -->
    <div class="right-stack">
      <div class="panel">
        {sh("Fundraising")}
        <div class="panel-body">
          <ul class="blist">
            {fundraising_html if fundraising_html else '<li style="color:#bbb;font-style:italic;">Nothing to report.</li>'}
          </ul>
        </div>
      </div>
      <div class="panel">
        {sh("Important Updates", gold=True)}
        <div class="panel-body">
          <ul class="blist">
            {updates_html if updates_html else '<li style="color:#bbb;font-style:italic;">No updates.</li>'}
          </ul>
        </div>
      </div>
    </div>

  </div>

</div><!-- /page 1 -->

<!-- ══════════════════════════════════════
     PAGE 2
══════════════════════════════════════ -->
<div class="page">

  <!-- Two columns: Calendar + Den Leaders -->
  <div class="cols" style="flex:1;">

    <!-- LEFT: Calendar -->
    <div class="panel">
      {sh(f"{month_name} Calendar")}
      <div class="panel-body">
        {cal_html if cal_html else '<p style="font-size:11px;color:#bbb;font-style:italic;">No events on calendar.</p>'}
      </div>
    </div>

    <!-- RIGHT: Den Leaders -->
    <div class="panel">
      {sh("Den Leaders")}
      <div class="panel-body">
        {dens_html}
      </div>
    </div>

  </div>

  <!-- Bottom band -->
  <div class="p2-bottom">

    <div class="band-box">
      {sh("Stay Connected", gold=True)}
      <div class="band-body">
        <div class="band-tagline">Join our Band group to stay up to date!</div>
        {band_html}
      </div>
    </div>

    <div class="info-box">
      {sh("About Our Pack")}
      <div class="info-box-body">
        <div class="info-pack">Pack {PACK_NUMBER}</div>
        <div class="info-loc">{PACK_LOCATION}</div>
        <div class="info-tagline">
          Cub Scouts is a program of the Boy Scouts of America
          for youth in kindergarten through fifth grade.
          We'd love to have your family join us!
        </div>
      </div>
    </div>

  </div>

  <!-- Scout Oath Footer -->
  <div class="oath">
    <p>On My Honor I Will Do My Best &nbsp;·&nbsp; To Do My Duty to God and My Country &nbsp;·&nbsp; And to Obey the Scout Law</p>
  </div>

</div><!-- /page 2 -->

</body>
</html>"""
