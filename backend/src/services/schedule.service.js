// backend/src/services/schedule.service.js
// Business logic for scheduling interviews.

const crypto = require('crypto')
const interviewRepository = require('../repositories/interview.repository')
const candidateRepository = require('../repositories/candidate.repository')
const teamMemberRepository = require('../repositories/team-member.repository')
const questionRepository = require('../repositories/question.repository')
const userRepository = require('../repositories/user.repository')
const scheduleRecordRepository = require('../repositories/schedule-record.repository')
const emailDeliveryRepository = require('../repositories/email-delivery.repository')
const emailService = require('./email.service')
const llmService = require('./llm.service')

/**
 * Create a scheduled interview and send the candidate's magic link.
 * @param {Object} data - schedule form data
 * @param {number} managerId
 * @param {number} companyId
 * @returns {Promise<Object>} created interview
 */
async function createSchedule(data, managerId, companyId) {
  if (!data.teamMemberId && !data.candidateId) throw new Error('teamMemberId is required')
  if (!data.type) throw new Error('Interview type is required')
  if (!data.interviewMode) throw new Error('Interview mode is required')

  let candidate
  let teamMember = null
  if (data.teamMemberId) {
    teamMember = await teamMemberRepository.getByIdForCompany(data.teamMemberId, companyId)
    if (!teamMember) throw new Error('Team member not found')
    candidate = await candidateRepository.upsertFromTeamMember(teamMember)
  } else {
    candidate = await candidateRepository.getByIdForCompany(data.candidateId, companyId)
    if (!candidate) throw new Error('Candidate not found')
  }

  const idempotencyKey = data.idempotencyKey || null
  if (idempotencyKey) {
    const existingRecord = await scheduleRecordRepository.getByKey(companyId, idempotencyKey)
    if (existingRecord?.interview_id) {
      const existingInterview = await interviewRepository.getByIdForCompany(existingRecord.interview_id, companyId)
      if (existingInterview) {
        return {
          ...existingInterview,
          inviteSent: true,
          idempotentReplay: true,
        }
      }
    }
  }

  let scheduledStart = data.scheduledStart || null
  let scheduledEnd = data.scheduledEnd || null
  if (data.type === 'human') {
    if (!data.interviewerId) throw new Error('interviewerId is required')
    if (!scheduledStart) throw new Error('scheduledStart is required')
    const interviewer = await userRepository.getById(data.interviewerId)
    if (!interviewer || interviewer.company_id !== companyId || interviewer.role !== 'interviewer') {
      throw new Error('Interviewer not found')
    }
    const start = new Date(scheduledStart)
    const end = scheduledEnd ? new Date(scheduledEnd) : new Date(start.getTime() + 60 * 60 * 1000)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw new Error('Invalid appointment time')
    }
    const conflicts = await interviewRepository.countHumanConflicts(data.interviewerId, start, end)
    if (conflicts > 0) throw new Error('Interviewer is not available at that time')
    scheduledStart = start
    scheduledEnd = end
  }

  const token = crypto.randomBytes(32).toString('hex')
  const windowDays = data.windowDays || 7
  const windowCloses = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000)
  const tokenExpires = windowCloses
  const scheduleRecord = idempotencyKey
    ? await scheduleRecordRepository.createPending({
      companyId,
      candidateId: candidate.id,
      idempotencyKey,
      expires: windowCloses,
    })
    : null

  const interview = await interviewRepository.create({
    companyId,
    candidateId: candidate.id,
    managerId,
    interviewerId: data.interviewerId || null,
    type: data.type,
    mode: data.mode || 'internal_monthly',
    interviewMode: data.interviewMode,
    difficulty: data.difficulty || 'medium',
    jdText: data.jdText || null,
    focusAreas: data.focusAreas || null,
    questionCount: data.questionCount || 10,
    maxAttempts: data.maxAttempts || 3,
    cooldownHours: data.cooldownHours || 24,
    windowDays,
    reportTiming: data.reportTiming || 'all',
    reportEveryN: data.reportEveryN || 3,
    reportEmails: data.reportEmails || null,
    token,
    tokenExpires,
    windowCloses,
    scheduledStart,
    scheduledEnd,
    timezone: data.timezone || null,
  })

  if (scheduleRecord) {
    await scheduleRecordRepository.markCompleted(scheduleRecord.id, interview.id)
  }

  // Generate exam questions (LLM + judge validation) and send the invite email in the
  // background — together they can take well over a minute, which would blow past the
  // request's socket timeout (server.js) and surface to the client as a 502 if awaited here.
  finishScheduleSetup({ interview, candidate, data, token, windowDays }).catch(err =>
    console.error('finishScheduleSetup failed:', err)
  )

  return {
    ...interview,
    inviteSent: false,
    inviteStatus: 'pending',
    inviteMessage: 'Invite email is being sent.',
  }
}

