// backend/src/middleware/access.js
// Replaces middleware/role.js. Authorization is resolved fresh from the RBAC tables
// on every request via access.service - never trusted from the JWT - so a revoked
// role or permission takes effect immediately, not just after the token expires.
// Usage: router.use(authMiddleware, loadAccess, requirePlatformAdmin | requirePortal(...) | requireModule('team'))

const accessService = require('../services/access.service')

// Must run immediately after authMiddleware. Attaches req.access for every guard below.
async function loadAccess(req, res, next) {
  try {
    req.access = await accessService.getUserAccessContext(req.user.id)
    next()
  } catch (err) {
    console.error('loadAccess failed:', err.message)
    res.status(401).json({ success: false, error: 'Not authenticated' })
  }
}

function requirePlatformAdmin(req, res, next) {
  if (!req.access?.isPlatformAdmin) {
    return res.status(403).json({ success: false, error: 'Not authorized' })
  }
  next()
}

// Equivalent of the old requireRole('manager', 'bde', ...) - gates entry to a portal
// without checking any specific module/permission grant.
function requirePortal(...portals) {
  return (req, res, next) => {
    if (!portals.includes(req.access?.portal)) {
      return res.status(403).json({ success: false, error: 'Not authorized' })
    }
    next()
  }
}

const METHOD_PERMISSION = { GET: 'Read', POST: 'Save', PATCH: 'Save', PUT: 'Save', DELETE: 'Delete' }

// Gates a whole module's routes by the admin-managed Read/Save/Delete permission grid.
// The needed permission defaults from the HTTP method (GET -> Read, POST/PATCH/PUT ->
// Save, DELETE -> Delete) so router.use(...) can gate every verb in one line; pass
// { permission } to override for a route that doesn't fit that mapping.
function requireModule(moduleKey, { permission } = {}) {
  return (req, res, next) => {
    const needed = permission || METHOD_PERMISSION[req.method] || 'Read'
    if (!accessService.hasModulePermission(req.access, moduleKey, needed)) {
      return res.status(403).json({ success: false, error: 'Not authorized' })
    }
    next()
  }
}

module.exports = { loadAccess, requirePlatformAdmin, requirePortal, requireModule }
