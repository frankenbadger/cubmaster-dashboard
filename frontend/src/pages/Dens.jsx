import { useState, useEffect } from 'react'
import { api } from '../hooks/useAuth'

const STATUSES = [
  { key: 'good',    label: 'Good',         cls: 'status-good'    },
  { key: 'checkin', label: 'Check-in',     cls: 'status-checkin' },
  { key: 'help',    label: 'Help needed',  cls: 'status-help'    },
]

export default function Dens() {
  const [dens, setDens] = useState([])
  const [saving, setSaving] = useState({})

  useEffect(() => { api.get('/dens/').then(r => setDens(r.data)) }, [])

  async function update(den, patch) {
    setSaving(s => ({ ...s, [den.id]: true }))
    try {
      const { data } = await api.patch(`/dens/${den.id}`, patch)
      setDens(ds => ds.map(d => d.id === den.id ? data : d))
    } finally {
      setSaving(s => ({ ...s, [den.id]: false }))
    }
  }

  const good    = dens.filter(d => d.status === 'good').length
  const needAttn = dens.filter(d => d.status === 'help' || d.status === 'checkin').length

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: '1rem' }}>Den Pulse</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginBottom: '1rem' }}>
        <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>All good</div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>{good}</div>
        </div>
        <div style={{ background: needAttn > 0 ? '#FFF3E0' : 'var(--bg)', border: `0.5px solid ${needAttn > 0 ? '#FFCC80' : 'var(--border)'}`, borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Need attention</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: needAttn > 0 ? '#E65100' : 'var(--text)' }}>{needAttn}</div>
        </div>
      </div>

      {dens.map(den => (
        <div key={den.id} className="card" style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 500, fontSize: 15 }}>{den.name}</span>
            {saving[den.id] && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Saving…</span>}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {STATUSES.map(s => (
              <button key={s.key}
                onClick={() => update(den, { status: den.status === s.key ? null : s.key })}
                className={den.status === s.key ? `btn ${s.cls}` : 'btn'}
                style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '5px 4px' }}>
                {s.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Advancements current?</label>
            <button onClick={() => update(den, { advancements_current: !den.advancements_current })}
              style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, border: '0.5px solid var(--border)',
                background: den.advancements_current ? '#EAF3DE' : 'var(--bg)',
                color: den.advancements_current ? '#2E7D32' : 'var(--text-secondary)', cursor: 'pointer' }}>
              {den.advancements_current ? 'Yes ✓' : 'No'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Den Leader</label>
              <input type="text" placeholder="Name"
                defaultValue={den.leader_name || ''}
                onBlur={e => { if (e.target.value !== (den.leader_name || '')) update(den, { leader_name: e.target.value }) }}
                style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Asst. Den Leader</label>
              <input type="text" placeholder="Name"
                defaultValue={den.asst_leader_name || ''}
                onBlur={e => { if (e.target.value !== (den.asst_leader_name || '')) update(den, { asst_leader_name: e.target.value }) }}
                style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Asst. Leader Email</label>
            <input type="email" placeholder="email@example.com"
              defaultValue={den.asst_leader_email || ''}
              onBlur={e => { if (e.target.value !== (den.asst_leader_email || '')) update(den, { asst_leader_email: e.target.value }) }}
              style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <textarea rows={2} placeholder="Notes…"
            defaultValue={den.notes || ''}
            onBlur={e => { if (e.target.value !== (den.notes || '')) update(den, { notes: e.target.value }) }}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '0.5px solid var(--border)',
              background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
          {den.updated_by && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
              Last updated by {den.updated_by}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