/**
 * Generate exam questions (if needed) and send the candidate's magic-link invite email.
 * Runs in the background after the schedule response has already been sent — LLM
 * generation and judge validation can take well over a minute.
 * @param {Object} ctx
 */
async function finishScheduleSetup({ interview, candidate, data, token, windowDays }) {
  if (data.type === 'exam' || data.type === 'ai_exam') {
    const questions = await llmService.generateExamQuestions({
      resume: candidate.resume_text,
      jd: data.jdText,
      focusAreas: data.focusAreas,
      difficulty: data.difficulty,
      count: 10,
    })
    await questionRepository.createMany(interview.id, null, questions)
  }

  let inviteSent = false
  let inviteFailure = null
  try {
    await emailService.sendMagicLink(candidate.email, {
      candidateName: `${candidate.first_name} ${candidate.last_name}`,
      interviewToken: token,
      companyName: data.companyName || 'Your company',
      jobTitle: data.jobTitle || 'Assessment',
      windowDays,
    })
    inviteSent = true
  } catch (err) {
    inviteFailure = err.message
    console.error('sendMagicLink failed:', err)
  } finally {
    await emailDeliveryRepository.create({
      kind: 'magic_link',
      interviewId: interview.id,
      candidateId: candidate.id,
      intendedTo: candidate.email,
      deliveredTo: emailService.getDeliveredRecipients().join(','),
      status: inviteSent ? 'sent' : 'failed',
      error: inviteFailure,
    }).catch(err => console.error('email delivery log failed:', err.message))
  }
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
      const d = new Date(i.scheduled_start || i.created)
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
    start: i.scheduled_start,
    end: i.scheduled_end,
    duration_minutes: i.scheduled_start && i.scheduled_end
      ? Math.round((new Date(i.scheduled_end) - new Date(i.scheduled_start)) / 60000)
      : 60,
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

async function getInterviewers(companyId) {
  return userRepository.getByRole(companyId, 'interviewer')
}

async function getOrgUsers(companyId) {
  return userRepository.getByCompany(companyId)
}

async function getEmailDeliveries(interviewId, companyId) {
  const interview = await interviewRepository.getByIdForCompany(interviewId, companyId)
  if (!interview) throw new Error('Interview not found')
  return emailDeliveryRepository.listByInterview(interviewId)
}

async function resendMagicLink(interviewId, companyId) {
  const interview = await interviewRepository.getByIdForCompany(interviewId, companyId)
  if (!interview) throw new Error('Interview not found')

  const candidate = await candidateRepository.getByIdForCompany(interview.candidate_id, companyId)
  if (!candidate) throw new Error('Candidate not found')

  let status = 'sent'
  let error = null
  try {
    await emailService.sendMagicLink(candidate.email, {
      candidateName: `${candidate.first_name} ${candidate.last_name}`,
      interviewToken: interview.token,
      companyName: 'Your company',
      jobTitle: 'Assessment',
      windowDays: interview.window_days,
    })
  } catch (err) {
    status = 'failed'
    error = err.message || 'Invite email failed. Please contact administration.'
  }

  await emailDeliveryRepository.create({
    kind: 'magic_link_resend',
    interviewId,
    candidateId: candidate.id,
    intendedTo: candidate.email,
    deliveredTo: emailService.getDeliveredRecipients().join(','),
    status,
    error,
  })

  return {
    status,
    message: status === 'sent' ? 'Invite resent.' : 'Invite resend failed. Please contact administration.',
  }
}

module.exports = {
  createSchedule,
  getCalendarEvents,
  getAvailableSlots,
  getInterviewers,
  getOrgUsers,
  getEmailDeliveries,
  resendMagicLink,
}
