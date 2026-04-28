# Cubmaster Dashboard — Pack 44

A self-hosted web app for Pack 44's Cubmaster and assistant Cubmasters. Tracks den status, monthly tasks, pack meeting agendas, monthly reports, and syncs events from the Band iCal feed.

---

## Stack

| Layer     | Tech                        |
|-----------|-----------------------------|
| Backend   | FastAPI + SQLModel (Python) |
| Database  | SQLite (file in Docker volume) |
| Frontend  | React + Vite                |
| Scheduler | APScheduler (built-in)      |
| Proxy     | Pangolin (your existing setup) |

---

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/frankenbadger/cubmaster-dashboard.git
cd cubmaster-dashboard
```

### 2. Configure environment

```bash
cp .env.example .env
nano .env
```

Required values to fill in:
- `SECRET_KEY` — generate with `openssl rand -hex 32`
- `ICAL_URL` — your Band group calendar export link (`.ics`)
- `SMTP_*` — any working SMTP credentials for email reminders

### 3. Build and start

```bash
docker compose up -d --build
```

App will be available at `http://localhost:3000` (frontend) and `http://localhost:8000` (API).

### 4. Create your first account

The first registered user automatically gets the `cubmaster` role.

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"yourname","email":"you@example.com","password":"yourpassword"}'
```

Subsequent registrations default to `assistant` role (you can promote them via the API or directly in the SQLite DB).

---

## Pangolin / Reverse Proxy Setup

Point your Pangolin proxy at `http://localhost:3000`. The frontend nginx config proxies `/api/` requests to the backend automatically, so you only need one upstream.

Recommended Pangolin config:
```
upstream: http://localhost:3000
health check: /health
```

---

## Getting Your Band iCal URL

1. Open Band on desktop
2. Go to your pack's group
3. Click **Calendar** → **More** (⋯) → **Export / Subscribe**
4. Copy the `.ics` link
5. Paste it into `.env` as `ICAL_URL`

The app polls this every 2 hours by default (configurable via `ICAL_POLL_INTERVAL`).

---

## Features

### Dashboard
- Pack meeting countdown (auto-calculated for last Tuesday of month)
- Monthly priority task list with urgent items surfaced first
- Den alert summary — shows dens flagged as needing attention
- Upcoming Band calendar events

### Dens
- Per-den status: Good / Check-in / Help needed
- Advancements current toggle
- Notes field per den
- Shared — all logged-in users see the same state

### Agenda
- Editable 7-part BSA pack meeting agenda
- Per-month — each month has its own agenda
- Print-ready
- Saves to database

### Report
- Monthly notes form matching the Cubmaster's Report format:
  - Last meeting summary, attendance, went well, needs improvement
  - Upcoming meeting program & agenda
  - Upcoming events
  - Per-den updates
  - General notes
- **Download as .docx** — generates a formatted Word document ready to share

### Calendar
- Displays upcoming events pulled from your Band iCal feed
- Grouped by month
- Auto-syncs every 2 hours

---

## Adding Assistant Cubmasters

Register their accounts the same way as yours:

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"assistantname","email":"them@example.com","password":"theirpassword"}'
```

They'll get `assistant` role by default. They can update dens and view everything. Only `cubmaster` role can manage users.

---

## Data

All data lives in a Docker volume (`cubmaster-data`) mapped to `/data/cubmaster.db`. To back it up:

```bash
docker compose exec backend sqlite3 /data/cubmaster.db .dump > backup.sql
```

---

## Updating

```bash
git pull
docker compose up -d --build
```

---

## Roadmap / Coming Soon

- [ ] SMS alerts via Twilio (optional, config in `.env`)
- [ ] Push notifications (browser)
- [ ] Advancement tracker (Scoutbook import)
- [ ] Annual calendar view
- [ ] User management UI (currently API only)

---

Built for Pack 44, Philipsburg PA. MIT License.
