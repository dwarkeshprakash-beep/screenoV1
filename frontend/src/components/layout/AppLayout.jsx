import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import * as api from '../../services/api'
import { LogOut } from 'lucide-react'

// ── Page meta ─────────────────────────────────────────────────
const PAGE_META = {
  '/manager/dashboard':        { title: 'Team Overview',      subtitle: 'Your team at a glance' },
  '/manager/team':             { title: 'My Team',            subtitle: 'Manage team members and assessments' },
  '/manager/monthly':          { title: 'Monthly Assessment', subtitle: 'Manage recurring team assessments' },
  '/manager/clients':          { title: 'Client Mandates',    subtitle: 'Create hiring requirements and schedule interviews' },
  '/manager/schedule':         { title: 'Schedule',           subtitle: 'Upcoming interviews and sessions' },
  '/manager/reports':          { title: 'Reports',            subtitle: 'Analytics and candidate insights' },
  '/manager/templates':        { title: 'Templates',          subtitle: 'Interview and exam templates' },
  '/manager/resume-analyzer':  { title: 'Resume Analyzer',   subtitle: 'JD-match scoring and keyword gap analysis' },
  '/manager/profile':          { title: 'My Profile',         subtitle: 'Account and notification settings' },
}

function getPageMeta(pathname) {
  if (PAGE_META[pathname]) return PAGE_META[pathname]
  if (pathname.startsWith('/manager/team/')) return { title: 'Member Profile', subtitle: 'Team member details and history' }
  return { title: '', subtitle: '' }
}

// ── Screeno logo mark ─────────────────────────────────────────
function LogoMark({ size = 22 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.27), background: 'linear-gradient(135deg,var(--brand-500),var(--brand-600))', display: 'inline-flex', flexShrink: 0, position: 'relative' }}>
      <div style={{ position: 'absolute', left: '23%', top: '32%', width: '54%', height: '11%', background: 'var(--bg-surface)', borderRadius: 2, opacity: 0.95 }} />
      <div style={{ position: 'absolute', left: '23%', top: '57%', width: '54%', height: '11%', background: 'var(--bg-surface)', borderRadius: 2, opacity: 0.6 }} />
    </div>
  )
}

// ── Role bar (dark strip at very top) ─────────────────────────
const ROLE_LABELS = {
  manager:     'MANAGER',
  candidate:   'CANDIDATE',
}

function RoleBar({ role, onLogout, onLogoClick }) {
  return (
    <div style={{
      background: 'var(--slate-900)', height: 38,
      display: 'flex', alignItems: 'center',
      padding: '0 14px', gap: 4,
      position: 'sticky', top: 0, zIndex: 100,
      borderBottom: '1px solid #1E293B', flexShrink: 0,
    }}>
      <div
        onClick={onLogoClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onLogoClick() }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12, cursor: 'pointer' }}
      >
        <LogoMark size={22} />
        <span style={{ color: 'var(--bg-surface)', fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>Screeno</span>
      </div>
      <div style={{ width: 1, height: 18, background: '#1E293B', margin: '0 8px' }} />
      <span style={{
        padding: '4px 12px', borderRadius: 5,
        border: '1px solid #334155',
        color: 'var(--bg-surface)',
        fontSize: 12, fontWeight: 600,
        letterSpacing: '0.06em',
      }}>
        {ROLE_LABELS[role] || role?.toUpperCase()}
      </span>
      <div style={{ flex: 1 }} />
      <button
        onClick={onLogout}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 5, border: '1px solid transparent',
          background: 'transparent', color: '#64748B',
          fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          transition: 'color 120ms',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--bg-surface)'}
        onMouseLeave={e => e.currentTarget.style.color = '#64748B'}
      >
        <LogOut size={13} /> Logout
      </button>
    </div>
  )
}

// ── App layout shell ──────────────────────────────────────────
function AppLayout({ role = 'manager' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { title, subtitle } = getPageMeta(location.pathname)

  function handleLogout() {
    api.logout().catch(() => {})
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    navigate('/login')
  }

  function handleLogoClick() {
    navigate(`/${role}/dashboard`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <RoleBar role={role} onLogout={handleLogout} onLogoClick={handleLogoClick} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          <TopBar title={title} subtitle={subtitle} role={role} />

          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem 1.75rem', background: 'var(--slate-50)', overflowY: 'auto' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export default AppLayout
