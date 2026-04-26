import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../hooks/useAuth'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const nav = [
    { to: '/',         label: 'Cockpit'  },
    { to: '/dens',     label: 'Dens'     },
    { to: '/agenda',   label: 'Agenda'   },
    { to: '/report',   label: 'Report'   },
    { to: '/calendar', label: 'Calendar' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'var(--navy)', color: 'white', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '1rem', height: 52 }}>
        <span style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap' }}>Pack 44</span>
        <nav style={{ display: 'flex', gap: 4, flex: 1, overflowX: 'auto' }}>
          {nav.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to==='/'} style={({ isActive }) => ({
              padding: '6px 10px', borderRadius: 6, fontSize: 13, fontWeight: 500,
              color: isActive ? 'var(--gold)' : 'rgba(255,255,255,0.75)',
              textDecoration: 'none', whiteSpace: 'nowrap',
              background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
            })}>
              {label}
            </NavLink>
          ))}
        </nav>
        <span style={{ fontSize: 12, opacity: .7, whiteSpace: 'nowrap' }}>{user?.username}</span>
        <button onClick={handleLogout} style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
      </header>
      <main style={{ flex: 1, padding: '1rem', maxWidth: 700, margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>
    </div>
  )
}
