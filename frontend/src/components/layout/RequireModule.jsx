// RequireModule - blocks direct navigation (typed URL, bookmark, back-button) into a
// page whose module the user has no permission on. Mirrors Sidebar's nav filtering so
// a hidden link and a typed URL behave the same way. This is a UX guard only - the
// backend's requireModule()/requirePortal() (middleware/access.js) is what actually
// enforces it; this never substitutes for that.
import { Navigate } from 'react-router-dom'
import Spinner from '../shared/Spinner'
import { useAccess } from '../../context/AccessContext'

function RequireModule({ moduleKey, redirectTo, children }) {
  const { hasModule, loading } = useAccess()
  if (loading) return <Spinner center />
  if (!hasModule(moduleKey)) return <Navigate to={redirectTo} replace />
  return children
}

export default RequireModule
