const test = require('node:test')
const assert = require('node:assert/strict')

const rateLimit = require('../src/middleware/rate-limit')
const authRateLimitKey = require('../src/middleware/auth-rate-limit-key')
const {
  parseDurationMs,
  getRefreshCookieOptions,
} = require('../src/config/auth')
const { validatePassword } = require('../src/utils/password-policy')

function withEnv(values, callback) {
  const previous = {}
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try {
    return callback()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

test('refresh token duration supports documented duration strings', () => {
  assert.equal(parseDurationMs('7d'), 7 * 24 * 60 * 60 * 1000)
  assert.equal(parseDurationMs('12h'), 12 * 60 * 60 * 1000)
  assert.equal(parseDurationMs('invalid', 1234), 1234)
})

test('refresh cookie is secure when HTTPS is forwarded through the hosting proxy', () => {
  withEnv({ NODE_ENV: 'development', RENDER: undefined, COOKIE_SECURE: undefined }, () => {
    const options = getRefreshCookieOptions({
      secure: false,
      headers: { 'x-forwarded-proto': 'https' },
    })
    assert.equal(options.secure, true)
    assert.equal(options.httpOnly, true)
    assert.equal(options.sameSite, 'lax')
  })
})

test('refresh cookie lifetime follows REFRESH_EXPIRES_IN', () => {
  withEnv({ REFRESH_EXPIRES_IN: '12h' }, () => {
    const options = getRefreshCookieOptions({ secure: false, headers: {} })
    assert.equal(options.maxAge, 12 * 60 * 60 * 1000)
  })
})

test('auth rate limiting isolates users behind the same proxy IP', () => {
  const limiter = rateLimit({
    windowMs: 60_000,
    max: 1,
    keyPrefix: 'test-auth',
    keyGenerator: authRateLimitKey,
  })
  const sharedRequest = { ip: '10.0.0.1', cookies: {}, body: { email: 'one@example.com' }, path: '/login' }
  const otherUser = { ...sharedRequest, body: { email: 'two@example.com' } }

  let nextCalls = 0
  limiter(sharedRequest, createResponse(), () => { nextCalls += 1 })
  limiter(otherUser, createResponse(), () => { nextCalls += 1 })
  const blocked = createResponse()
  limiter(sharedRequest, blocked, () => { nextCalls += 1 })

  assert.equal(nextCalls, 2)
  assert.equal(blocked.statusCode, 429)
})

test('auth rate-limit keys do not retain raw credentials', () => {
  const key = authRateLimitKey({
    ip: '10.0.0.1',
    cookies: { refreshToken: 'raw-secret-token' },
    body: {},
    path: '/refresh',
  })
  assert.match(key, /^refresh:[a-f0-9]{64}$/)
  assert.equal(key.includes('raw-secret-token'), false)
})

test('password policy is consistent for profile changes and reset links', () => {
  assert.equal(validatePassword('Screeno2026'), null)
  assert.match(validatePassword('alllowercase1'), /uppercase/)
  assert.match(validatePassword('ALLUPPERCASE1'), /lowercase/)
  assert.match(validatePassword('NoNumbersHere'), /number/)
  assert.match(validatePassword('Short1'), /8-72/)
})
