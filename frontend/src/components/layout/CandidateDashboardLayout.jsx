import { NavLink, Outlet } from 'react-router-dom'
import { Home, Calendar, BriefcaseBusiness, User, BookOpen, Lightbulb } from 'lucide-react'

const TABS = [
  { to: '/candidate/overview',   label: 'Overview',   icon: Home },
  { to: '/candidate/interviews', label: 'Interviews', icon: Calendar },
  { to: '/candidate/monthly',    label: 'Monthly',    icon: BookOpen },
  { to: '/candidate/feedback',   label: 'Feedback',   icon: Lightbulb },
  { to: '/candidate/mandates',   label: 'Mandates',   icon: BriefcaseBusiness },
  { to: '/candidate/profile',    label: 'Profile',    icon: User },
]

function CandidateDashboardLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100svh - 3.5rem)' }}>
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)', padding: '0 1.75rem' }}>
        <nav style={{ display: 'flex', overflowX: 'auto' }}>
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '13px 16px',
                fontSize: 13, fontWeight: 600,
                color: isActive ? 'var(--brand-500)' : 'var(--fg-muted)',
                borderBottom: `2px solid ${isActive ? 'var(--brand-500)' : 'transparent'}`,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                marginBottom: -1,
                transition: 'color var(--dur-fast) var(--ease-standard)',
              })}>
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div style={{ flex: 1, background: 'var(--bg-page)' }}>
        <Outlet />
      </div>
    </div>
  )
}

export default CandidateDashboardLayout
