import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Home, Calendar, BriefcaseBusiness, User, BookOpen, Lightbulb, Award, Menu, X } from 'lucide-react'

const TABS = [
  { to: '/candidate/overview',   label: 'Overview',   icon: Home },
  { to: '/candidate/interviews', label: 'Interviews', icon: Calendar },
  { to: '/candidate/monthly',    label: 'Monthly',    icon: BookOpen },
  { to: '/candidate/feedback',   label: 'Feedback',   icon: Lightbulb },
  { to: '/candidate/mandates',   label: 'Mandates',   icon: BriefcaseBusiness },
  { to: '/candidate/outcomes',   label: 'Outcomes',   icon: Award },
  { to: '/candidate/profile',    label: 'Profile',    icon: User },
]

function CandidateDashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setMenuOpen(false), [location.pathname])

  return (
    <div className="candidate-dashboard-shell">
      <div className="candidate-dashboard-nav-shell">
        <button
          type="button"
          className="candidate-dashboard-menu-button"
          aria-expanded={menuOpen}
          aria-controls="candidate-dashboard-navigation"
          onClick={() => setMenuOpen(current => !current)}
        >
          {menuOpen ? <X size={17} /> : <Menu size={17} />}
          Menu
        </button>
        <nav id="candidate-dashboard-navigation" className={`candidate-dashboard-nav${menuOpen ? ' is-open' : ''}`}>
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `candidate-dashboard-nav__link${isActive ? ' is-active' : ''}`}>
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="candidate-dashboard-content">
        <Outlet />
      </div>
    </div>
  )
}

export default CandidateDashboardLayout
