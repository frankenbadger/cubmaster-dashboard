import { useState, useEffect } from 'react'
import { api } from '../hooks/useAuth'
import { format } from 'date-fns'

const COUNCIL_COLORS = {
  'JVC':              { bg: '#003087', text: '#fff' },
  'Bucktail':         { bg: '#2E7D32', text: '#fff' },
  'Laurel Highlands': { bg: '#C8102E', text: '#fff' },
}

const FILTERS = ['All', 'JVC', 'Bucktail', 'Laurel Highlands', 'Saved']

function formatDateRange(start, end) {
  if (!start) return 'Date TBD'
  const s = new Date(start + 'T12:00:00')
  if (!end) return format(s, 'MMMM d, yyyy')
  const e = new Date(end + 'T12:00:00')
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${format(s, 'MMMM d')} – ${format(e, 'd, yyyy')}`
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${format(s, 'MMMM d')} – ${format(e, 'MMMM d, yyyy')}`
  }
  return `${format(s, 'MMM d, yyyy')} – ${format(e, 'MMM d, yyyy')}`
}

export default function CouncilRadar() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [toast, setToast] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const r = await api.get('/council-events/')
      setEvents(r.data)
    } catch {}
    setLoading(false)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function setStatus(ev, status) {
    // Optimistic update
    setEvents(es => es.map(e => e.id === ev.id ? { ...e, status } : e))
    try {
      await api.patch(`/council-events/${ev.id}`, { status })
    } catch {
      // Revert on failure
      setEvents(es => es.map(e => e.id === ev.id ? ev : e))
    }
  }

  async function promote(ev) {
    try {
      const { data } = await api.post(`/council-events/${ev.id}/promote`)
      setEvents(es => es.map(e => e.id === ev.id ? data : e))
      showToast('Added to your pack calendar!')
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Could not add to calendar'
      showToast(msg)
    }
  }

  const visible = events.filter(ev => {
    if (filter === 'Saved') return ev.status === 'saved'
    if (filter === 'All') return true
    return ev.council === filter
  })

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Council Radar</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Events from nearby councils worth looking into
      </p>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '5px 12px', borderRadius: 99, fontSize: 13, fontWeight: 500,
              border: '0.5px solid var(--border)', cursor: 'pointer',
              background: filter === f ? 'var(--navy)' : 'var(--card-bg)',
              color: filter === f ? '#fff' : 'var(--text)' }}>
            {f}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => (
            <div key={i} className="card" style={{ height: 100, opacity: 0.4, background: 'var(--border)' }} />
          ))}
        </div>
      )}

      {!loading && visible.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          {filter === 'Saved'
            ? 'No saved events yet. Star an event to save it here.'
            : `No events found for ${filter}. The daily scrape runs at 6am — check back tomorrow.`}
        </div>
      )}

      {visible.map(ev => {
        const colors = COUNCIL_COLORS[ev.council] || { bg: '#555', text: '#fff' }
        const isSaved = ev.status === 'saved'
        const isPromoted = ev.status === 'promoted'

        return (
          <div key={ev.id} className="card" style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                    background: colors.bg, color: colors.text, whiteSpace: 'nowrap' }}>
                    {ev.council}
                  </span>
                  {isPromoted && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                      background: '#EAF3DE', color: '#2E7D32', border: '0.5px solid #C0DD97' }}>
                      Added to calendar ✓
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{ev.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {formatDateRange(ev.start_date, ev.end_date)}
                </div>
                {ev.location && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {ev.location}
                  </div>
                )}
                {ev.url && (
                  <a href={ev.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: 'var(--navy)', marginTop: 4, display: 'inline-block' }}>
                    View details ↗
                  </a>
                )}
              </div>
            </div>

            {!isPromoted && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setStatus(ev, isSaved ? 'new' : 'saved')}
                  style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6,
                    border: `0.5px solid ${isSaved ? '#FDB827' : 'var(--border)'}`,
                    background: isSaved ? '#FFF8E1' : 'var(--card-bg)',
                    color: isSaved ? '#B8860B' : 'var(--text)', cursor: 'pointer', fontWeight: isSaved ? 600 : 400 }}>
                  {isSaved ? '★ Saved' : '☆ Save'}
                </button>
                <button
                  onClick={() => promote(ev)}
                  className="btn btn-primary"
                  style={{ fontSize: 12, padding: '5px 12px' }}>
                  + Add to Pack Calendar
                </button>
                <button
                  onClick={() => setStatus(ev, 'dismissed')}
                  style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6,
                    border: '0.5px solid var(--border)', background: 'var(--card-bg)',
                    color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Dismiss ✕
                </button>
              </div>
            )}
          </div>
        )
      })}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#2E7D32', color: 'white', padding: '10px 20px', borderRadius: 8,
          fontSize: 14, zIndex: 1000, boxShadow: '0 2px 8px rgba(0,0,0,0.25)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
