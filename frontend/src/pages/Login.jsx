// Login.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../hooks/useAuth'

export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await login(username, password)
      navigate('/')
    } catch {
      setError('Invalid username or password')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="card" style={{ width: 320 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>⚜️</div>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Pack 44 Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cubmaster sign in</p>
        </div>
        <form onSubmit={handleSubmit}>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required
            style={{ width: '100%', marginBottom: 8, padding: '8px 12px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required
            style={{ width: '100%', marginBottom: 12, padding: '8px 12px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }} />
          {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Sign in</button>
        </form>
      </div>
    </div>
  )
}

export default Login
