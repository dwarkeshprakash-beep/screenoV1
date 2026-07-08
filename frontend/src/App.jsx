import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import CandidateLayout from './components/layout/CandidateLayout'
import CandidateDashboardLayout from './components/layout/CandidateDashboardLayout'
import Spinner from './components/shared/Spinner'

const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const DashboardPage = lazy(() => import('./pages/manager/DashboardPage'))
const TeamPage = lazy(() => import('./pages/manager/TeamPage'))
const MemberProfilePage = lazy(() => import('./pages/manager/MemberProfilePage'))
const SchedulePage = lazy(() => import('./pages/manager/SchedulePage'))
const ReportsPage = lazy(() => import('./pages/manager/ReportsPage'))
const ManagerProfilePage = lazy(() => import('./pages/manager/ManagerProfilePage'))
const ResumeAnalyzerPage = lazy(() => import('./pages/manager/ResumeAnalyzerPage'))
const MonthlyAssessmentPage = lazy(() => import('./pages/manager/MonthlyAssessmentPage'))
const ClientInterviewsPage = lazy(() => import('./pages/manager/ClientInterviewsPage'))
const InterviewLandingPage = lazy(() => import('./pages/candidate/InterviewLandingPage'))
const DeviceCheckPage = lazy(() => import('./pages/candidate/DeviceCheckPage'))
const ConsentPage = lazy(() => import('./pages/candidate/ConsentPage'))
const AIInterviewPage = lazy(() => import('./pages/candidate/AIInterviewPage'))
const ExamPage = lazy(() => import('./pages/candidate/ExamPage'))
const DonePage = lazy(() => import('./pages/candidate/DonePage'))
const CandidateOverviewPage = lazy(() => import('./pages/candidate/CandidateOverviewPage'))
const CandidateInterviewsPage = lazy(() => import('./pages/candidate/CandidateInterviewsPage'))
const CandidateProfilePage = lazy(() => import('./pages/candidate/CandidateProfilePage'))
const CandidateMandatesPage = lazy(() => import('./pages/candidate/CandidateMandatesPage'))
const CandidateMonthlyPage = lazy(() => import('./pages/candidate/CandidateMonthlyPage'))

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
    <Suspense fallback={<Spinner center />}>
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
        <Route path="monthly/plan" element={<Navigate to="/manager/monthly" replace />} />
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
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="dashboard" element={<Navigate to="/candidate/overview" replace />} />
        <Route element={<CandidateDashboardLayout />}>
          <Route path="overview"   element={<CandidateOverviewPage />} />
          <Route path="interviews" element={<CandidateInterviewsPage />} />
          <Route path="monthly"    element={<CandidateMonthlyPage />} />
          <Route path="mandates"   element={<CandidateMandatesPage />} />
          <Route path="profile"    element={<CandidateProfilePage />} />
        </Route>
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
    </Suspense>
  )
}

export default App
