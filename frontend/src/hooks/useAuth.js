// hooks/useAuth.js
// Read the current user from localStorage (set by LoginPage after successful login).
// Returns null if not authenticated.

import { useState, useEffect } from 'react'

/**
 * @returns {{ user: Object|null, isAuthenticated: boolean }}
 */
function useAuth() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    try {
      const token = localStorage.getItem('accessToken')
      const stored = localStorage.getItem('user')
      if (token && stored) {
        setUser(JSON.parse(stored))
      }
    } catch {
      // ignore parse error — treat as unauthenticated
    }
  }, [])

  return {
    user,
    isAuthenticated: user !== null,
  }
}

export default useAuth
