import { useState, useEffect } from 'react'
import { api } from '../hooks/useAuth'
import { useAuthStore } from '../hooks/useAuth'

export default function Users() {
  const { user: me } = useAuthStore()
  const [users, setUsers] = useState([])

  useEffect(() => {
    api.get('/users/').then(r => setUsers(r.data)).catch(() => {})
  }, [])

  if (me?.role !== 'cubmaster') {
    return <p style={{ color: 'var(--text-secondary)', padding: '2rem 0' }}>Cubmaster access required.</p>
  }

  async function toggleActive(u) {
    const { data } = await api.patch(`/users/${u.id}`, { is_active: !u.is_active })
    setUsers(us => us.map(x => x.id === u.id ? data : x))
  }

  async function deleteUser(u) {
    if (!window.confirm(`Delete "${u.username}"? This cannot be undone.`)) return
    await api.delete(`/users/${u.id}`)
    setUsers(us => us.filter(x => x.id !== u.id))
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: '1rem' }}>Users</h1>
      <div className="card">
        <div className="card-title">Registered accounts</div>
        {users.map(u => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
            borderBottom: '0.5px solid var(--border)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontWeight: 500 }}>{u.username}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.email} · {u.role}</div>
            </div>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, border: '0.5px solid',
              background: u.is_active ? '#EAF3DE' : 'var(--bg)',
              color: u.is_active ? '#2E7D32' : 'var(--text-secondary)',
              borderColor: u.is_active ? '#C0DD97' : 'var(--border)', whiteSpace: 'nowrap' }}>
              {u.is_active ? 'Active' : 'Inactive'}
            </span>
            {u.username !== me?.username && (
              <>
                <button className="btn" style={{ fontSize: 12, padding: '4px 10px', whiteSpace: 'nowrap' }}
                  onClick={() => toggleActive(u)}>
                  {u.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button className="btn btn-danger" style={{ fontSize: 12, padding: '4px 10px' }}
                  onClick={() => deleteUser(u)}>
                  Delete
                </button>
              </>
            )}
          </div>
        ))}
        {users.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '8px 0' }}>No users found.</p>
        )}
      </div>
    </div>
  )
}
