import { Outlet, useLocation, useParams } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

const PAGE_TITLES = {
  '/manager/dashboard':          { title: 'Team Overview',    subtitle: 'Your team at a glance' },
  '/manager/team':               { title: 'My Team',          subtitle: 'Manage team members' },
  '/manager/schedule':           { title: 'Schedule',         subtitle: 'Upcoming interviews and sessions' },
  '/manager/reports':            { title: 'Reports',          subtitle: 'Analytics and insights' },
  '/manager/templates':          { title: 'Templates',        subtitle: 'Interview and exam templates' },
  '/manager/profile':            { title: 'My Profile',       subtitle: 'Account settings' },
  '/interviewer/dashboard':      { title: 'My Dashboard',     subtitle: 'Upcoming interviews' },
}

function getPageInfo(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith('/manager/team/')) return { title: 'Member Profile', subtitle: 'Team member details' }
  return { title: '', subtitle: '' }
}

function AppLayout({ role = 'manager' }) {
  const location = useLocation()
  const { title, subtitle } = getPageInfo(location.pathname)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar role={role} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar title={title} subtitle={subtitle} />

        <main style={{
          flex: 1,
          padding: '24px 28px',
          background: '#F8FAFC',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
