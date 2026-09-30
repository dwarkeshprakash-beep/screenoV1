// useAccess - reads the logged-in user's module/permission grants from AccessProvider.
// Returns { access, loading, error, hasModule, reload }. Must be used under AccessProvider.
import { useContext } from 'react'
import { AccessContext } from '../context/access-context'

export function useAccess() {
  const ctx = useContext(AccessContext)
  if (!ctx) throw new Error('useAccess must be used within an AccessProvider')
  return ctx
}
