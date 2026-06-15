import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, ScanSearch, Calendar, BarChart3, Settings, CheckSquare, CalendarRange } from 'lucide-react'

const MANAGER_NAV = [
  {
    section: 'TEAM',
    items: [
      { to: '/manager/dashboard',       icon: LayoutDashboard, label: 'Team Overview' },
      { to: '/manager/team',            icon: Users,           label: 'My Team' },
    ],
  },
  {
    section: 'ASSESSMENTS',
    items: [
      { to: '/manager/monthly',         icon: CheckSquare,     label: 'Monthly Templates', exact: true },
      { to: '/manager/monthly/plan',    icon: CalendarRange,   label: 'Monthly Plan' },
      { to: '/manager/clients',         icon: Users,           label: 'Client Mandates' },
    ],
  },
  {
    section: 'TOOLS',
    items: [
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

function getInitials(name) {
  if (!name) return '?'
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function Sidebar() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const nav = MANAGER_NAV

  let user = {}
  try {
    const stored = localStorage.getItem('user')
    if (stored) user = JSON.parse(stored)
  } catch {
    user = {}
  }

  const userName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name || user.email || 'User'
  const userRole = 'Manager'

  return (
    <aside style={{
      width: '14rem',
      background: 'var(--bg-sidebar)',
      color: 'var(--fg-on-dark)',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: '2.375rem',
      height: 'calc(100vh - 2.375rem)',
      borderRight: '1px solid var(--border-sidebar)',
      flexShrink: 0,
    }}>
      <div style={{ flex: 1, padding: '8px 10px', overflowY: 'auto' }}>
        {nav.map((sec, si) => (
          <div key={si}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748B', padding: '14px 10px 6px' }}>
              {sec.section}
            </div>
            {sec.items.map(({ to, icon: Icon, label, exact }) => {
              const isActive = to !== '#' && (
                location.pathname === to
                || (!exact && to.length > 10 && location.pathname.startsWith(to))
              )
              return (
                <div
                  key={to + label}
                  onClick={() => to !== '#' && navigate(to)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                    padding: '0.5625rem 0.75rem', borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)',
                    color: isActive ? 'var(--fg-on-brand)' : 'var(--fg-on-dark-muted)',
                    background: isActive ? 'var(--brand-500)' : 'transparent',
                    cursor: to !== '#' ? 'pointer' : 'default',
                    marginBottom: '0.125rem',
                    boxShadow: isActive ? '0 4px 12px rgba(91,79,233,0.3)' : 'none',
                    transition: 'all var(--dur-fast) var(--ease-standard)',
                    opacity: to === '#' ? 0.45 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!isActive && to !== '#') {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                      e.currentTarget.style.color = 'var(--bg-surface)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--slate-400)'
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
          navigate('/manager/profile')
        }}
        style={{
          padding: '0.75rem 0.875rem', borderTop: '1px solid var(--border-sidebar)',
          display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0,
          cursor: 'pointer',
          transition: 'background var(--dur-fast)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: 'var(--radius-full)', background: 'var(--brand-500)', color: 'var(--fg-on-brand)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'var(--fw-bold)', fontSize: 'var(--fs-sm)', flexShrink: 0 }}>
          {getInitials(userName)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--fg-on-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-on-dark-muted)' }}>{userRole}</div>
        </div>
        <Settings size={13} color="var(--fg-on-dark-muted)" />
      </div>
    </aside>
  )
}

export default Sidebar
