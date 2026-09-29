import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import CandidateLayout from './components/layout/CandidateLayout'
import RequireModule from './components/layout/RequireModule'
import RequirePlatformAdmin from './components/layout/RequirePlatformAdmin'
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
  return { token }
}

// One shell for every signed-in account - platform admin, company sub-admin, or a
// plain workspace user. There is no portal/shell split anymore: what a user sees
// inside '/workspace' is entirely ACL/module-driven (see AccessContext/useAccess),
// down to whether they can even reach the Organizations/Roles/Users/ACLs pages.
const WORKSPACE_HOME = '/workspace/dashboard'

function HomeRedirect() {
  const { token } = storedSession()
  return <Navigate to={token ? WORKSPACE_HOME : '/login'} replace />
}

function RequireAuth({ children }) {
  const location = useLocation()
  const { token } = storedSession()
  // Remember the deep link (e.g. from an email) so login can return the user to it
  if (!token) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  return children
}

// End of an interview/exam. A signed-in workspace user gets the confirmation inside
// the normal shell (sidebar to move on); a magic-link-only candidate has no account
// to navigate, so they keep the standalone page.
function InterviewDoneRoute() {
  const { token } = storedSession()
  if (token) return <Navigate to="/workspace/interview-complete" replace />
  return <DonePage />
}

function RedirectIfAuthed({ children }) {
  const { token } = storedSession()
  if (token) return <Navigate to={WORKSPACE_HOME} replace />
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
            element={<RequireAuth><AppLayout /></RequireAuth>}
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
            <Route path="interview-complete" element={<DonePage inWorkspace />} />
            <Route path="profile" element={<ProfilePage />} />

            {/* Delegable admin: gated the same way as any other module - a company
                can grant a "sub-admin" role View/Save/Delete on just these. */}
            <Route path="organizations" element={<RequirePlatformAdmin redirectTo="/workspace/profile"><AdminOrganizationsPage /></RequirePlatformAdmin>} />
            <Route path="organizations/:id" element={<RequireModule moduleKey="organizations" redirectTo="/workspace/profile"><OrganizationDetailPage /></RequireModule>} />
            <Route path="roles" element={<RequireModule moduleKey="roles" redirectTo="/workspace/profile"><AdminRolesPage /></RequireModule>} />
            <Route path="roles/:id" element={<RequireModule moduleKey="roles" redirectTo="/workspace/profile"><RoleDetailPage /></RequireModule>} />
            <Route path="users" element={<RequireModule moduleKey="users" redirectTo="/workspace/profile"><AdminUsersPage /></RequireModule>} />
            <Route path="users/:id" element={<RequireModule moduleKey="users" redirectTo="/workspace/profile"><UserDetailPage /></RequireModule>} />
            <Route path="acls" element={<RequireModule moduleKey="acls" redirectTo="/workspace/profile"><AdminAclsPage /></RequireModule>} />
            <Route path="acls/:id" element={<RequireModule moduleKey="acls" redirectTo="/workspace/profile"><AclDetailPage /></RequireModule>} />

            {/* Platform-wide only, never delegable: the global Modules/Permissions
                catalogs and the system-repair tools. */}
            <Route path="modules" element={<RequirePlatformAdmin redirectTo="/workspace/profile"><AdminModulesPage /></RequirePlatformAdmin>} />
            <Route path="permissions" element={<RequirePlatformAdmin redirectTo="/workspace/profile"><AdminPermissionsPage /></RequirePlatformAdmin>} />
            <Route path="permissions/:id" element={<RequirePlatformAdmin redirectTo="/workspace/profile"><PermissionDetailPage /></RequirePlatformAdmin>} />
            <Route path="system/dashboard" element={<RequirePlatformAdmin redirectTo="/workspace/profile"><AdminDashboardPage /></RequirePlatformAdmin>} />
            <Route path="system/broken-states" element={<RequirePlatformAdmin redirectTo="/workspace/profile"><AdminBrokenStatesPage /></RequirePlatformAdmin>} />
          </Route>

          <Route path="/interview/:token" element={<CandidateLayout />}>
            <Route index element={<InterviewLandingPage />} />
            <Route path="device-check" element={<DeviceCheckPage />} />
            <Route path="consent" element={<ConsentPage />} />
            <Route path="ai" element={<AIInterviewPage />} />
            <Route path="exam" element={<ExamPage />} />
            <Route path="done" element={<InterviewDoneRoute />} />
          </Route>

          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}

export default App
