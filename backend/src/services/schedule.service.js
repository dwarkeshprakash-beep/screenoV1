// backend/src/services/schedule.service.js
// Business logic for scheduling interviews.

const crypto = require('crypto')
const interviewRepository = require('../repositories/interview.repository')
const candidateRepository = require('../repositories/candidate.repository')
const emailService = require('./email.service')

/**
 * Create a scheduled interview and send the candidate's magic link.
 * @param {Object} data - schedule form data
 * @param {number} managerId
 * @param {number} companyId
 * @returns {Promise<Object>} created interview
 */
async function createSchedule(data, managerId, companyId) {
  if (!data.candidateId) throw new Error('candidateId is required')
  if (!data.type) throw new Error('Interview type is required')
  if (!data.interviewMode) throw new Error('Interview mode is required')

  const candidate = await candidateRepository.getById(data.candidateId)
  if (!candidate) throw new Error('Candidate not found')

  const token = crypto.randomBytes(32).toString('hex')
  const windowDays = data.windowDays || 7
  const windowCloses = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000)
  const tokenExpires = windowCloses

  const interview = await interviewRepository.create({
    companyId,
    candidateId: data.candidateId,
    managerId,
    type: data.type,
    mode: data.mode || 'internal_monthly',
    interviewMode: data.interviewMode,
    transcriptionMode: data.transcriptionMode || 'api',
    difficulty: data.difficulty || 'medium',
    jdText: data.jdText || null,
    focusAreas: data.focusAreas || null,
    maxAttempts: data.maxAttempts || 3,
    cooldownHours: data.cooldownHours || 24,
    windowDays,
    reportTiming: data.reportTiming || 'all',
    reportEveryN: data.reportEveryN || 3,
    reportEmails: data.reportEmails || null,
    token,
    tokenExpires,
    windowCloses,
  })

  // Send magic link email async — don't fail the schedule if email fails
  emailService.sendMagicLink(candidate.email, {
    candidateName: `${candidate.first_name} ${candidate.last_name}`,
    interviewToken: token,
    companyName: data.companyName || 'Your company',
    jobTitle: data.jobTitle || 'Assessment',
    windowDays,
  }).catch(err => console.error('sendMagicLink failed:', err))

  return interview
}

/**
 * Get calendar events for a company within a date range.
 * @param {number} companyId
 * @param {string} weekStart - ISO date string (optional)
 * @returns {Promise<Array>}
 */
async function getCalendarEvents(companyId, weekStart) {
  const interviews = await interviewRepository.getByCompany(companyId)

  let filtered = interviews
  if (weekStart) {
    const start = new Date(weekStart)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    filtered = interviews.filter(i => {
      const d = new Date(i.created)
      return d >= start && d < end
    })
  }

  return filtered.map(i => ({
    id: i.id,
    type: i.type,
    candidateId: i.candidate_id,
    candidateName: `${i.first_name || ''} ${i.last_name || ''}`.trim(),
    status: i.status,
    created: i.created,
    windowCloses: i.window_closes,
  }))
}

/**
 * Return 5 available interview slots starting tomorrow, spaced across business hours.
 * In a full implementation this would query the DB for real availability.
 * @param {string} token - candidate magic-link token (reserved for future DB lookup)
 * @returns {Promise<Array>}
 */
async function getAvailableSlots(token) {
  const slots = []
  const base = new Date()
  const hours = [9, 11, 14, 16, 10]
  for (let i = 0; i < 5; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i + 1)
    d.setHours(hours[i], 0, 0, 0)
    slots.push({ id: i + 1, datetime: d.toISOString(), duration: 60 })
  }
  return slots
}

module.exports = { createSchedule, getCalendarEvents, getAvailableSlots }
