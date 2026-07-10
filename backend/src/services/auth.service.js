// backend/src/services/auth.service.js
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const db = require('../db/connection')
const userRepository = require('../repositories/user.repository')
const refreshTokenRepository = require('../repositories/refresh-token.repository')
const passwordResetRepository = require('../repositories/password-reset.repository')
const interviewRepository = require('../repositories/interview.repository')
const emailDeliveryRepository = require('../repositories/email-delivery.repository')
const emailService = require('./email.service')
const {
  launchWindow,
  launchWindowMessage,
  formatWindowDate,
} = require('./interview-window.service')

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
    questionCount: interview.question_count,
    durationMinutes: interview.duration_minutes || null,
    scheduledAt: interview.scheduled_at || null,
    scheduled_at: interview.scheduled_at || null,
    candidateName: `${interview.candidate_first} ${interview.candidate_last}`.trim(),
    companyName: interview.company_name || null,
    company_name: interview.company_name || null,
    contextTitle: interview.context_title || null,
    status: interview.status,
  }
}

async function notifyManagerForReschedule(interview, window) {
  if (!interview?.manager_email) return
  const candidateName = `${interview.candidate_first || ''} ${interview.candidate_last || ''}`.trim() || 'Candidate'
  try {
    await emailService.sendRescheduleRequest(interview.manager_email, {
      candidateName,
      candidateEmail: interview.candidate_email,
      interviewId: interview.id,
      interviewType: interview.type,
      contextTitle: interview.context_title,
      scheduledAt: formatWindowDate(window.opensAt),
      expiredAt: formatWindowDate(window.closesAt),
      companyName: interview.company_name,
    })
    await emailDeliveryRepository.create({
      kind: 'reschedule_request',
      interviewId: interview.id,
      intendedTo: interview.manager_email,
      deliveredTo: emailService.getDeliveredRecipients(interview.manager_email).join(','),
      status: 'sent',
    }).catch(err => console.error('reschedule delivery log failed:', err.message))
  } catch (err) {
    console.error('sendRescheduleRequest failed:', err.message)
    await emailDeliveryRepository.create({
      kind: 'reschedule_request',
      interviewId: interview.id,
      intendedTo: interview.manager_email,
      deliveredTo: emailService.getDeliveredRecipients(interview.manager_email).join(','),
      status: 'failed',
      error: err.message,
    }).catch(logErr => console.error('reschedule delivery log failed:', logErr.message))
  }
}

async function ensureLaunchWindow(interview) {
  const window = launchWindow(interview)
  if (window.state === 'open') return

  if (window.state === 'expired') {
    await notifyManagerForReschedule(interview, window)
  }

  const err = new Error(launchWindowMessage(window))
  err.code = window.state === 'not_yet'
    ? 'INTERVIEW_NOT_OPEN'
    : 'INTERVIEW_WINDOW_EXPIRED'
  err.data = {
    opensAt: window.opensAt ? window.opensAt.toISOString() : null,
    closesAt: window.closesAt ? window.closesAt.toISOString() : null,
    durationMinutes: window.durationMinutes,
  }
  throw err
}

async function createLaunchPayload(interview) {
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

  if (!stored) throw new Error('Invalid refresh token')

  const now = new Date()

  if (stored.revoked) {
    throw new Error('Refresh token revoked')
  }

  if (stored.expires < now) {
    throw new Error('Refresh token expired')
  }

  // Token rotation / reuse detection logic
  if (stored.replaced_by_token_hash) {
    if (stored.replacement_grace_expires && new Date(stored.replacement_grace_expires) > now) {
      // Grace period: concurrent request (e.g. multi-tab refresh).
      // Issue a new access token, but do NOT rotate the refresh token again.
      // The client route should maintain the existing refresh cookie.
      const user = await userRepository.getById(stored.user_id)
      if (!user) throw new Error('User not found')
      return {
        accessToken: signAccessToken(user),
        refreshToken: null, // Signals route to not set a new cookie
        user: publicUser(user),
      }
    } else {
      // Token reuse detected! Revoke the entire family.
      await refreshTokenRepository.revokeFamily(stored.family_id)
      throw new Error('Token reuse detected. Family revoked.')
    }
  }

  const user = await userRepository.getById(stored.user_id)
  if (!user) throw new Error('User not found')

  const nextRefreshToken = crypto.randomBytes(64).toString('hex')
  const nextTokenHash = hashToken(nextRefreshToken)

  // 1. Issue new token in the same family
  await refreshTokenRepository.create(
    user.id,
    nextTokenHash,
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    stored.family_id
  )

  // 2. Mark old token as replaced, starting the 30-second grace period
  await refreshTokenRepository.markReplaced(stored.id, nextTokenHash, 30000)

  return {
    accessToken: signAccessToken(user),
    refreshToken: nextRefreshToken,
    user: publicUser(user),
  }
}

