import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import * as api from '../../services/api'
import { LogOut } from 'lucide-react'
import { APP_NAME } from '../../config/app.config'
import { AccessProvider } from '../../context/AccessContext'

// ── Page meta ─────────────────────────────────────────────────
const PAGE_META = {
  '/workspace/dashboard':        { title: 'Team Overview',      subtitle: 'Your team at a glance' },
  '/workspace/team':             { title: 'My Team',            subtitle: 'Manage team members and assessments' },
  '/workspace/monthly':          { title: 'Monthly Assessment', subtitle: 'Subjects, assignments, and yearly view' },
  '/workspace/clients':          { title: 'Client Mandates',    subtitle: 'Create and manage client mandates' },
  '/workspace/schedule':         { title: 'Schedule',           subtitle: 'Upcoming interviews and sessions' },
  '/workspace/reports':          { title: 'Reports',            subtitle: 'Analytics and candidate insights' },
  '/workspace/resume-analyzer':  { title: 'Resume Analyzer',   subtitle: 'JD-match scoring and keyword gap analysis' },
  '/workspace/interviews':       { title: 'Interviews',         subtitle: 'Your interviews and interviews assigned for you to conduct' },
  '/workspace/feedback':         { title: 'Feedback',           subtitle: 'Improvement tips from your completed assessments' },
  '/workspace/outcomes':         { title: 'Client Outcomes',    subtitle: 'Interview round results for your client mandates' },
  '/workspace/profile':          { title: 'My Profile',         subtitle: 'Account and notification settings' },
  '/workspace/interview-complete': { title: 'Assessment submitted', subtitle: 'Your responses were saved' },
  '/admin/dashboard':          { title: 'Admin Dashboard',     subtitle: 'System-wide overview and controls' },
  '/admin/mandates':           { title: 'Admin Mandates',      subtitle: 'Inspect and repair client mandates' },
  '/admin/interviews':         { title: 'Admin Interviews',    subtitle: 'Inspect and repair interview states' },
  '/admin/broken-states':      { title: 'Broken States',       subtitle: 'Detect and resolve inconsistent data' },
  '/admin/organizations':      { title: 'Organizations',       subtitle: 'Manage tenant organizations' },
  '/admin/roles':              { title: 'Roles',               subtitle: 'Manage the role catalog for each organization' },
  '/admin/users':              { title: 'Users',               subtitle: 'Create users and manage their role assignments' },
  '/admin/modules':            { title: 'Modules',             subtitle: 'The fixed catalog of gate-able feature areas' },
  '/admin/acls':               { title: 'ACLs',                subtitle: 'Each ACL gates one module for the selected organization' },
  '/admin/permissions':        { title: 'Permissions',         subtitle: 'The global catalog of actions an ACL can grant to a role' },
}

function getPageMeta(pathname) {
  if (PAGE_META[pathname]) return PAGE_META[pathname]
  if (pathname.startsWith('/workspace/team/')) return { title: 'Member Profile', subtitle: 'Team member details and history' }
  if (pathname.startsWith('/workspace/organization/')) return { title: 'Organization Profile', subtitle: 'Organization user details and history' }
  return { title: '', subtitle: '' }
}

// ── App logo mark ─────────────────────────────────────────
function LogoMark({ size = 22 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.27), background: 'linear-gradient(135deg,var(--brand-500),var(--brand-600))', display: 'inline-flex', flexShrink: 0, position: 'relative' }}>
      <div style={{ position: 'absolute', left: '23%', top: '32%', width: '54%', height: '11%', background: 'var(--bg-surface)', borderRadius: 2, opacity: 0.95 }} />
      <div style={{ position: 'absolute', left: '23%', top: '57%', width: '54%', height: '11%', background: 'var(--bg-surface)', borderRadius: 2, opacity: 0.6 }} />
    </div>
  )
}

// ── Role bar (dark strip at very top) ─────────────────────────
// No portal split anymore - this badge just names the shell (workspace vs admin),
// not the signed-in user's role. The Sidebar footer shows the user's actual role name(s).
const ROLE_LABELS = {
  workspace: 'WORKSPACE',
  admin:     'ADMIN',
}

function RoleBar({ role, onLogout, onLogoClick }) {
  return (
    <div style={{
      background: 'var(--slate-900)', height: 38,
      display: 'flex', alignItems: 'center',
      padding: '0 14px', gap: 4,
      position: 'sticky', top: 0, zIndex: 100,
      borderBottom: '1px solid var(--border-sidebar)', flexShrink: 0,
    }}>
      <div
        onClick={onLogoClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onLogoClick() }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12, cursor: 'pointer' }}
      >
        <LogoMark size={22} />
        <span style={{ color: 'var(--bg-surface)', fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>{APP_NAME}</span>
      </div>
      <div style={{ width: 1, height: 18, background: 'var(--border-sidebar)', margin: '0 8px' }} />
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pageMetaOverride, setPageMetaOverride] = useState(null)
  const { title, subtitle } = pageMetaOverride || getPageMeta(location.pathname)
  const setPageMeta = useCallback(meta => setPageMetaOverride(meta), [])

  useEffect(() => {
    setSidebarOpen(false)
    setPageMetaOverride(null)
  }, [location.pathname])

  function handleLogout() {
    api.logout().catch(() => {})
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    window.dispatchEvent(new Event('user_logout'))
    navigate('/login')
  }

  function handleLogoClick() {
    if (role === 'admin') return navigate('/admin/dashboard')
    if (role === 'workspace') return navigate('/workspace/dashboard')
    navigate(`/${role}/dashboard`)
  }

  return (
    <AccessProvider>
      <div className="app-shell">
        <RoleBar role={role} onLogout={handleLogout} onLogoClick={handleLogoClick} />

        <div className="app-shell__body">
          <Sidebar role={role} open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
          {sidebarOpen && (
            <button
              type="button"
              className="mobile-sidebar-scrim"
              aria-label="Close navigation"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <div className="app-shell__content">
            <TopBar
              title={title}
              subtitle={subtitle}
              role={role}
              onMenuClick={() => setSidebarOpen(current => !current)}
            />

            <main className="app-main">
              <Outlet context={{ setPageMeta }} />
            </main>
          </div>
        </div>
      </div>
    </AccessProvider>
  )
}

export default AppLayout
