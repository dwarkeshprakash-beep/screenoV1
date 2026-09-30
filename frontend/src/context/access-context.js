// access-context - the bare React context object shared by AccessProvider
// (context/AccessContext.jsx) and the useAccess hook (hooks/useAccess.js).
// Kept in its own non-component module so Vite fast refresh works on both.
import { createContext } from 'react'

export const AccessContext = createContext(null)
