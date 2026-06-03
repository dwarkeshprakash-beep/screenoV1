// Sidebar — left navigation for manager and interviewer.

import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Calendar, BarChart2, FileText, LogOut, User } from 'lucide-react'
import * as api from '../../services/api'

const MANAGER_LINKS = [
  { to: '/manager/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/manager/team',      icon: Users,           label: 'Team'      },
  { to: '/manager/schedule',  icon: Calendar,        label: 'Schedule'  },
  { to: '/manager/reports',   icon: BarChart2,       label: 'Reports'   },
  { to: '/manager/templates', icon: FileText,        label: 'Templates' },
  { to: '/manager/profile',   icon: User,            label: 'Profile'   },
]

const INTERVIEWER_LINKS = [
  { to: '/interviewer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
]

function ScreenoLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px 24px' }}>
      <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 4, left: 2, width: 20, height: 8, background: 'var(--brand-500)', borderRadius: 2 }} />
        <div style={{ position: 'absolute', top: 16, left: 6, width: 20, height: 8, background: 'var(--brand-400)', borderRadius: 2 }} />
      </div>
      <span style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Screeno</span>
    </div>
  )
}

function Sidebar({ role = 'manager' }) {
  const navigate = useNavigate()
  const links = role === 'manager' ? MANAGER_LINKS : INTERVIEWER_LINKS

  async function handleLogout() {
    try { await api.logout() } catch {}
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: 'var(--bg-sidebar)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 12px',
      flexShrink: 0,
    }}>
      <ScreenoLogo />

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: 14,
              fontWeight: 500,
              color: isActive ? '#fff' : 'var(--slate-400)',
              background: isActive ? 'var(--brand-600)' : 'transparent',
              textDecoration: 'none',
              transition: 'background 0.15s, color 0.15s',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px',
          borderRadius: 'var(--radius-md)',
          fontSize: 14,
          color: 'var(--slate-400)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <LogOut size={16} />
        Logout
      </button>
    </aside>
  )
}

export default Sidebar
