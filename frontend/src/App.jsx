// frontend/src/App.jsx
// Root router — all routes for manager, candidate, and interviewer flows.

import { Routes, Route, Navigate } from 'react-router-dom'

// Layouts
import AppLayout from './components/layout/AppLayout'
import CandidateLayout from './components/layout/CandidateLayout'

// Auth
import LoginPage from './pages/auth/LoginPage'

// Manager pages
import DashboardPage from './pages/manager/DashboardPage'
import TeamPage from './pages/manager/TeamPage'
import MemberProfilePage from './pages/manager/MemberProfilePage'
import SchedulePage from './pages/manager/SchedulePage'
import ReportsPage from './pages/manager/ReportsPage'
import TemplatesPage from './pages/manager/TemplatesPage'
import ManagerProfilePage from './pages/manager/ManagerProfilePage'

// Candidate pages
import InterviewLandingPage from './pages/candidate/InterviewLandingPage'
import DeviceCheckPage from './pages/candidate/DeviceCheckPage'
import ConsentPage from './pages/candidate/ConsentPage'
import AIInterviewPage from './pages/candidate/AIInterviewPage'
import ExamPage from './pages/candidate/ExamPage'
import DonePage from './pages/candidate/DonePage'
import CandidateDashboardPage from './pages/candidate/CandidateDashboardPage'

// Interviewer pages
import InterviewerDashboard from './pages/interviewer/InterviewerDashboard'
import LiveRoomPage from './pages/interviewer/LiveRoomPage'
import ScorecardPage from './pages/interviewer/ScorecardPage'

// ── Guard: redirect to /login if no token ────────────────────
function RequireAuth({ children, role }) {
  const token = localStorage.getItem('accessToken')
  if (!token) return <Navigate to="/login" replace />

  if (role) {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      if (user.role && user.role !== role) return <Navigate to="/login" replace />
    } catch {
      return <Navigate to="/login" replace />
    }
  }

  return children
}

// ── App routes ───────────────────────────────────────────────
function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Manager — sidebar layout, auth required */}
      <Route
        path="/manager"
        element={<RequireAuth role="manager"><AppLayout role="manager" /></RequireAuth>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"    element={<DashboardPage />} />
        <Route path="team"         element={<TeamPage />} />
        <Route path="team/:id"     element={<MemberProfilePage />} />
        <Route path="schedule"     element={<SchedulePage />} />
        <Route path="reports"      element={<ReportsPage />} />
        <Route path="templates"    element={<TemplatesPage />} />
        <Route path="profile"      element={<ManagerProfilePage />} />
      </Route>

      {/* Candidate dashboard (logged-in candidates) */}
      <Route
        path="/candidate/dashboard"
        element={<RequireAuth role="candidate"><CandidateDashboardPage /></RequireAuth>}
      />

      {/* Interviewer — sidebar layout, auth required */}
      <Route
        path="/interviewer"
        element={<RequireAuth role="interviewer"><AppLayout role="interviewer" /></RequireAuth>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"        element={<InterviewerDashboard />} />
        <Route path="scorecard/:id"    element={<ScorecardPage />} />
      </Route>

      {/* Interviewer live room — full screen, no sidebar */}
      <Route
        path="/interviewer/live/:id"
        element={<RequireAuth role="interviewer"><LiveRoomPage /></RequireAuth>}
      />

      {/* Candidate interview flow — no auth needed (magic link validates on landing) */}
      <Route path="/interview/:token" element={<CandidateLayout />}>
        <Route index                   element={<InterviewLandingPage />} />
        <Route path="device-check"     element={<DeviceCheckPage />} />
        <Route path="consent"          element={<ConsentPage />} />
        <Route path="ai"               element={<AIInterviewPage />} />
        <Route path="exam"             element={<ExamPage />} />
        <Route path="done"             element={<DonePage />} />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
