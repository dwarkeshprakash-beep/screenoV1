// backend/src/middleware/access.js
// Replaces middleware/role.js. Authorization is resolved fresh from the RBAC tables
// on every request via access.service - never trusted from the JWT - so a revoked
// role or permission takes effect immediately, not just after the token expires.
// Usage: router.use(authMiddleware, loadAccess, requirePlatformAdmin | requireModule('team'))

const accessService = require('../services/access.service')

// Must run immediately after authMiddleware. Attaches req.access for every guard below.
async function loadAccess(req, res, next) {
  try {
    req.access = await accessService.getUserAccessContext(req.user.id)
    next()
  } catch (err) {
    console.error('loadAccess failed:', err.message)
    // Only a genuinely deleted user is an auth failure - a transient DB/pool error
    // must surface as retryable, not force the frontend to clear the session and
    // log the user out over what might just be a brief connectivity blip.
    if (err.message === 'User not found') {
      return res.status(401).json({ success: false, error: 'Not authenticated' })
    }
    res.status(500).json({ success: false, error: 'Could not resolve access' })
  }
}

function requirePlatformAdmin(req, res, next) {
  if (!req.access?.isPlatformAdmin) {
    return res.status(403).json({ success: false, error: 'Not authorized' })
  }
  next()
}

const METHOD_PERMISSION = { GET: 'View', POST: 'Save', PATCH: 'Save', PUT: 'Save', DELETE: 'Delete' }

// Gates a whole module's routes by the admin-managed permission grid. The needed
// permission defaults from the HTTP method (GET -> View, POST/PATCH/PUT -> Save,
// DELETE -> Delete) so router.use(...) can gate every verb in one line; pass
// { permission } to override for a route that doesn't fit that mapping.
// 'View' is special: View and View All both satisfy it (View All is the elevated,
// company-wide tier of the same "can see this" check, not a separate capability),
// so every module gates viewing the same way instead of some using a flat Read.
// moduleKey may be an array: the permission on ANY one of those modules passes (for a
// self-scoped action reachable from more than one module's page).
function requireModule(moduleKey, { permission } = {}) {
  const moduleKeys = Array.isArray(moduleKey) ? moduleKey : [moduleKey]
  return (req, res, next) => {
    const needed = permission || METHOD_PERMISSION[req.method] || 'View'
    const allowed = moduleKeys.some(key => (needed === 'View'
      ? accessService.hasAnyViewPermission(req.access, key)
      : accessService.hasModulePermission(req.access, key, needed)))
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Not authorized' })
    }
    next()
  }
}

module.exports = { loadAccess, requirePlatformAdmin, requireModule }
