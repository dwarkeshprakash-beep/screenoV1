// AccessContext - fetches the logged-in user's module/permission grants once per
// session and exposes them to the Sidebar (hide nav items) and RequireModule route
// guards (block direct navigation). This is a UX layer only - the real enforcement
// is requireModule()/requirePortal() on the backend routes (see middleware/access.js);
// hiding a link here never substitutes for that.
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import * as api from '../services/api'

const AccessContext = createContext(null)

function AccessProvider({ children }) {
  const [access, setAccess] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getMyAccess()
      setAccess(res.data || null)
    } catch {
      setAccess(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function hasModule(moduleKey, permission) {
    if (!access) return false
    if (access.isPlatformAdmin) return true
    const granted = access.modules?.[moduleKey]
    if (!granted) return false
    return permission ? granted.includes(permission) : granted.length > 0
  }

  return (
    <AccessContext.Provider value={{ access, loading, hasModule, reload: load }}>
      {children}
    </AccessContext.Provider>
  )
}

function useAccess() {
  const ctx = useContext(AccessContext)
  if (!ctx) throw new Error('useAccess must be used within an AccessProvider')
  return ctx
}

export { AccessProvider, useAccess }
