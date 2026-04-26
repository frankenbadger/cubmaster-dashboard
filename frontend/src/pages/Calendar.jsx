import { useState, useEffect } from 'react'
import { api } from '../hooks/useAuth'
import { format } from 'date-fns'

export default function Calendar() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ summary: '', start_date: '', location: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
    api.get('/events/sync-status').then(r => setLastSync(r.data.last_sync)).catch(() => {})
  }, [])

  async function load() {
    try {
      const r = await api.get('/events/')
      setEvents(r.data)
    } catch {}
    setLoading(false)
  }

  async function addEvent() {
    if (!form.summary || !form.start_date) return
    setSaving(true)
    try {
      const { data } = await api.post('/events/', {
        summary: form.summary,
        start_date: form.start_date,
        location: form.location || null,
      })
      setEvents(evs => [...evs, data].sort((a, b) => new Date(a.start_date) - new Date(b.start_date)))
      setForm({ summary: '', start_date: '', location: '' })
      setShowForm(false)
    } finally { setSaving(false) }
  }

  async function deleteEvent(id) {
    await api.delete(`/events/${id}`)
    setEvents(evs => evs.filter(e => e.id !== id))
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)', padding: '2rem 0' }}>Loading events…</p>

  const grouped = events.reduce((acc, ev) => {
    const key = format(new Date(ev.start_date + 'T12:00:00'), 'MMMM yyyy')
    if (!acc[key]) acc[key] = []
    acc[key].push(ev)
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: lastSync ? '0.5rem' : '1rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Calendar</h1>
        <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => setShowForm(f => !f)}>
          {showForm ? 'Cancel' : '+ Add event'}
        </button>
      </div>

      {lastSync && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Band synced {format(new Date(lastSync), "MMM d 'at' h:mm a")}
        </p>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: '0.75rem' }}>
          <div className="card-title">Add manual event</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <input placeholder="Event name *" value={form.summary}
              onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input type="date" value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                style={{ padding: '7px 10px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }} />
              <input placeholder="Location (optional)" value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                style={{ padding: '7px 10px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }} />
            </div>
            <button className="btn btn-primary" onClick={addEvent} disabled={saving || !form.summary || !form.start_date}
              style={{ justifyContent: 'center' }}>
              {saving ? 'Saving…' : 'Add event'}
            </button>
          </div>
        </div>
      )}

      {!events.length && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>No upcoming events found.</p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Check that your Band iCal URL is in .env and the app has synced, or add an event above.
          </p>
        </div>
      )}

      {Object.entries(grouped).map(([monthLabel, evs]) => (
        <div key={monthLabel} className="card" style={{ marginBottom: '0.75rem' }}>
          <div className="card-title">{monthLabel}</div>
          {evs.map(ev => (
            <div key={ev.id} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '0.5px solid var(--border)', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 44, fontSize: 13, fontWeight: 500, color: 'var(--navy)', flexShrink: 0, paddingTop: 1 }}>
                {format(new Date(ev.start_date + 'T12:00:00'), 'MMM d')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{ev.summary}</div>
                {ev.location && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{ev.location}</div>}
                {ev.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{ev.description.slice(0, 120)}</div>}
              </div>
              {ev.source === 'manual' && (
                <button onClick={() => deleteEvent(ev.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                    fontSize: 20, lineHeight: 1, padding: '0 2px', flexShrink: 0, marginTop: -1 }}
                  title="Delete event">×</button>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
