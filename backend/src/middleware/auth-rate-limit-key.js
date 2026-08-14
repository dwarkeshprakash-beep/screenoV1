const crypto = require('crypto')

function digest(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

function authRateLimitKey(req) {
  const email = String(req.body?.email || '').trim().toLowerCase()
  if (email) return `email:${digest(email)}`

  const bodyToken = String(req.body?.token || '').trim()
  if (bodyToken) return `token:${digest(bodyToken)}`

  const refreshToken = String(req.cookies?.refreshToken || '').trim()
  if (refreshToken) return `refresh:${digest(refreshToken)}`

  const magicLinkToken = String(req.path || '').match(/^\/magic-link\/([^/]+)/)?.[1]
  if (magicLinkToken) return `magic:${digest(magicLinkToken)}`

  return `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`
}

module.exports = authRateLimitKey
