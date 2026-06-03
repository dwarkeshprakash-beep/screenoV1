// AppLayout — two-column shell: sidebar left, page content right.
// Used by all manager and interviewer pages.

import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

// Map URL paths to readable page titles shown in the TopBar
const PAGE_TITLES = {
  '/manager/dashboard':  'Dashboard',
  '/manager/team':       'Team',
  '/manager/schedule':   'Schedule',
  '/manager/reports':    'Reports',
  '/manager/templates':  'Templates',
  '/interviewer/dashboard': 'Dashboard',
}

/**
 * @param {string} role - 'manager' or 'interviewer'
 */
function AppLayout({ role = 'manager' }) {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || ''

  // Read user info from localStorage (set by auth on login)
  let user = {}
  try {
    const stored = localStorage.getItem('user')
    if (stored) user = JSON.parse(stored)
  } catch {
    // ignore parse error
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar role={role} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title={title} user={user} />

        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '28px',
          background: 'var(--bg-page)',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