async function logout(rawRefreshToken) {
  if (!rawRefreshToken) return

  const tokenHash = hashToken(rawRefreshToken)
  const stored = await refreshTokenRepository.getByHash(tokenHash)
  if (stored) {
    // Revoking just this token is standard.
    await refreshTokenRepository.revoke(stored.id)
  }
}

async function requestPasswordReset(email) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!cleanEmail) return

  const user = await userRepository.getByEmail(cleanEmail)
  if (!user) return

  const rawToken = crypto.randomBytes(32).toString('hex')
  const expiresMinutes = 60
  await passwordResetRepository.create(
    user.id,
    hashToken(rawToken),
    new Date(Date.now() + expiresMinutes * 60 * 1000)
  )

  await emailService.sendPasswordReset(user.email, {
    name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    token: rawToken,
    expiresMinutes,
  })
}

async function resetPassword(token, newPassword) {
  if (!token) throw new Error('Reset token is required')
  if (!newPassword || String(newPassword).length < 8) {
    throw new Error('Password must be at least 8 characters')
  }

  const stored = await passwordResetRepository.getValidByHash(hashToken(token))
  if (!stored) throw new Error('Reset link is invalid or expired')

  await userRepository.updatePassword(stored.user_id, await bcrypt.hash(String(newPassword), 10))
  await passwordResetRepository.markUsed(stored.id)
}

async function validateMagicLink(token) {
  return claimMagicLink(token)
}

function assertMagicLinkUsable(interview) {
  if (!interview) throw new Error('Invalid link')

  if (!interview.token_expires || new Date() > new Date(interview.token_expires)) {
    throw new Error('Link has expired')
  }

  if (interview.status === 'completed') {
    throw new Error('Interview already completed')
  }
  if (interview.status === 'cancelled') {
    throw new Error('Interview has been cancelled')
  }
}

async function previewMagicLink(token) {
  const interview = await interviewRepository.getByToken(token)
  assertMagicLinkUsable(interview)
  await ensureLaunchWindow(interview)
  return candidateInterviewSummary(interview)
}

async function claimMagicLink(token) {
  if (!token) throw new Error('Invalid link')
  const tokenHash = hashToken(token)

  const lockedInterview = await db.transaction(async (tx) => {
    const rows = await tx.query(
      `SELECT *
       FROM interviews
       WHERE token = @tokenHash
       FOR UPDATE`,
      { tokenHash }
    )
    const interview = rows[0]
    if (!interview) return null

    assertMagicLinkUsable(interview)
    await ensureLaunchWindow(interview)

    await tx.query(
      `UPDATE interviews
       SET token = NULL,
           token_expires = NULL
       WHERE id = @id`,
      { id: interview.id }
    )
    return interview
  })

  if (!lockedInterview) throw new Error('Invalid link')
  const fullInterview = await interviewRepository.getById(lockedInterview.id)
  return createCandidateLaunch(fullInterview || lockedInterview)
}

async function createCandidateLaunch(interview) {
  if (!interview) throw new Error('Interview not found')
  if (interview.status === 'completed') throw new Error('Interview already completed')
  await ensureLaunchWindow(interview)

  // Replace the email/dashboard token with a short-lived launch token. The original
  // magic link cannot be replayed, while exam routes still get a valid token.
  return createLaunchPayload(interview)
}

module.exports = {
  login,
  refresh,
  logout,
  requestPasswordReset,
  resetPassword,
  previewMagicLink,
  claimMagicLink,
  validateMagicLink,
  createCandidateLaunch,
  hashToken,
}
