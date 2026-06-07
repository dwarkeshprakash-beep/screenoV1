// backend/src/middleware/rate-limit.js
// Small in-memory route limiter. Good enough for local/internal use.

function rateLimit({ windowMs, max, keyPrefix }) {
  const hits = new Map()

  return (req, res, next) => {
    const now = Date.now()
    const key = `${keyPrefix}:${req.ip}:${req.user?.id || 'anon'}`
    const current = hits.get(key) || { count: 0, resetAt: now + windowMs }

    if (now > current.resetAt) {
      current.count = 0
      current.resetAt = now + windowMs
    }

    current.count += 1
    hits.set(key, current)

    res.setHeader('X-RateLimit-Limit', String(max))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - current.count)))
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(current.resetAt / 1000)))

    if (current.count > max) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' })
    }

    next()
  }
}

module.exports = rateLimit
