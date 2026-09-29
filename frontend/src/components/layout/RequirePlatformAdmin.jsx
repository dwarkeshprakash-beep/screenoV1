// RequirePlatformAdmin - blocks direct navigation into a page that stays
// platform-wide only (Modules/Permissions catalogs, system-repair tools, the
// Organizations list) and was never made delegable via a module grant. Mirrors
// RequireModule's shape but checks access.isPlatformAdmin instead of a module -
// this is a UX guard only, the backend's requirePlatformAdmin() is what enforces it.
import { Navigate } from 'react-router-dom'
import Spinner from '../shared/Spinner'
import { useAccess } from '../../hooks/useAccess'

function RequirePlatformAdmin({ redirectTo, children }) {
  const { access, loading } = useAccess()
  if (loading) return <Spinner center />
  if (!access?.isPlatformAdmin) return <Navigate to={redirectTo} replace />
  return children
}

export default RequirePlatformAdmin
