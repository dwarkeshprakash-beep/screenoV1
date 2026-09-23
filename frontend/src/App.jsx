import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import CandidateLayout from './components/layout/CandidateLayout'
import RequireModule from './components/layout/RequireModule'
import Spinner from './components/shared/Spinner'

const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const DashboardPage = lazy(() => import('./pages/manager/DashboardPage'))
const TeamPage = lazy(() => import('./pages/manager/TeamPage'))
const MemberProfilePage = lazy(() => import('./pages/manager/MemberProfilePage'))
const SchedulePage = lazy(() => import('./pages/manager/SchedulePage'))
const ReportsPage = lazy(() => import('./pages/manager/ReportsPage'))
const ProfilePage = lazy(() => import('./pages/workspace/ProfilePage'))
const ResumeAnalyzerPage = lazy(() => import('./pages/manager/ResumeAnalyzerPage'))
const MonthlyAssessmentPage = lazy(() => import('./pages/manager/MonthlyAssessmentPage'))
const ClientInterviewsPage = lazy(() => import('./pages/manager/ClientInterviewsPage'))
const InterviewsPage = lazy(() => import('./pages/workspace/InterviewsPage'))
const FeedbackPage = lazy(() => import('./pages/workspace/FeedbackPage'))
const ClientOutcomesPage = lazy(() => import('./pages/workspace/ClientOutcomesPage'))
const InterviewLandingPage = lazy(() => import('./pages/candidate/InterviewLandingPage'))
const DeviceCheckPage = lazy(() => import('./pages/candidate/DeviceCheckPage'))
const ConsentPage = lazy(() => import('./pages/candidate/ConsentPage'))
const AIInterviewPage = lazy(() => import('./pages/candidate/AIInterviewPage'))
const ExamPage = lazy(() => import('./pages/candidate/ExamPage'))
const DonePage = lazy(() => import('./pages/candidate/DonePage'))

// Admin Pages
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminMandatesPage = lazy(() => import('./pages/admin/AdminMandatesPage'))
const AdminInterviewsPage = lazy(() => import('./pages/admin/AdminInterviewsPage'))
const AdminBrokenStatesPage = lazy(() => import('./pages/admin/AdminBrokenStatesPage'))
const AdminRolesPage = lazy(() => import('./pages/admin/AdminRolesPage'))
const RoleDetailPage = lazy(() => import('./pages/admin/RoleDetailPage'))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'))
const UserDetailPage = lazy(() => import('./pages/admin/UserDetailPage'))
const AdminModulesPage = lazy(() => import('./pages/admin/AdminModulesPage'))
const AdminAclsPage = lazy(() => import('./pages/admin/AdminAclsPage'))
const AclDetailPage = lazy(() => import('./pages/admin/AclDetailPage'))
const AdminPermissionsPage = lazy(() => import('./pages/admin/AdminPermissionsPage'))
const PermissionDetailPage = lazy(() => import('./pages/admin/PermissionDetailPage'))
const AdminOrganizationsPage = lazy(() => import('./pages/admin/AdminOrganizationsPage'))
const OrganizationDetailPage = lazy(() => import('./pages/admin/OrganizationDetailPage'))

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

// There is no portal split anymore - every non-admin user shares one app
// ('/workspace'), and what they see inside it is entirely ACL/module-driven.
// 'role' here is only ever 'admin' or 'user' (see auth.service.js#resolveUserRole) -
// just enough to pick a shell.
function roleHome(role) {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'user') return '/workspace/dashboard'
  return '/login'
}

function HomeRedirect() {
  const { token, role } = storedSession()
  return <Navigate to={token ? roleHome(role) : '/login'} replace />
}

function RequireAuth({ children, adminOnly }) {
  const { token, role: storedRole } = storedSession()
  if (!token) return <Navigate to="/login" replace />

  if (adminOnly && storedRole !== 'admin') return <Navigate to={roleHome(storedRole)} replace />
  if (!adminOnly && storedRole === 'admin') return <Navigate to={roleHome(storedRole)} replace />
  return children
}

function RedirectIfAuthed({ children }) {
  const { token, role } = storedSession()
  if (token && roleHome(role) !== '/login') return <Navigate to={roleHome(role)} replace />
  return children
}

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<Spinner center />}>
        <Routes>
          <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />

          <Route
            path="/workspace"
            element={<RequireAuth><AppLayout role="workspace" /></RequireAuth>}
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="team" element={<RequireModule moduleKey="team" redirectTo="/workspace/profile"><TeamPage /></RequireModule>} />
            <Route path="team/:id" element={<RequireModule moduleKey="team" redirectTo="/workspace/profile"><MemberProfilePage /></RequireModule>} />
            <Route path="organization/:userId" element={<RequireModule moduleKey="team" redirectTo="/workspace/profile"><MemberProfilePage /></RequireModule>} />
            <Route path="monthly" element={<RequireModule moduleKey="monthly_assessments" redirectTo="/workspace/profile"><MonthlyAssessmentPage /></RequireModule>} />
            <Route path="monthly/plan" element={<Navigate to="/workspace/monthly" replace />} />
            <Route path="clients" element={<RequireModule moduleKey="client_mandates" redirectTo="/workspace/profile"><ClientInterviewsPage /></RequireModule>} />
            <Route path="clients/:mandateId" element={<RequireModule moduleKey="client_mandates" redirectTo="/workspace/profile"><ClientInterviewsPage /></RequireModule>} />
            <Route path="schedule" element={<RequireModule moduleKey="schedule" redirectTo="/workspace/profile"><SchedulePage /></RequireModule>} />
            <Route path="reports" element={<RequireModule moduleKey="reports" redirectTo="/workspace/profile"><ReportsPage /></RequireModule>} />
            <Route path="interviews" element={<RequireModule moduleKey="interviews" redirectTo="/workspace/profile"><InterviewsPage /></RequireModule>} />
            <Route path="feedback" element={<RequireModule moduleKey="feedback" redirectTo="/workspace/profile"><FeedbackPage /></RequireModule>} />
            <Route path="outcomes" element={<RequireModule moduleKey="outcomes" redirectTo="/workspace/profile"><ClientOutcomesPage /></RequireModule>} />
            <Route path="resume-analyzer" element={<RequireModule moduleKey="resume_analyzer" redirectTo="/workspace/profile"><ResumeAnalyzerPage /></RequireModule>} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route
            path="/admin"
            element={<RequireAuth adminOnly><AppLayout role="admin" /></RequireAuth>}
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="mandates" element={<AdminMandatesPage />} />
            <Route path="interviews" element={<AdminInterviewsPage />} />
            <Route path="broken-states" element={<AdminBrokenStatesPage />} />
            <Route path="organizations" element={<AdminOrganizationsPage />} />
            <Route path="organizations/:id" element={<OrganizationDetailPage />} />
            <Route path="roles" element={<AdminRolesPage />} />
            <Route path="roles/:id" element={<RoleDetailPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="users/:id" element={<UserDetailPage />} />
            <Route path="modules" element={<AdminModulesPage />} />
            <Route path="acls" element={<AdminAclsPage />} />
            <Route path="acls/:id" element={<AclDetailPage />} />
            <Route path="permissions" element={<AdminPermissionsPage />} />
            <Route path="permissions/:id" element={<PermissionDetailPage />} />
            <Route path="profile" element={<ProfilePage />} />
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
