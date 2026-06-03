// backend/src/routes/auth.routes.js
// Auth endpoints — login, token refresh, logout, magic link.
// HTTP layer only: validate input, call service, respond.

const express = require('express')
const authMiddleware = require('../middleware/auth')
const authService = require('../services/auth.service')

const router = express.Router()

const COOKIE_NAME = 'refreshToken'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
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
    // Always return the same message — don't reveal if email exists
    res.status(401).json({ success: false, error: 'Invalid email or password' })
  }
})

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const rawRefresh = req.cookies[COOKIE_NAME]
    const { accessToken } = await authService.refresh(rawRefresh)
    res.json({ success: true, data: { accessToken } })
  } catch (err) {
    console.error('POST /auth/refresh failed:', err)
    res.clearCookie(COOKIE_NAME)
    res.status(401).json({ success: false, error: 'Session expired. Please log in again.' })
  }
})

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const rawRefresh = req.cookies[COOKIE_NAME]
    await authService.logout(rawRefresh)
    res.clearCookie(COOKIE_NAME)
    res.json({ success: true, data: null })
  } catch (err) {
    console.error('POST /auth/logout failed:', err)
    res.clearCookie(COOKIE_NAME)
    res.json({ success: true, data: null }) // logout always succeeds from user perspective
  }
})

// POST /api/auth/magic-link/:token
router.post('/magic-link/:token', async (req, res) => {
  try {
    const { token } = req.params
    if (!token) return res.status(400).json({ success: false, error: 'Token is required' })

    const result = await authService.validateMagicLink(token)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('POST /auth/magic-link failed:', err)
    const msg = err.message || 'Could not validate link'
    // Surface specific errors for the candidate (expired, already done)
    if (['Link has expired', 'Interview already completed', 'Invalid link'].includes(msg)) {
      return res.status(400).json({ success: false, error: msg })
    }
    res.status(500).json({ success: false, error: 'Could not validate link' })
  }
})

module.exports = router
