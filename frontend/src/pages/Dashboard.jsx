import { useState, useEffect } from 'react'
import { api } from '../hooks/useAuth'
import { format } from 'date-fns'

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

function getLastTuesdayOfMonth(year, month) {
  const lastDay = new Date(year, month + 1, 0)
  const dow = lastDay.getDay()
  const diff = (dow >= 2) ? dow - 2 : dow + 5
  return new Date(year, month, lastDay.getDate() - diff)
}

export default function Dashboard() {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const [tasks, setTasks] = useState([])
  const [toggling, setToggling] = useState({})
  const [events, setEvents] = useState([])
  const [dens, setDens] = useState([])

  useEffect(() => {
    api.get(`/tasks/${year}/${month}`).then(r => setTasks(r.data)).catch(() => {})
    api.get('/events/').then(r => setEvents(r.data)).catch(() => {})
    api.get('/dens/').then(r => setDens(r.data)).catch(() => {})
  }, [])

  async function toggleTask(task) {
    setToggling(t => ({ ...t, [task.id]: true }))
    try {
      const { data } = await api.patch(`/tasks/${task.id}`, { done: !task.done })
      setTasks(ts => ts.map(t => t.id === task.id ? data : t))
    } finally {
      setToggling(t => ({ ...t, [task.id]: false }))
    }
  }

  const meeting = getLastTuesdayOfMonth(year, month)
  const daysOut = Math.ceil((meeting - now) / 86400000)
  const meetingLabel = daysOut < 0
    ? `Next: ${format(getLastTuesdayOfMonth(month === 11 ? year+1 : year, (month+1)%12), 'MMM d')}`
    : daysOut === 0 ? 'Today!' : `${daysOut} days away`

  const doneCount = tasks.filter(t => t.done).length
  const pct = tasks.length ? Math.round(doneCount / tasks.length * 100) : 0
  const urgentFirst = [...tasks].sort((a, b) => b.urgent - a.urgent)
  const denNeedCount = dens.filter(d => d.status === 'help' || d.status === 'checkin').length

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: '1rem' }}>
        {MONTH_NAMES[month]} Dashboard
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10, marginBottom: '1rem' }}>
        <Stat label="Pack meeting" value={meetingLabel} sub={format(meeting, 'MMMM d')} />
        <Stat label="Tasks done" value={`${doneCount} / ${tasks.length}`} sub={`${pct}% complete`} />
        <Stat label="Dens needing attention" value={denNeedCount} sub={`of ${dens.length} dens`} accent={denNeedCount > 0} />
        <Stat label="Upcoming events" value={events.length} sub="from Band calendar" />
      </div>

      <div className="card">
        <div className="card-title">What needs attention this month</div>
        {tasks.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '8px 0' }}>Loading tasks…</p>
        )}
        {urgentFirst.map(task => (
          <div key={task.id} onClick={() => !toggling[task.id] && toggleTask(task)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0',
              borderBottom: '0.5px solid var(--border)', cursor: 'pointer',
              opacity: task.done ? 0.45 : 1 }}>
            <div style={{ width: 20, height: 20, borderRadius: 4, border: '0.5px solid var(--border)',
              background: task.done ? '#EAF3DE' : 'transparent', flexShrink: 0, marginTop: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#2E7D32' }}>
              {task.done ? '✓' : ''}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, textDecoration: task.done ? 'line-through' : 'none' }}>{task.label}</div>
              <div style={{ fontSize: 11, marginTop: 2, color: task.urgent ? '#C62828' : 'var(--text-secondary)', fontWeight: task.urgent ? 600 : 400 }}>
                {task.urgent ? `! ${task.tag}` : task.tag}
              </div>
            </div>
          </div>
        ))}
        <div style={{ height: 5, background: 'var(--bg)', borderRadius: 99, marginTop: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, transition: 'width .3s',
            background: pct >= 75 ? '#4CAF50' : pct >= 40 ? '#FF9800' : '#F44336' }} />
        </div>
      </div>

      {events.length > 0 && (
        <div className="card">
          <div className="card-title">Upcoming from Band calendar</div>
          {events.slice(0, 5).map(ev => (
            <div key={ev.id} style={{ display: 'flex', gap: 12, padding: '7px 0', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 48, flexShrink: 0 }}>
                {format(new Date(ev.start_date + 'T12:00:00'), 'MMM d')}
              </div>
              <div style={{ fontSize: 14 }}>{ev.summary}</div>
            </div>
          ))}
        </div>
      )}

      {denNeedCount > 0 && (
        <div className="card" style={{ borderLeft: '3px solid var(--red)' }}>
          <div className="card-title">Den alerts</div>
          {dens.filter(d => d.status === 'help' || d.status === 'checkin').map(d => (
            <div key={d.id} style={{ fontSize: 14, padding: '5px 0', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`status-${d.status}`} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, border: '0.5px solid', fontWeight: 500 }}>
                {d.status === 'help' ? 'Help needed' : 'Check-in'}
              </span>
              <span>{d.name}{d.den_number ? ` Den #${d.den_number}` : ''}</span>
              {d.notes && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>— {d.notes}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub, accent }) {
  return (
    <div style={{ background: accent ? '#FFF3E0' : 'var(--bg)', borderRadius: 8, padding: '12px 14px',
      border: accent ? '0.5px solid #FFCC80' : '0.5px solid var(--border)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: accent ? '#E65100' : 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>
    </div>
  )
}
