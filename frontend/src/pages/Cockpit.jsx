import { useState, useEffect } from 'react'
import { api } from '../hooks/useAuth'
import { format, addDays } from 'date-fns'

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

const MONTH_TASKS = {
  8:  [{t:'Check in with all 6 den leaders',tag:'Week 1',urgent:false},{t:'Review Scoutbook — advancements pending?',tag:'Week 1',urgent:false},{t:'Confirm pack meeting date & location',tag:'Week 1',urgent:false},{t:'Recruitment signup night at school',tag:'Critical',urgent:true},{t:'Annual pack calendar shared with families',tag:'Week 2',urgent:false}],
  9:  [{t:'Kickoff pack meeting — welcome everyone',tag:'Pack meeting',urgent:false},{t:'Confirm all 6 den leaders are set',tag:'Week 1',urgent:false},{t:'Popcorn sale kickoff announced',tag:'Fundraiser',urgent:false},{t:'Follow up with recruitment leads',tag:'Recruitment',urgent:true}],
  10: [{t:'Popcorn sale — push final week',tag:'Fundraiser',urgent:true},{t:'Check advancement progress with all DLs',tag:'Advancement',urgent:false},{t:'Fall outing / Trunk-or-Treat planned',tag:'Event',urgent:false},{t:'Pinewood Derby kits distributed',tag:'Dec prep',urgent:false}],
  11: [{t:'Scouting for Food service project',tag:'Service',urgent:false},{t:'Rechartering — start roster review',tag:'Admin',urgent:true},{t:'Mid-year committee budget check',tag:'Finances',urgent:false},{t:'Advancement check-in with all DLs',tag:'Advancement',urgent:false}],
  0:  [{t:'Recharter submitted to council',tag:'Admin',urgent:true},{t:'Pinewood Derby — race day!',tag:'Event',urgent:false},{t:'Holiday party / pack celebration',tag:'Event',urgent:false},{t:'Scoutbook fully updated before year-end',tag:'Admin',urgent:false}],
  1:  [{t:'New year kickoff — review calendar',tag:'Week 1',urgent:false},{t:'Mid-year advancement check all dens',tag:'Advancement',urgent:false},{t:'Summer camp — start promoting',tag:'Camp',urgent:true},{t:'Blue & Gold planning begins',tag:'Event',urgent:false}],
  2:  [{t:'Blue & Gold Banquet',tag:'Big event',urgent:true},{t:'Summer camp registration — push hard',tag:'Camp',urgent:true},{t:'Winter outing',tag:'Event',urgent:false},{t:'Scout anniversary month — celebrate!',tag:'Recognition',urgent:false}],
  3:  [{t:'Spring recruitment planning locked in',tag:'Recruitment',urgent:true},{t:'Camp deadlines — follow up families',tag:'Camp',urgent:true},{t:'Check AOL crossover timeline with troop',tag:'AOL',urgent:true},{t:'Order advancement patches NOW',tag:'Urgent',urgent:true}],
  4:  [{t:'AOL crossover ceremony — the big one',tag:'URGENT',urgent:true},{t:'ALL rank advancements awarded',tag:'URGENT',urgent:true},{t:'Confirm ALL den leaders returning in fall',tag:'Leadership',urgent:true},{t:'Fall recruitment plan finalized',tag:'Recruitment',urgent:false},{t:'Thank-you notes — leaders & volunteers',tag:'Recognition',urgent:false}],
  5:  [{t:'Summer program running',tag:'Ongoing',urgent:false},{t:'Day camp / resident camp',tag:'Event',urgent:false},{t:'Fall program outline drafted',tag:'Planning',urgent:false},{t:'Informal DL check-ins',tag:'Leadership',urgent:false}],
  6:  [{t:'Final summer activity',tag:'Event',urgent:false},{t:'Recruit follow-up before school starts',tag:'Recruitment',urgent:true},{t:'Sept meeting planned & ready',tag:'Urgent',urgent:true},{t:'Fall materials, space, calendar — all set',tag:'Admin',urgent:false}],
  7:  [{t:'Fall kickoff prep done',tag:'Admin',urgent:true},{t:'Families re-engaged',tag:'Outreach',urgent:false},{t:'Den leaders confirmed and briefed',tag:'Leadership',urgent:true},{t:'Popcorn sale prep',tag:'Fundraiser',urgent:false}],
}

