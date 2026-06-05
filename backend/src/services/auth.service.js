// backend/src/services/auth.service.js
// All authentication business logic. No SQL, no HTTP.

const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const userRepository = require('../repositories/user.repository')
const candidateRepository = require('../repositories/candidate.repository')
const refreshTokenRepository = require('../repositories/refresh-token.repository')
const interviewRepository = require('../repositories/interview.repository')

/**
 * Hash a raw refresh token string for DB storage.
 * @param {string} token
 * @returns {string}
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Sign a short-lived access token.
 * @param {Object} user
 * @returns {string}
 */
function signAccessToken(user, candidateId = null) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      companyId: user.company_id,
      name: `${user.first_name} ${user.last_name}`,
      ...(candidateId ? { candidateId } : {}),
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  )
}

/**
 * Login with email + password. Returns access token and raw refresh token.
 * The route must set the refresh token as an HttpOnly cookie.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{accessToken, refreshToken, user}>}
 */
async function login(email, password) {
  const user = await userRepository.getByEmail(email)
  if (!user) throw new Error('Invalid credentials')

  const match = await bcrypt.compare(password, user.password)
  if (!match) throw new Error('Invalid credentials')

  let candidateId = null
  if (user.role === 'candidate') {
    const candidate = await candidateRepository.getByEmail(user.email, user.company_id)
    candidateId = candidate ? candidate.id : null
  }

  const accessToken = signAccessToken(user, candidateId)

  const rawRefresh = crypto.randomBytes(64).toString('hex')
  const tokenHash = hashToken(rawRefresh)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await refreshTokenRepository.create(user.id, tokenHash, expiresAt)

  return {
    accessToken,
    refreshToken: rawRefresh,
    user: {
      id: user.id,
      role: user.role,
      companyId: user.company_id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
    },
  }
}

/**
 * Issue a new access token from a valid refresh token cookie.
 * @param {string} rawRefreshToken
 * @returns {Promise<{accessToken}>}
 */
async function refresh(rawRefreshToken) {
  if (!rawRefreshToken) throw new Error('No refresh token')

  const tokenHash = hashToken(rawRefreshToken)
  const stored = await refreshTokenRepository.getByHash(tokenHash)

  if (!stored) throw new Error('Invalid or expired refresh token')

  const user = await userRepository.getById(stored.user_id)
  if (!user) throw new Error('User not found')

  const accessToken = signAccessToken(user)
  return { accessToken }
}

/**
 * Revoke a refresh token (logout).
 * @param {string} rawRefreshToken
 */
async function logout(rawRefreshToken) {
  if (!rawRefreshToken) return

  const tokenHash = hashToken(rawRefreshToken)
  const stored = await refreshTokenRepository.getByHash(tokenHash)
  if (stored) {
    await refreshTokenRepository.revoke(stored.id)
  }
}

/**
 * Validate a candidate's magic link token and issue a session JWT.
 * @param {string} token - raw token from the URL
 * @returns {Promise<{sessionToken, interview}>}
 */
async function validateMagicLink(token) {
  const interview = await interviewRepository.getByToken(token)

  if (!interview) throw new Error('Invalid link')

  if (interview.window_closes && new Date() > new Date(interview.window_closes)) {
    throw new Error('Link has expired')
  }

  if (interview.status === 'completed') {
    throw new Error('Interview already completed')
  }

  const sessionJWT = jwt.sign(
    {
      interviewId: interview.id,
      candidateId: interview.candidate_id,
      role: 'candidate',
    },
    process.env.JWT_SECRET,
    { expiresIn: '4h' }
  )

  return {
    sessionToken: sessionJWT,
    interview: {
      id: interview.id,
      type: interview.type,
      mode: interview.mode,
      interviewMode: interview.interview_mode,
      transcriptionMode: interview.transcription_mode,
      difficulty: interview.difficulty,
      candidateName: `${interview.candidate_first} ${interview.candidate_last}`,
      companyName: interview.company_name,
      status: interview.status,
    },
  }
}

module.exports = { login, refresh, logout, validateMagicLink }
