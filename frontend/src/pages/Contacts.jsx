import { useState, useEffect } from 'react'
import { api } from '../hooks/useAuth'

export default function Contacts() {
  const [dens, setDens] = useState([])

  useEffect(() => {
    api.get('/dens/').then(r => setDens(r.data)).catch(() => {})
  }, [])

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Den Leader Contacts</h1>
        <button className="btn btn-primary" onClick={() => window.print()}>Print</button>
      </div>
      <h1 className="print-only" style={{ fontSize: 18, fontWeight: 600, marginBottom: '1rem', display: 'none' }}>
        Pack 44 — Den Leader Contacts
      </h1>

      {dens.map(den => (
        <div key={den.id} className="card" style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 16 }}>{den.name}</span>
            {den.den_number && (
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Den #{den.den_number}</span>
            )}
            {den.scout_count != null && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                {den.scout_count} scout{den.scout_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
                Den Leader
              </div>
              {den.leader_name
                ? <div style={{ fontSize: 14, fontWeight: 500 }}>{den.leader_name}</div>
                : <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Not set</div>}
              {den.leader_email && (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  <a href={`mailto:${den.leader_email}`} style={{ color: 'var(--navy)', textDecoration: 'none' }}>
                    {den.leader_email}
                  </a>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
                Asst. Den Leader
              </div>
              {den.asst_leader_name
                ? <div style={{ fontSize: 14, fontWeight: 500 }}>{den.asst_leader_name}</div>
                : <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Not set</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
