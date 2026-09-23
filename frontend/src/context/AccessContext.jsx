// AccessContext - fetches the logged-in user's module/permission grants once per
// session and exposes them to the Sidebar (hide nav items) and RequireModule route
// guards (block direct navigation). This is a UX layer only - the real enforcement
// is requireModule() on the backend routes (see middleware/access.js); hiding a
// link here never substitutes for that.
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import * as api from '../services/api'

const AccessContext = createContext(null)

// A transient failure (network blip, 5xx, refresh hiccup) must not look like "this
// user has no modules" - that collapses the sidebar to just Overview. Retry a couple
// of times before giving up; auth failures (401/403) are final and not retried.
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 800

function isRetryable(err) {
  return err?.statusCode !== 401 && err?.statusCode !== 403
}

function AccessProvider({ children }) {
  const [access, setAccess] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const res = await api.getMyAccess()
        setAccess(res.data || null)
        setLoading(false)
        return
      } catch (err) {
        if (attempt === MAX_ATTEMPTS || !isRetryable(err)) {
          setAccess(null)
          setError(err?.message || 'Could not load your access')
          setLoading(false)
          return
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt))
      }
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
    <AccessContext.Provider value={{ access, loading, error, hasModule, reload: load }}>
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
