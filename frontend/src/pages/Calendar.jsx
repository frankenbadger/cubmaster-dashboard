import { useState, useEffect } from 'react'
import { api } from '../hooks/useAuth'
import { format } from 'date-fns'

export default function Calendar() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/events/').then(r => { setEvents(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <p style={{ color: 'var(--text-secondary)', padding: '2rem 0' }}>Loading events…</p>

  if (!events.length) return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: '1rem' }}>Calendar</h1>
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>No upcoming events found.</p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Make sure your Band iCal URL is set in <code>.env</code> and the app has synced.</p>
      </div>
    </div>
  )

  // Group by month
  const grouped = events.reduce((acc, ev) => {
    const key = format(new Date(ev.start_date), 'MMMM yyyy')
    if (!acc[key]) acc[key] = []
    acc[key].push(ev)
    return acc
  }, {})

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: '1rem' }}>Calendar</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Synced from your Band iCal feed. Updates every 2 hours.
      </p>
      {Object.entries(grouped).map(([monthLabel, evs]) => (
        <div key={monthLabel} className="card" style={{ marginBottom: '0.75rem' }}>
          <div className="card-title">{monthLabel}</div>
          {evs.map(ev => (
            <div key={ev.id} style={{ display: 'flex', gap: 14, padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ minWidth: 40, fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>
                {format(new Date(ev.start_date), 'MMM d')}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{ev.summary}</div>
                {ev.location && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{ev.location}</div>}
                {ev.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{ev.description.slice(0, 120)}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
