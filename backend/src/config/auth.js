const DEFAULT_REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

function parseDurationMs(value, fallbackMs = DEFAULT_REFRESH_TOKEN_TTL_MS) {
  if (value === undefined || value === null || String(value).trim() === '') return fallbackMs

  const match = String(value).trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)?$/)
  if (!match) return fallbackMs

  const amount = Number(match[1])
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  }
  const duration = amount * multipliers[match[2] || 'ms']
  return Number.isFinite(duration) && duration > 0 ? Math.round(duration) : fallbackMs
}

function getRefreshTokenTtlMs() {
  return parseDurationMs(process.env.REFRESH_EXPIRES_IN)
}

function envBoolean(value) {
  if (value === undefined || value === null || value === '') return null
  return String(value).toLowerCase() === 'true'
}

function isHttpsRequest(req) {
  if (req?.secure) return true
  const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
  return forwardedProto === 'https'
}

function getRefreshCookieOptions(req, { clear = false } = {}) {
  const configuredSecure = envBoolean(process.env.COOKIE_SECURE)
  const hostedProduction = process.env.NODE_ENV === 'production'
    || process.env.RENDER === 'true'
    || Boolean(process.env.RENDER_SERVICE_ID || process.env.RENDER_EXTERNAL_URL)
  const sameSite = String(process.env.COOKIE_SAMESITE || 'lax').toLowerCase()
  const secure = sameSite === 'none'
    || (configuredSecure ?? (hostedProduction || isHttpsRequest(req)))
  const options = {
    httpOnly: true,
    secure,
    sameSite: ['lax', 'strict', 'none'].includes(sameSite) ? sameSite : 'lax',
    path: '/api/auth',
  }

  if (!clear) options.maxAge = getRefreshTokenTtlMs()
  return options
}

module.exports = {
  DEFAULT_REFRESH_TOKEN_TTL_MS,
  parseDurationMs,
  getRefreshTokenTtlMs,
  getRefreshCookieOptions,
}
