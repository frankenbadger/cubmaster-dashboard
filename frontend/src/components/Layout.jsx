import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../hooks/useAuth'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const nav = [
    { to: '/',          label: 'Cockpit'   },
    { to: '/dens',      label: 'Dens'      },
    { to: '/agenda',    label: 'Agenda'    },
    { to: '/report',    label: 'Report'    },
    { to: '/calendar',  label: 'Calendar'  },
    { to: '/contacts',  label: 'Contacts'  },
    { to: '/radar',     label: 'Radar'     },
    { to: '/docs',      label: 'Docs'      },
    ...(user?.role === 'cubmaster' ? [{ to: '/users', label: 'Users' }] : []),
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="site-header">
        <span style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap' }}>Pack 44</span>
        <nav className="site-nav">
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span className="site-username">{user?.username}</span>
          <button onClick={handleLogout}
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Sign out
          </button>
        </div>
      </header>
      <main style={{ flex: 1, padding: '1rem', maxWidth: 700, margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>
    </div>
  )
}
