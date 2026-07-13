// backend/src/routes/auth.routes.js
// Auth endpoints — login, token refresh, logout, magic link.
// HTTP layer only: validate input, call service, respond.

const express = require('express')
const authMiddleware = require('../middleware/auth')
const authService = require('../services/auth.service')

const router = express.Router()

const COOKIE_NAME = 'refreshToken'
const cookieSameSite = String(
  process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax')
).toLowerCase()
const cookieSecure = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === 'true'
  : process.env.NODE_ENV === 'production' || cookieSameSite === 'none'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: cookieSameSite,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email) return res.status(400).json({ success: false, error: 'Email is required' })
    if (!password) return res.status(400).json({ success: false, error: 'Password is required' })

    const { accessToken, refreshToken, user } = await authService.login(email, password)

    res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS)
    res.json({ success: true, data: { accessToken, user } })
  } catch (err) {
    console.error('POST /auth/login failed:', err)
    const unavailableCodes = ['ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT']
    if (unavailableCodes.includes(err.code)) {
      return res.status(503).json({
        success: false,
        error: 'Login service is temporarily unavailable. Please try again.',
      })
    }
    // Always return the same message — don't reveal if email exists
    res.status(401).json({ success: false, error: 'Invalid email or password' })
  }
})

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const rawRefresh = req.cookies[COOKIE_NAME]
    if (!rawRefresh) {
      return res.status(401).json({ success: false, error: 'NO_REFRESH_TOKEN', message: 'No refresh token provided.' })
    }
    const { accessToken, refreshToken, user } = await authService.refresh(rawRefresh)
    
    if (refreshToken) {
      res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS)
    }
    // If refreshToken is null, we are in a grace period for a rotated token, 
    // so we just return the new accessToken and leave the cookie alone.

    res.json({ success: true, data: { accessToken, user } })
  } catch (err) {
    console.error('POST /auth/refresh failed:', err.message)
    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS)
    const errCode = err.message.includes('reuse') ? 'TOKEN_REUSE' : 'SESSION_EXPIRED'
    res.status(401).json({ success: false, error: errCode, message: err.message || 'Session expired. Please log in again.' })
  }
})

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const rawRefresh = req.cookies[COOKIE_NAME]
    if (rawRefresh) {
      await authService.logout(rawRefresh)
    }
    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS)
    res.json({ success: true, data: null })
  } catch (err) {
    console.error('POST /auth/logout failed:', err.message)
    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS)
    res.json({ success: true, data: null }) // logout always succeeds from user perspective
  }
})

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    if (!req.body.email) {
      return res.status(400).json({ success: false, error: 'Email is required' })
    }
    await authService.requestPasswordReset(req.body.email)
    res.json({
      success: true,
      data: {
        message: 'If that email exists, a password reset link has been sent.',
      },
    })
  } catch (err) {
    console.error('POST /auth/forgot-password failed:', err)
    res.status(500).json({ success: false, error: 'Could not request password reset' })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    await authService.resetPassword(req.body.token, req.body.newPassword)
    res.json({ success: true, data: { message: 'Password updated. Please sign in.' } })
  } catch (err) {
    console.error('POST /auth/reset-password failed:', err)
    if ([
      'Reset token is required',
      'Password must be at least 8 characters',
      'Reset link is invalid or expired',
    ].includes(err.message)) {
      return res.status(400).json({ success: false, error: err.message })
    }
    res.status(500).json({ success: false, error: 'Could not reset password' })
  }
})

// GET /api/auth/magic-link/:token
router.get('/magic-link/:token', async (req, res) => {
  try {
    const { token } = req.params
    if (!token) return res.status(400).json({ success: false, error: 'Token is required' })

    const result = await authService.previewMagicLink(token)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('GET /auth/magic-link failed:', err)
    const msg = err.message || 'Could not preview link'
    if (['Link has expired', 'Interview already completed', 'Interview has been cancelled', 'Invalid link'].includes(msg)) {
      return res.status(400).json({ success: false, error: msg })
    }
    if (['INTERVIEW_NOT_OPEN', 'INTERVIEW_WINDOW_EXPIRED'].includes(err.code)) {
      return res.status(409).json({ success: false, error: msg, data: err.data || null })
    }
    res.status(500).json({ success: false, error: 'Could not preview link' })
  }
})

// POST /api/auth/magic-link/:token/claim
router.post('/magic-link/:token/claim', async (req, res) => {
  try {
    const { token } = req.params
    if (!token) return res.status(400).json({ success: false, error: 'Token is required' })

    const result = await authService.claimMagicLink(token)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('POST /auth/magic-link/claim failed:', err)
    const msg = err.message || 'Could not claim link'
    if (['Link has expired', 'Interview already completed', 'Interview has been cancelled', 'Invalid link'].includes(msg)) {
      return res.status(400).json({ success: false, error: msg })
    }
    if (['INTERVIEW_NOT_OPEN', 'INTERVIEW_WINDOW_EXPIRED'].includes(err.code)) {
      return res.status(409).json({ success: false, error: msg, data: err.data || null })
    }
    res.status(500).json({ success: false, error: 'Could not claim link' })
  }
})

// Legacy compatibility: older clients claimed magic links with POST /magic-link/:token.
router.post('/magic-link/:token', async (req, res) => {
  try {
    const { token } = req.params
    if (!token) return res.status(400).json({ success: false, error: 'Token is required' })

    const result = await authService.claimMagicLink(token)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('POST /auth/magic-link failed:', err)
    const msg = err.message || 'Could not claim link'
    if (['Link has expired', 'Interview already completed', 'Interview has been cancelled', 'Invalid link'].includes(msg)) {
      return res.status(400).json({ success: false, error: msg })
    }
    if (['INTERVIEW_NOT_OPEN', 'INTERVIEW_WINDOW_EXPIRED'].includes(err.code)) {
      return res.status(409).json({ success: false, error: msg, data: err.data || null })
    }
    res.status(500).json({ success: false, error: 'Could not claim link' })
  }
})

module.exports = router
