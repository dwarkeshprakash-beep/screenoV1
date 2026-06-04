import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import * as api from '../../services/api'
import { LayoutDashboard, Users, Calendar, BarChart3, LayoutTemplate, ScanSearch, Video, CheckSquare, LogOut } from 'lucide-react'

// ── Page meta ─────────────────────────────────────────────────
const PAGE_META = {
  '/manager/dashboard':        { title: 'Team Overview',      subtitle: 'Your team at a glance' },
  '/manager/team':             { title: 'My Team',            subtitle: 'Manage team members and assessments' },
  '/manager/schedule':         { title: 'Schedule',           subtitle: 'Upcoming interviews and sessions' },
  '/manager/reports':          { title: 'Reports',            subtitle: 'Analytics and candidate insights' },
  '/manager/templates':        { title: 'Templates',          subtitle: 'Interview and exam templates' },
  '/manager/resume-analyzer':  { title: 'Resume Analyzer',   subtitle: 'JD-match scoring and keyword gap analysis' },
  '/manager/profile':          { title: 'My Profile',         subtitle: 'Account and notification settings' },
  '/interviewer/dashboard':    { title: 'My Interviews',      subtitle: 'Upcoming schedule and scorecards' },
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
const ROLES = [
  { id: 'manager',     label: 'MANAGER',     home: '/manager/dashboard' },
  { id: 'interviewer', label: 'INTERVIEWER', home: '/interviewer/dashboard' },
]

function RoleBar({ role, onLogout }) {
  const navigate = useNavigate()
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
      {ROLES.map(r => (
        <button
          key={r.id}
          onClick={() => navigate(r.home)}
          style={{
            padding: '4px 12px', borderRadius: 5,
            border: role === r.id ? '1px solid #334155' : '1px solid transparent',
            background: 'transparent',
            color: role === r.id ? '#FFF' : '#64748B',
            fontSize: 12, fontWeight: role === r.id ? 600 : 500,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 120ms', letterSpacing: '0.03em',
          }}
        >{r.label}</button>
      ))}
      <div style={{ flex: 1 }} />
      <button
        onClick={onLogout}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 5, border: '1px solid transparent',
          background: 'transparent', color: '#64748B',
          fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#FFF'}
        onMouseLeave={e => e.currentTarget.style.color = '#64748B'}
      >
        <LogOut size={13} /> Logout
      </button>
    </div>
  )
}

// ── Sub-tab bars ───────────────────────────────────────────────
const MANAGER_TABS = [
  { label: 'Team Overview',    icon: LayoutDashboard, to: '/manager/dashboard' },
  { label: 'My Team',         icon: Users,           to: '/manager/team' },
  { label: 'Schedule',        icon: Calendar,        to: '/manager/schedule',        divider: true, dividerLabel: 'SHARED' },
  { label: 'Reports',         icon: BarChart3,       to: '/manager/reports' },
  { label: 'Templates',       icon: LayoutTemplate,  to: '/manager/templates' },
  { label: 'Resume Analyzer', icon: ScanSearch,      to: '/manager/resume-analyzer' },
]

const IV_TABS = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/interviewer/dashboard' },
  { label: 'Live Room', icon: Video,           to: '#' },
  { label: 'Scorecard', icon: CheckSquare,     to: '#' },
]

function SubTabs({ role }) {
  const location  = useLocation()
  const navigate  = useNavigate()
  const tabs = role === 'manager' ? MANAGER_TABS : IV_TABS

  return (
    <div style={{
      background: '#0F172A',
      display: 'flex', alignItems: 'center',
      paddingLeft: 200,
      position: 'sticky', top: 38, zIndex: 99,
      borderBottom: '1px solid #1E293B', flexShrink: 0,
    }}>
      {tabs.map((t, i) => {
        const active = t.to !== '#' && (location.pathname === t.to || (t.to !== '/manager/dashboard' && location.pathname.startsWith(t.to)))
        return (
          <span key={t.to + t.label} style={{ display: 'inline-flex', alignItems: 'center' }}>
            {t.divider && (
              <>
                <span style={{ width: 1, height: 16, background: '#1E293B', margin: '0 4px' }} />
                <span style={{ fontSize: 10, color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 8px' }}>{t.dividerLabel}</span>
              </>
            )}
            <button
              onClick={() => t.to !== '#' && navigate(t.to)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 14px',
                border: 0, background: 'transparent',
                color: active ? '#FFF' : '#64748B',
                fontWeight: active ? 600 : 500,
                fontSize: 12.5,
                fontFamily: 'inherit', cursor: t.to !== '#' ? 'pointer' : 'default',
                borderBottom: active ? '2px solid #5B4FE9' : '2px solid transparent',
                transition: 'all 120ms', whiteSpace: 'nowrap',
                opacity: t.to === '#' ? 0.4 : 1,
              }}
              onMouseEnter={e => { if (!active && t.to !== '#') e.currentTarget.style.color = '#CBD5E1' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#64748B' }}
            >
              <t.icon size={13} />
              {t.label}
            </button>
          </span>
        )
      })}
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
      <SubTabs role={role} />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar role={role} onLogout={handleLogout} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <TopBar title={title} subtitle={subtitle} />

          <main style={{ flex: 1, padding: '24px 28px', background: '#F8FAFC', overflowY: 'auto' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export default AppLayout
