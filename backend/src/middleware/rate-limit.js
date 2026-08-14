// backend/src/middleware/rate-limit.js
// Small in-memory route limiter. Good enough for a single application instance.

function rateLimit({ windowMs, max, keyPrefix, keyGenerator }) {
  const hits = new Map()
  let requestsSinceCleanup = 0

  return (req, res, next) => {
    const now = Date.now()
    const subject = keyGenerator
      ? keyGenerator(req)
      : `${req.ip}:${req.user?.id || 'anon'}`
    const key = `${keyPrefix}:${subject}`
    const current = hits.get(key) || { count: 0, resetAt: now + windowMs }

    requestsSinceCleanup += 1
    if (requestsSinceCleanup >= 1000) {
      for (const [storedKey, value] of hits) {
        if (now > value.resetAt) hits.delete(storedKey)
      }
      requestsSinceCleanup = 0
    }

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
