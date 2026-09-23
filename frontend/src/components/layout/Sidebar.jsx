import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, ScanSearch, Calendar, BarChart3, Settings, CheckSquare, UserCheck, ShieldCheck, UserCog, LayoutGrid, LockKeyhole, KeyRound, Building2, Lightbulb, Award } from 'lucide-react'
import { useAccess } from '../../context/AccessContext'

// Which admin-managed Module (see backend modules table) gates each nav item, so a
// user without at least one permission on that module never sees the link - the
// actual enforcement is the backend's requireModule(), this just keeps the sidebar
// from advertising pages the user can't use. Every account shares this one list now -
// there's no portal split, just whichever modules a role's ACLs actually grant.
const WORKSPACE_NAV = [
  {
    section: 'TEAM',
    items: [
      { to: '/workspace/dashboard',       icon: LayoutDashboard, label: 'Overview' },
      { to: '/workspace/team',            icon: Users,           label: 'My Team',            module: 'team' },
    ],
  },
  {
    section: 'ASSESSMENTS',
    items: [
      { to: '/workspace/monthly',         icon: CheckSquare,     label: 'Monthly Assessment', module: 'monthly_assessments' },
      { to: '/workspace/clients',         icon: Users,           label: 'Client Mandates',    module: 'client_mandates' },
    ],
  },
  {
    section: 'TOOLS',
    items: [
      { to: '/workspace/resume-analyzer', icon: ScanSearch,      label: 'Resume Analyzer',    module: 'resume_analyzer' },
    ],
  },
  {
    section: 'SHARED',
    items: [
      { to: '/workspace/schedule',        icon: Calendar,        label: 'Schedule',           module: 'schedule' },
      { to: '/workspace/reports',         icon: BarChart3,       label: 'Reports',            module: 'reports' },
      { to: '/workspace/interviews',      icon: UserCheck,       label: 'Interviews',         module: 'interviews' },
      { to: '/workspace/feedback',        icon: Lightbulb,       label: 'Feedback',           module: 'feedback' },
      { to: '/workspace/outcomes',        icon: Award,           label: 'Outcomes',           module: 'outcomes' },
    ],
  },
]

const ADMIN_NAV = [
  {
    section: 'SYSTEM',
    items: [
      { to: '/admin/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin/mandates',       icon: Users,           label: 'Mandates' },
      { to: '/admin/interviews',     icon: Calendar,        label: 'Interviews' },
      { to: '/admin/broken-states',  icon: CheckSquare,     label: 'Broken States' },
      { to: '/admin/organizations',  icon: Building2,       label: 'Organizations' },
      { to: '/admin/users',          icon: UserCog,         label: 'Users' },
      { to: '/admin/roles',          icon: ShieldCheck,     label: 'Roles' },
      { to: '/admin/acls',           icon: LockKeyhole,     label: 'ACLs' },
      { to: '/admin/modules',        icon: LayoutGrid,      label: 'Modules' },
      { to: '/admin/permissions',    icon: KeyRound,        label: 'Permissions' },
    ],
  },
]

function getInitials(name) {
  if (!name) return '?'
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function Sidebar({ role = 'workspace', open = false, onNavigate }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { access, hasModule, loading: accessLoading } = useAccess()
  const rawNav = { admin: ADMIN_NAV }[role] || WORKSPACE_NAV
  // Admin's nav isn't module-gated (platform-wide, see access.service.js), and while
  // access is still loading we show everything rather than flash an empty sidebar.
  const nav = role === 'admin' || accessLoading
    ? rawNav
    : rawNav
        .map(sec => ({ ...sec, items: sec.items.filter(item => !item.module || hasModule(item.module)) }))
        .filter(sec => sec.items.length > 0)

  let user = {}
  try {
    const stored = localStorage.getItem('user')
    if (stored) user = JSON.parse(stored)
  } catch {
    user = {}
  }

  const userName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name || user.email || 'User'
  // No portal label anymore - show the caller's actual role name(s) (e.g. "Manager",
  // "BDE", whatever an admin named the role), same source the ACL grid uses.
  const userRole = role === 'admin' ? 'Admin' : (access?.roleNames?.join(', ') || 'Member')

  return (
    <aside className={`manager-sidebar${open ? ' is-open' : ''}`} style={{
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
                <Link
                  key={to + label}
                  to={to}
                  className="sidebar-nav-link"
                  onClick={() => onNavigate?.()}
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
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* User footer */}
      <div
        onClick={() => {
          navigate(role === 'admin' ? '/admin/profile' : '/workspace/profile')
          onNavigate?.()
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
