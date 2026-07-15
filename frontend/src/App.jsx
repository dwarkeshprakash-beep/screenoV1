import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
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
const ManagerInterviewerPage = lazy(() => import('./pages/manager/ManagerInterviewerPage'))
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
const CandidateFeedbackPage = lazy(() => import('./pages/candidate/CandidateFeedbackPage'))
const CandidateClientOutcomesPage = lazy(() => import('./pages/candidate/CandidateClientOutcomesPage'))

// Admin Pages
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminMandatesPage = lazy(() => import('./pages/admin/AdminMandatesPage'))
const AdminInterviewsPage = lazy(() => import('./pages/admin/AdminInterviewsPage'))
const AdminBrokenStatesPage = lazy(() => import('./pages/admin/AdminBrokenStatesPage'))

function AuthProvider({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  
  useEffect(() => {
    const channel = new BroadcastChannel('auth_channel')
    
    const handleAuthExpired = () => {
      if (location.pathname !== '/login' && !location.pathname.startsWith('/interview/')) {
        navigate('/login', { replace: true })
      }
    }
    
    channel.onmessage = (event) => {
      if (event.data === 'auth_expired' || event.data === 'logout') {
        handleAuthExpired()
      } else if (event.data === 'login') {
        if (location.pathname === '/login') {
          navigate('/', { replace: true })
        }
      }
    }
    
    const onAuthExpired = () => {
      channel.postMessage('auth_expired')
      handleAuthExpired()
    }
    
    const onUserLogin = () => channel.postMessage('login')
    const onUserLogout = () => {
      channel.postMessage('logout')
      handleAuthExpired()
    }
    
    window.addEventListener('auth_expired', onAuthExpired)
    window.addEventListener('user_login', onUserLogin)
    window.addEventListener('user_logout', onUserLogout)
    
    return () => {
      channel.close()
      window.removeEventListener('auth_expired', onAuthExpired)
      window.removeEventListener('user_login', onUserLogin)
      window.removeEventListener('user_logout', onUserLogout)
    }
  }, [navigate, location.pathname])
  
  return children
}

function storedSession() {
  const token = localStorage.getItem('accessToken')
  try {
    const role = JSON.parse(localStorage.getItem('user') || '{}').role || null
    return { token, role }
  } catch {
    return { token, role: null }
  }
}

function roleHome(role) {
  if (role === 'manager') return '/manager/dashboard'
  if (role === 'candidate') return '/candidate/overview'
  if (role === 'admin') return '/admin/dashboard'
  return '/login'
}

function HomeRedirect() {
  const { token, role } = storedSession()
  return <Navigate to={token ? roleHome(role) : '/login'} replace />
}

function RequireAuth({ children, role }) {
  const { token, role: storedRole } = storedSession()
  if (!token) return <Navigate to="/login" replace />

  if (role && storedRole !== role) return <Navigate to={roleHome(storedRole)} replace />
  return children
}

function App() {
  return (
    <AuthProvider>
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
            <Route path="organization/:userId" element={<MemberProfilePage />} />
            <Route path="monthly" element={<MonthlyAssessmentPage />} />
            <Route path="monthly/plan" element={<Navigate to="/manager/monthly" replace />} />
            <Route path="clients" element={<ClientInterviewsPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="interviewer" element={<ManagerInterviewerPage />} />
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
              <Route path="feedback"   element={<CandidateFeedbackPage />} />
              <Route path="mandates"   element={<CandidateMandatesPage />} />
              <Route path="outcomes"   element={<CandidateClientOutcomesPage />} />
              <Route path="profile"    element={<CandidateProfilePage />} />
            </Route>
          </Route>

          <Route
            path="/admin"
            element={<RequireAuth role="admin"><AppLayout role="admin" /></RequireAuth>}
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="mandates" element={<AdminMandatesPage />} />
            <Route path="interviews" element={<AdminInterviewsPage />} />
            <Route path="broken-states" element={<AdminBrokenStatesPage />} />
          </Route>

          <Route path="/interview/:token" element={<CandidateLayout />}>
            <Route index element={<InterviewLandingPage />} />
            <Route path="device-check" element={<DeviceCheckPage />} />
            <Route path="consent" element={<ConsentPage />} />
            <Route path="ai" element={<AIInterviewPage />} />
            <Route path="exam" element={<ExamPage />} />
            <Route path="done" element={<DonePage />} />
          </Route>

          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}

export default App
