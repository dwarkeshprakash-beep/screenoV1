import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import * as api from '../../services/api'
import { LogOut } from 'lucide-react'

// ── Page meta ─────────────────────────────────────────────────
const PAGE_META = {
  '/manager/dashboard':        { title: 'Team Overview',      subtitle: 'Your team at a glance' },
  '/manager/team':             { title: 'My Team',            subtitle: 'Manage team members and assessments' },
  '/manager/schedule':         { title: 'Schedule',           subtitle: 'Upcoming interviews and sessions' },
  '/manager/reports':          { title: 'Reports',            subtitle: 'Analytics and candidate insights' },
  '/manager/templates':        { title: 'Templates',          subtitle: 'Interview and exam templates' },
  '/manager/resume-analyzer':  { title: 'Resume Analyzer',   subtitle: 'JD-match scoring and keyword gap analysis' },
  '/manager/profile':          { title: 'My Profile',         subtitle: 'Account and notification settings' },
  '/interviewer/dashboard':    { title: 'My Dashboard',       subtitle: 'Upcoming interviews and scorecards' },
  '/interviewer/scorecard':    { title: 'Scorecard',          subtitle: 'Rate and submit your evaluation' },
}

function getPageMeta(pathname) {
  if (PAGE_META[pathname]) return PAGE_META[pathname]
  if (pathname.startsWith('/manager/team/')) return { title: 'Member Profile', subtitle: 'Team member details and history' }
  if (pathname.startsWith('/interviewer/scorecard/')) return { title: 'Scorecard', subtitle: 'Rate and submit your evaluation' }
  return { title: '', subtitle: '' }
}

// ── Screeno logo mark ─────────────────────────────────────────
function LogoMark({ size = 22 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.27), background: 'linear-gradient(135deg,#5B4FE9,#4A3FCE)', display: 'inline-flex', flexShrink: 0, position: 'relative' }}>
      <div style={{ position: 'absolute', left: '23%', top: '32%', width: '54%', height: '11%', background: '#FFF', borderRadius: 2, opacity: 0.95 }} />
      <div style={{ position: 'absolute', left: '23%', top: '57%', width: '54%', height: '11%', background: '#FFF', borderRadius: 2, opacity: 0.6 }} />
    </div>
  )
}

// ── Role bar (dark strip at very top) ─────────────────────────
const ROLE_LABELS = {
  manager:     'MANAGER',
  interviewer: 'INTERVIEWER',
  candidate:   'CANDIDATE',
}

function RoleBar({ role, onLogout }) {
  return (
    <div style={{
      background: '#0F172A', height: 38,
      display: 'flex', alignItems: 'center',
      padding: '0 14px', gap: 4,
      position: 'sticky', top: 0, zIndex: 100,
      borderBottom: '1px solid #1E293B', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12 }}>
        <LogoMark size={22} />
        <span style={{ color: '#FFF', fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>Screeno</span>
      </div>
      <div style={{ width: 1, height: 18, background: '#1E293B', margin: '0 8px' }} />
      <span style={{
        padding: '4px 12px', borderRadius: 5,
        border: '1px solid #334155',
        color: '#FFF',
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
        onMouseEnter={e => e.currentTarget.style.color = '#FFF'}
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

  let user = {}
  try { const s = localStorage.getItem('user'); if (s) user = JSON.parse(s) } catch {}

  function handleLogout() {
    api.logout().catch(() => {})
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <RoleBar role={role} onLogout={handleLogout} />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar role={role} onLogout={handleLogout} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <TopBar title={title} subtitle={subtitle} role={role} />

          <main style={{ flex: 1, padding: '24px 28px', background: '#F8FAFC', overflowY: 'auto' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export default AppLayout
