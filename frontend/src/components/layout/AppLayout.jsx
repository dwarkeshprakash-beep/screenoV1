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
  '/workspace/system/dashboard':   { title: 'Admin Dashboard',     subtitle: 'System-wide overview and controls' },
  '/workspace/system/broken-states': { title: 'Broken States',    subtitle: 'Detect and resolve inconsistent data' },
  '/workspace/organizations':      { title: 'Organizations',       subtitle: 'Manage tenant organizations' },
  '/workspace/roles':              { title: 'Roles',               subtitle: 'Manage the role catalog for each organization' },
  '/workspace/users':              { title: 'Users',               subtitle: 'Create users and manage their role assignments' },
  '/workspace/modules':            { title: 'Modules',             subtitle: 'The fixed catalog of gate-able feature areas' },
  '/workspace/acls':               { title: 'ACLs',                subtitle: 'Each ACL gates one module for the selected organization' },
  '/workspace/permissions':        { title: 'Permissions',         subtitle: 'The global catalog of actions an ACL can grant to a role' },
}

function getPageMeta(pathname) {
  if (PAGE_META[pathname]) return PAGE_META[pathname]
  if (pathname.startsWith('/workspace/team/')) return { title: 'Member Profile', subtitle: 'Team member details and history' }
  if (pathname.startsWith('/workspace/organization/')) return { title: 'Organization Profile', subtitle: 'Organization user details and history' }
  if (pathname.startsWith('/workspace/organizations/')) return { title: 'Organization Details', subtitle: 'Organization usage summary' }
  if (pathname.startsWith('/workspace/roles/')) return { title: 'Role Details', subtitle: 'Role permissions and assigned users' }
  if (pathname.startsWith('/workspace/users/')) return { title: 'User Details', subtitle: 'User profile and access' }
  if (pathname.startsWith('/workspace/acls/')) return { title: 'ACL Details', subtitle: 'ACL permissions and role grants' }
  if (pathname.startsWith('/workspace/permissions/')) return { title: 'Permission Details', subtitle: 'Roles granted this permission' }
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
// One shell for everyone now - no portal/admin split. The Sidebar footer shows the
// signed-in user's actual role name(s) instead.
function RoleBar({ onLogout, onLogoClick }) {
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
function AppLayout() {
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
    navigate('/workspace/dashboard')
  }

  return (
    <AccessProvider>
      <div className="app-shell">
        <RoleBar onLogout={handleLogout} onLogoClick={handleLogoClick} />

        <div className="app-shell__body">
          <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
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
              role="workspace"
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
