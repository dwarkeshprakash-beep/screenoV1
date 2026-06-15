import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import CandidateLayout from './components/layout/CandidateLayout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/manager/DashboardPage'
import TeamPage from './pages/manager/TeamPage'
import MemberProfilePage from './pages/manager/MemberProfilePage'
import SchedulePage from './pages/manager/SchedulePage'
import ReportsPage from './pages/manager/ReportsPage'
import ManagerProfilePage from './pages/manager/ManagerProfilePage'
import ResumeAnalyzerPage from './pages/manager/ResumeAnalyzerPage'
import MonthlyAssessmentPage from './pages/manager/MonthlyAssessmentPage'
import MonthlyAssessmentPlanPage from './pages/manager/MonthlyAssessmentPlanPage'
import ClientInterviewsPage from './pages/manager/ClientInterviewsPage'
import InterviewLandingPage from './pages/candidate/InterviewLandingPage'
import DeviceCheckPage from './pages/candidate/DeviceCheckPage'
import ConsentPage from './pages/candidate/ConsentPage'
import AIInterviewPage from './pages/candidate/AIInterviewPage'
import ExamPage from './pages/candidate/ExamPage'
import DonePage from './pages/candidate/DonePage'
import CandidateDashboardPage from './pages/candidate/CandidateDashboardPage'

function RequireAuth({ children, role }) {
  const token = localStorage.getItem('accessToken')
  if (!token) return <Navigate to="/login" replace />

  if (role) {
    const storedRole = (() => {
      try {
        return JSON.parse(localStorage.getItem('user') || '{}').role || null
      } catch {
        return null
      }
    })()
    if (storedRole !== role) return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/manager"
        element={<RequireAuth role="manager"><AppLayout role="manager" /></RequireAuth>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="team/:id" element={<MemberProfilePage />} />
        <Route path="monthly" element={<MonthlyAssessmentPage />} />
        <Route path="monthly/plan" element={<MonthlyAssessmentPlanPage />} />
        <Route path="clients" element={<ClientInterviewsPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="resume-analyzer" element={<ResumeAnalyzerPage />} />
        <Route path="profile" element={<ManagerProfilePage />} />
      </Route>

      <Route
        path="/candidate"
        element={<RequireAuth role="candidate"><CandidateLayout /></RequireAuth>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CandidateDashboardPage />} />
      </Route>

      <Route path="/interview/:token" element={<CandidateLayout />}>
        <Route index element={<InterviewLandingPage />} />
        <Route path="device-check" element={<DeviceCheckPage />} />
        <Route path="consent" element={<ConsentPage />} />
        <Route path="ai" element={<AIInterviewPage />} />
        <Route path="exam" element={<ExamPage />} />
        <Route path="done" element={<DonePage />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
