// backend/src/middleware/auth.js
// Validates the JWT access token on every protected route.
// Attaches decoded payload to req.user so routes can read role/id/companyId.

const jwt = require('jsonwebtoken')

/**
 * Express middleware — verify JWT Bearer token.
 * Responds 401 if missing, expired, or invalid.
 * On success: attaches { id, role, companyId } to req.user.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Not authenticated' })
  }

  const token = authHeader.slice(7) // strip 'Bearer '

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded // { id, role, companyId }
    next()
  } catch (err) {
    // expired and invalid both get a 401 — don't leak which one
    return res.status(401).json({ success: false, error: 'Not authenticated' })
  }
}

module.exports = authMiddleware
