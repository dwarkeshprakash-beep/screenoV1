// backend/src/services/schedule.service.js
const crypto = require('crypto')
const interviewRepository = require('../repositories/interview.repository')
const externalCandidateRepository = require('../repositories/external-candidate.repository')
const teamMemberRepository = require('../repositories/team-member.repository')
const userRepository = require('../repositories/user.repository')
const emailDeliveryRepository = require('../repositories/email-delivery.repository')
const emailService = require('./email.service')

async function createSchedule(data, managerId, companyId) {
  if (!data.teamMemberId && !data.candidateId) throw new Error('teamMemberId or candidateId is required')
  if (!data.type) throw new Error('Interview type is required')
  if (!data.interviewMode) throw new Error('Interview mode is required')

  let candidateName = ''
  let candidateEmail = ''
  let internalUserId = null
  let externalCandidateId = null

  if (data.teamMemberId) {
    const teamMember = await teamMemberRepository.getByIdForManager(data.teamMemberId, managerId)
    if (!teamMember) throw new Error('Team member not found')
    internalUserId = teamMember.user_id
    candidateName = `${teamMember.first_name} ${teamMember.last_name}`
    candidateEmail = teamMember.email
  } else {
    const candidate = await externalCandidateRepository.getById(data.candidateId)
    if (!candidate) throw new Error('Candidate not found')
    externalCandidateId = candidate.id
    candidateName = `${candidate.first_name} ${candidate.last_name}`
    candidateEmail = candidate.email
  }

  const token = crypto.randomBytes(32).toString('hex')
  const windowDays = data.windowDays || 7
  const tokenExpires = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000)

  const interview = await interviewRepository.create({
    managerId,
    internalUserId,
    externalCandidateId,
    type: data.type,
    interviewMode: data.interviewMode,
    difficulty: data.difficulty || 'medium',
    questionCount: data.questionCount || 10,
    token,
    tokenExpires,
    clientTemplateId:    data.clientTemplateId    || null,
    monthlyAssessmentId: data.monthlyAssessmentId || null,
    jdText:              data.jdText              || null,
    interviewerId:       data.interviewerId       || null,
  })

  finishScheduleSetup({ interview, candidateEmail, candidateName, data, token, windowDays }).catch(err =>
    console.error('finishScheduleSetup failed:', err)
  )

  return {
    ...interview,
    inviteSent: false,
    inviteStatus: 'pending',
    inviteMessage: 'Invite email is being sent.',
  }
}

async function finishScheduleSetup({ interview, candidateEmail, candidateName, data, token, windowDays }) {
  let inviteSent = false
  let inviteFailure = null
  try {
    await emailService.sendMagicLink(candidateEmail, {
      candidateName,
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
      intendedTo: candidateEmail,
      deliveredTo: emailService.getDeliveredRecipients(candidateEmail).join(','),
      status: inviteSent ? 'sent' : 'failed',
      error: inviteFailure,
    }).catch(err => console.error('email delivery log failed:', err.message))
  }
}

async function getCalendarEvents(managerId, week) {
  const interviews = await interviewRepository.getByManager(managerId)
  return interviews.map(i => ({
    id: i.id,
    type: i.type,
    candidateName: `${i.candidate_first || ''} ${i.candidate_last || ''}`.trim(),
    status: i.status,
    created: i.created,
    teamMemberId: i.team_member_id || null,
  }))
}

async function getInterviewers(companyId) {
  return userRepository.getByRole(companyId, 'interviewer')
}

async function getOrgUsers(companyId) {
  return userRepository.getByCompany(companyId)
}

async function getEmailDeliveries(interviewId, companyId) {
  const interview = await interviewRepository.getById(interviewId)
  if (!interview) throw new Error('Interview not found')
  return emailDeliveryRepository.getByInterview(interviewId)
}

async function resendMagicLink(interviewId, companyId) {
  const interview = await interviewRepository.getById(interviewId)
  if (!interview) throw new Error('Interview not found')

  const candidateEmail = interview.candidate_email
  const candidateName  = `${interview.candidate_first || ''} ${interview.candidate_last || ''}`.trim()

  if (!candidateEmail) throw new Error('Candidate not found')

  let inviteSent = false
  let inviteFailure = null
  try {
    await emailService.sendMagicLink(candidateEmail, {
      candidateName,
      interviewToken: interview.token,
      companyName: '',
      jobTitle: 'Assessment',
      windowDays: 7,
    })
    inviteSent = true
  } catch (err) {
    inviteFailure = err.message
    console.error('resendMagicLink failed:', err)
  }

  await emailDeliveryRepository.create({
    kind: 'magic_link_resend',
    interviewId,
    intendedTo: candidateEmail,
    deliveredTo: emailService.getDeliveredRecipients(candidateEmail).join(','),
    status: inviteSent ? 'sent' : 'failed',
    error: inviteFailure,
  }).catch(err => console.error('resend delivery log failed:', err.message))

  return { status: inviteSent ? 'sent' : 'failed', message: inviteSent ? 'Resent successfully' : inviteFailure }
}

// Returns available interview metadata for the magic-link landing page
async function getAvailableSlots(token) {
  const interview = await interviewRepository.getByToken(token)
  if (!interview) return null
  return {
    id: interview.id,
    type: interview.type,
    status: interview.status,
    tokenExpires: interview.token_expires,
  }
}

module.exports = {
  createSchedule,
  getCalendarEvents,
  getInterviewers,
  getOrgUsers,
  getEmailDeliveries,
  resendMagicLink,
  getAvailableSlots,
}
