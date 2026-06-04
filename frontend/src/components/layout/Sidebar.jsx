import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Share2, LayoutTemplate, ScanSearch, Calendar, BarChart3, LogOut, Settings } from 'lucide-react'
import * as api from '../../services/api'

const MANAGER_NAV = [
  {
    section: 'TEAM',
    items: [
      { to: '/manager/dashboard', icon: LayoutDashboard, label: 'Team Overview' },
      { to: '/manager/team',      icon: Users,           label: 'My Team' },
      { to: '#',                  icon: Share2,          label: 'Referrals' },
    ],
  },
  {
    section: 'TOOLS',
    items: [
      { to: '/manager/templates', icon: LayoutTemplate, label: 'Templates' },
      { to: '/manager/reports',   icon: ScanSearch,     label: 'Resume Analyzer' },
    ],
  },
  {
    section: 'SHARED',
    items: [
      { to: '/manager/schedule', icon: Calendar,  label: 'Schedule' },
      { to: '/manager/reports',  icon: BarChart3, label: 'Reports' },
    ],
  },
]

const IV_NAV = [
  {
    section: 'INTERVIEWS',
    items: [
      { to: '/interviewer/dashboard', icon: LayoutDashboard, label: 'My Dashboard' },
    ],
  },
]

const sectionHeaderStyle = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#475569',
  padding: '14px 10px 6px',
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function Sidebar({ role = 'manager' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const nav = role === 'manager' ? MANAGER_NAV : IV_NAV

  let user = {}
  try {
    const stored = localStorage.getItem('user')
    if (stored) user = JSON.parse(stored)
  } catch {}

  const userName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : user.name || user.email || 'User'
  const userRole = role === 'manager' ? 'Manager' : 'Interviewer'

  async function handleLogout() {
    try { await api.logout() } catch {}
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <aside style={{
      width: 200,
      background: '#0F172A',
      color: '#FFF',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      height: '100vh',
      borderRight: '1px solid #1E293B',
      flexShrink: 0,
    }}>
      <div style={{ flex: 1, padding: '8px 10px', overflowY: 'auto' }}>
        {nav.map((sec, si) => (
          <div key={si}>
            <div style={sectionHeaderStyle}>{sec.section}</div>
            {sec.items.map(({ to, icon: Icon, label }) => {
              const isActive = to !== '#' && location.pathname === to
              return (
                <div
                  key={to + label}
                  onClick={() => to !== '#' && navigate(to)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    borderRadius: 7,
                    fontSize: 13,
                    fontWeight: 500,
                    color: isActive ? '#FFF' : '#94A3B8',
                    background: isActive ? '#5B4FE9' : 'transparent',
                    cursor: to !== '#' ? 'pointer' : 'default',
                    marginBottom: 2,
                    boxShadow: isActive ? '0 4px 12px rgba(91,79,233,0.3)' : 'none',
                    transition: 'all 120ms cubic-bezier(0.2,0,0,1)',
                  }}
                  onMouseEnter={e => {
                    if (!isActive && to !== '#') {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                      e.currentTarget.style.color = '#FFF'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = '#94A3B8'
                    }
                  }}
                >
                  <Icon size={15} />
                  {label}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div
        onClick={() => navigate(role === 'manager' ? '/manager/profile' : '#')}
        style={{
          padding: '12px 14px',
          borderTop: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
          cursor: role === 'manager' ? 'pointer' : 'default',
          transition: 'background 120ms',
        }}
        onMouseEnter={e => {
          if (role === 'manager') e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 9999,
          background: '#5B4FE9',
          color: '#FFF',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 13,
          flexShrink: 0,
        }}>
          {getInitials(userName)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
          <div style={{ fontSize: 11, color: '#64748B' }}>{userRole}</div>
        </div>
        <Settings size={13} color="#64748B" />
      </div>

      <button
        onClick={handleLogout}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          margin: '0 10px 10px',
          borderRadius: 7,
          fontSize: 13,
          fontWeight: 500,
          color: '#94A3B8',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 120ms',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
          e.currentTarget.style.color = '#FFF'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = '#94A3B8'
        }}
      >
        <LogOut size={15} />
        Logout
      </button>
    </aside>
  )
}

export default Sidebar