function getLastTuesdayOfMonth(year, month) {
  const lastDay = new Date(year, month + 1, 0)
  const dow = lastDay.getDay()
  const diff = (dow >= 2) ? dow - 2 : dow + 5
  return new Date(year, month, lastDay.getDate() - diff)
}

export default function Cockpit() {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const [tasks, setTasks] = useState(MONTH_TASKS[month] || [])
  const [done, setDone] = useState({})
  const [events, setEvents] = useState([])
  const [dens, setDens] = useState([])

  useEffect(() => {
    api.get('/events/').then(r => setEvents(r.data)).catch(() => {})
    api.get('/dens/').then(r => setDens(r.data)).catch(() => {})
  }, [])

  const meeting = getLastTuesdayOfMonth(year, month)
  const daysOut = Math.ceil((meeting - now) / 86400000)
  const meetingLabel = daysOut < 0
    ? `Next: ${format(getLastTuesdayOfMonth(month === 11 ? year+1 : year, (month+1)%12), 'MMM d')}`
    : daysOut === 0 ? 'Today!' : `${daysOut} days away`

  const doneCount = Object.values(done).filter(Boolean).length
  const pct = tasks.length ? Math.round(doneCount / tasks.length * 100) : 0

  const urgentFirst = [...tasks].map((t,i) => ({...t,i})).sort((a,b) => b.urgent - a.urgent)

  const denNeedCount = dens.filter(d => d.status === 'help' || d.status === 'checkin').length

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: '1rem' }}>
        {MONTH_NAMES[month]} Cockpit
      </h1>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10, marginBottom: '1rem' }}>
        <Stat label="Pack meeting" value={meetingLabel} sub={format(meeting, 'MMMM d')} />
        <Stat label="Tasks done" value={`${doneCount} / ${tasks.length}`} sub={`${pct}% complete`} />
        <Stat label="Dens needing attention" value={denNeedCount} sub={`of ${dens.length} dens`} accent={denNeedCount > 0} />
        <Stat label="Upcoming events" value={events.length} sub="from Band calendar" />
      </div>

      {/* Task list */}
      <div className="card">
        <div className="card-title">What needs attention this month</div>
        {urgentFirst.map(({ t, tag, urgent, i }) => (
          <div key={i} onClick={() => setDone(d => ({ ...d, [i]: !d[i] }))}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0',
              borderBottom: '0.5px solid var(--border)', cursor: 'pointer', opacity: done[i] ? 0.45 : 1 }}>
            <div style={{ width: 20, height: 20, borderRadius: 4, border: '0.5px solid var(--border)',
              background: done[i] ? '#EAF3DE' : 'transparent', flexShrink: 0, marginTop: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#2E7D32' }}>
              {done[i] ? '✓' : ''}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, textDecoration: done[i] ? 'line-through' : 'none' }}>{t}</div>
              <div style={{ fontSize: 11, marginTop: 2, color: urgent ? '#C62828' : 'var(--text-secondary)', fontWeight: urgent ? 600 : 400 }}>
                {urgent ? `! ${tag}` : tag}
              </div>
            </div>
          </div>
        ))}
        {/* Progress bar */}
        <div style={{ height: 5, background: 'var(--bg)', borderRadius: 99, marginTop: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, transition: 'width .3s',
            background: pct >= 75 ? '#4CAF50' : pct >= 40 ? '#FF9800' : '#F44336' }} />
        </div>
      </div>

      {/* Upcoming events from Band */}
      {events.length > 0 && (
        <div className="card">
          <div className="card-title">Upcoming from Band calendar</div>
          {events.slice(0, 5).map(ev => (
            <div key={ev.id} style={{ display: 'flex', gap: 12, padding: '7px 0', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 64, flexShrink: 0 }}>
                {format(new Date(ev.start_date), 'MMM d')}
              </div>
              <div style={{ fontSize: 14 }}>{ev.summary}</div>
            </div>
          ))}
        </div>
      )}

      {/* Den alerts */}
      {denNeedCount > 0 && (
        <div className="card" style={{ borderLeft: '3px solid var(--red)' }}>
          <div className="card-title">Den alerts</div>
          {dens.filter(d => d.status === 'help' || d.status === 'checkin').map(d => (
            <div key={d.id} style={{ fontSize: 14, padding: '5px 0', display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className={`status-${d.status}`} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, border: '0.5px solid', fontWeight: 500 }}>
                {d.status === 'help' ? 'Help needed' : 'Check-in'}
              </span>
              <span>{d.name}</span>
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
