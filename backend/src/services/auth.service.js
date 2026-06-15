// backend/src/services/auth.service.js
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const userRepository = require('../repositories/user.repository')
const refreshTokenRepository = require('../repositories/refresh-token.repository')
const interviewRepository = require('../repositories/interview.repository')

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function applicationRole(user) {
  return user.role === 'employee' ? 'candidate' : user.role
}

function signAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: applicationRole(user),
      companyId: user.company_id,
      name: `${user.first_name} ${user.last_name}`,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  )
}

function signCandidateSession(interview) {
  return jwt.sign(
    {
      interviewId: interview.id,
      internalUserId: interview.internal_user_id,
      externalCandidateId: interview.external_candidate_id,
      role: 'candidate',
    },
    process.env.JWT_SECRET,
    { expiresIn: '4h' }
  )
}

function candidateInterviewSummary(interview) {
  return {
    id: interview.id,
    type: interview.type,
    interviewMode: interview.interview_mode,
    difficulty: interview.difficulty,
    candidateName: `${interview.candidate_first} ${interview.candidate_last}`.trim(),
    status: interview.status,
  }
}

function publicUser(user) {
  return {
    id: user.id,
    role: applicationRole(user),
    companyId: user.company_id,
    first_name: user.first_name,
    last_name: user.last_name,
    name: `${user.first_name} ${user.last_name}`,
    email: user.email,
    resume_url: user.resume_url || null,
    tags: user.tags || null,
    availability: user.availability || null,
  }
}

async function login(email, password) {
  const user = await userRepository.getByEmail(email)
  if (!user) throw new Error('Invalid credentials')

  const match = await bcrypt.compare(password, user.password)
  if (!match) throw new Error('Invalid credentials')

  const accessToken = signAccessToken(user)

  const rawRefresh = crypto.randomBytes(64).toString('hex')
  const tokenHash = hashToken(rawRefresh)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await refreshTokenRepository.create(user.id, tokenHash, expiresAt)

  return {
    accessToken,
    refreshToken: rawRefresh,
    user: publicUser(user),
  }
}

async function refresh(rawRefreshToken) {
  if (!rawRefreshToken) throw new Error('No refresh token')

  const tokenHash = hashToken(rawRefreshToken)
  const stored = await refreshTokenRepository.getByHash(tokenHash)

  if (!stored) throw new Error('Invalid or expired refresh token')

  const user = await userRepository.getById(stored.user_id)
  if (!user) throw new Error('User not found')

  await refreshTokenRepository.revoke(stored.id)
  const nextRefreshToken = crypto.randomBytes(64).toString('hex')
  await refreshTokenRepository.create(
    user.id,
    hashToken(nextRefreshToken),
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  )
  const accessToken = signAccessToken(user)
  return {
    accessToken,
    refreshToken: nextRefreshToken,
    user: publicUser(user),
  }
}

async function logout(rawRefreshToken) {
  if (!rawRefreshToken) return

  const tokenHash = hashToken(rawRefreshToken)
  const stored = await refreshTokenRepository.getByHash(tokenHash)
  if (stored) {
    await refreshTokenRepository.revoke(stored.id)
  }
}

async function validateMagicLink(token) {
  const interview = await interviewRepository.getByToken(token)

  if (!interview) throw new Error('Invalid link')

  if (interview.token_expires && new Date() > new Date(interview.token_expires)) {
    throw new Error('Link has expired')
  }

  if (interview.status === 'completed') {
    throw new Error('Interview already completed')
  }

  return {
    sessionToken: signCandidateSession(interview),
    interview: candidateInterviewSummary(interview),
  }
}

async function createCandidateLaunch(interview) {
  if (!interview) throw new Error('Interview not found')
  if (interview.status === 'completed') throw new Error('Interview already completed')

  const launchToken = crypto.randomBytes(32).toString('hex')
  const tokenExpires = new Date(Date.now() + 4 * 60 * 60 * 1000)
  await interviewRepository.updateTokenHash(
    interview.id,
    hashToken(launchToken),
    tokenExpires
  )

  return {
    launchToken,
    sessionToken: signCandidateSession(interview),
    interview: candidateInterviewSummary(interview),
  }
}

module.exports = {
  login,
  refresh,
  logout,
  validateMagicLink,
  createCandidateLaunch,
  hashToken,
}
