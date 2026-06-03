// backend/src/middleware/role.js
// Role-based access control — use AFTER authMiddleware.
// Usage: router.get('/team', authMiddleware, requireRole('manager'), handler)

/**
 * Factory that returns middleware checking for allowed roles.
 * @param {...string} roles - allowed roles, e.g. 'manager', 'candidate', 'interviewer'
 * @returns {Function} Express middleware
 */
function requireRole(...roles) {
  return function (req, res, next) {
    // authMiddleware must run first — req.user is set by it
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Not authorized' })
    }

    next()
  }
}

module.exports = requireRole
