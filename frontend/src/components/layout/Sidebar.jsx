import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, LayoutTemplate, ScanSearch, Calendar, BarChart3, Settings, BookOpen, Video, CheckSquare } from 'lucide-react'

const MANAGER_NAV = [
  {
    section: 'TEAM',
    items: [
      { to: '/manager/dashboard',       icon: LayoutDashboard, label: 'Team Overview' },
      { to: '/manager/team',            icon: Users,           label: 'My Team' },
    ],
  },
  {
    section: 'TOOLS',
    items: [
      { to: '/manager/templates',       icon: LayoutTemplate,  label: 'Templates' },
      { to: '/manager/resume-analyzer', icon: ScanSearch,      label: 'Resume Analyzer' },
    ],
  },
  {
    section: 'SHARED',
    items: [
      { to: '/manager/schedule',        icon: Calendar,        label: 'Schedule' },
      { to: '/manager/reports',         icon: BarChart3,       label: 'Reports' },
    ],
  },
]

const IV_NAV = [
  {
    section: 'INTERVIEWS',
    items: [
      { to: '/interviewer/dashboard',   icon: LayoutDashboard, label: 'My Dashboard' },
      { to: '#',                        icon: BookOpen,        label: 'Interview Prep' },
      { to: '#',                        icon: Video,           label: 'Live Room' },
      { to: '#',                        icon: CheckSquare,     label: 'Scorecard' },
    ],
  },
]

function getInitials(name) {
  if (!name) return '?'
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function Sidebar({ role = 'manager', onLogout }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const nav = role === 'manager' ? MANAGER_NAV : IV_NAV

  let user = {}
  try { const s = localStorage.getItem('user'); if (s) user = JSON.parse(s) } catch {}

  const userName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name || user.email || 'User'
  const userRole = role === 'manager' ? 'Manager' : 'Interviewer'

  return (
    <aside style={{
      width: 220,
      background: '#0F172A',
      color: '#FFF',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 38,
      height: 'calc(100vh - 38px)',
      borderRight: '1px solid #1E293B',
      flexShrink: 0,
    }}>
      <div style={{ flex: 1, padding: '8px 10px', overflowY: 'auto' }}>
        {nav.map((sec, si) => (
          <div key={si}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748B', padding: '14px 10px 6px' }}>
              {sec.section}
            </div>
            {sec.items.map(({ to, icon: Icon, label }) => {
              const isActive = to !== '#' && (location.pathname === to || (to.length > 10 && location.pathname.startsWith(to)))
              return (
                <div
                  key={to + label}
                  onClick={() => to !== '#' && navigate(to)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 7,
                    fontSize: 13, fontWeight: 500,
                    color: isActive ? '#FFF' : '#94A3B8',
                    background: isActive ? '#5B4FE9' : 'transparent',
                    cursor: to !== '#' ? 'pointer' : 'default',
                    marginBottom: 2,
                    boxShadow: isActive ? '0 4px 12px rgba(91,79,233,0.3)' : 'none',
                    transition: 'all 120ms cubic-bezier(0.2,0,0,1)',
                    opacity: to === '#' ? 0.45 : 1,
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

      {/* User footer */}
      <div
        onClick={() => {
          if (role === 'manager') navigate('/manager/profile')
          else if (role === 'interviewer') navigate('/interviewer/profile')
        }}
        style={{
          padding: '12px 14px', borderTop: '1px solid #1E293B',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          cursor: 'pointer',
          transition: 'background 120ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 9999, background: '#5B4FE9', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
          {getInitials(userName)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
          <div style={{ fontSize: 11, color: '#64748B' }}>{userRole}</div>
        </div>
        <Settings size={13} color="#64748B" />
      </div>
    </aside>
  )
}

export default Sidebar
