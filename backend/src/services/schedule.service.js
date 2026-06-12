const crypto = require('crypto')
const interviewRepository = require('../repositories/interview.repository')
const externalCandidateRepository = require('../repositories/external-candidate.repository')
const teamMemberRepository = require('../repositories/team-member.repository')
const userRepository = require('../repositories/user.repository')
const clientTemplateRepository = require('../repositories/client-template.repository')
const monthlyAssessmentRepository = require('../repositories/monthly-assessment.repository')
const emailDeliveryRepository = require('../repositories/email-delivery.repository')
const emailService = require('./email.service')

async function validateContext(data, managerId) {
  if (data.clientTemplateId && data.monthlyAssessmentId) {
    throw new Error('Choose either a client template or a monthly assessment')
  }
  if (data.clientTemplateId) {
    const template = await clientTemplateRepository.getById(
      Number(data.clientTemplateId),
      managerId
    )
    if (!template) throw new Error('Client template not found')
  }
  if (data.monthlyAssessmentId) {
    const assessment = await monthlyAssessmentRepository.getByIdForManager(
      Number(data.monthlyAssessmentId),
      managerId
    )
    if (!assessment) throw new Error('Monthly assessment not found')
  }
}

async function createSchedule(data, managerId, companyId) {
  if (!data.teamMemberId && !data.candidateId) {
    throw new Error('teamMemberId or candidateId is required')
  }
  if (!['ai_voice', 'exam'].includes(data.type)) throw new Error('Invalid interview type')
  if (!['simple', 'adaptive'].includes(data.interviewMode)) {
    throw new Error('Invalid interview mode')
  }
  await validateContext(data, managerId)

  let candidateName = ''
  let candidateEmail = ''
  let internalUserId = null
  let externalCandidateId = null

  if (data.teamMemberId) {
    const teamMember = await teamMemberRepository.getByIdForManager(
      Number(data.teamMemberId),
      managerId
    )
    if (!teamMember) throw new Error('Team member not found')
    internalUserId = teamMember.user_id
    candidateName = `${teamMember.first_name} ${teamMember.last_name}`.trim()
    candidateEmail = teamMember.email
  } else {
    const candidate = await externalCandidateRepository.getByIdForCompany(
      Number(data.candidateId),
      companyId
    )
    if (!candidate) throw new Error('Candidate not found')
    externalCandidateId = candidate.id
    candidateName = `${candidate.first_name} ${candidate.last_name}`.trim()
    candidateEmail = candidate.email
  }

  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const windowDays = 7
  const tokenExpires = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000)

  const interview = await interviewRepository.create({
    managerId,
    internalUserId,
    externalCandidateId,
    type: data.type,
    interviewMode: data.type === 'exam' ? 'simple' : data.interviewMode,
    difficulty: data.difficulty || 'medium',
    questionCount: data.questionCount || 10,
    tokenHash,
    tokenExpires,
    clientTemplateId: data.clientTemplateId || null,
    monthlyAssessmentId: data.monthlyAssessmentId || null,
    reportEmails: data.reportEmails || null,
  })

  finishScheduleSetup({
    interview,
    candidateEmail,
    candidateName,
    data,
    token,
    windowDays,
  }).catch(err => console.error('finishScheduleSetup failed:', err))

  return {
    ...interview,
    inviteSent: false,
    inviteStatus: 'pending',
    inviteMessage: 'Invite email is being sent.',
  }
}

async function finishScheduleSetup({
  interview,
  candidateEmail,
  candidateName,
  data,
  token,
  windowDays,
}) {
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

async function getCalendarEvents(managerId) {
  const interviews = await interviewRepository.getByManager(managerId)
  return interviews.map(interview => ({
    id: interview.id,
    type: interview.type,
    candidateName: `${interview.candidate_first || ''} ${interview.candidate_last || ''}`.trim(),
    status: interview.status,
    result: interview.result,
    created: interview.created,
    teamMemberId: interview.team_member_id || null,
  }))
}

async function getOrgUsers(companyId) {
  return userRepository.getByCompany(companyId)
}

async function getEmailDeliveries(interviewId, managerId) {
  const interview = await interviewRepository.getById(interviewId)
  if (!interview) throw new Error('Interview not found')
  if (Number(interview.manager_id) !== Number(managerId)) throw new Error('Forbidden')
  return emailDeliveryRepository.getByInterview(interviewId)
}

async function resendMagicLink(interviewId, managerId) {
  const interview = await interviewRepository.getById(interviewId)
  if (!interview) throw new Error('Interview not found')
  if (Number(interview.manager_id) !== Number(managerId)) throw new Error('Forbidden')
  if (interview.status === 'completed') throw new Error('Interview already completed')

  const candidateEmail = interview.candidate_email
  const candidateName = `${interview.candidate_first || ''} ${interview.candidate_last || ''}`.trim()
  if (!candidateEmail) throw new Error('Candidate not found')

  const newToken = crypto.randomBytes(32).toString('hex')
  const newTokenHash = crypto.createHash('sha256').update(newToken).digest('hex')
  const windowDays = 7
  const tokenExpires = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000)
  await interviewRepository.updateTokenHash(interviewId, newTokenHash, tokenExpires)

  let inviteSent = false
  let inviteFailure = null
  try {
    await emailService.sendMagicLink(candidateEmail, {
      candidateName,
      interviewToken: newToken,
      companyName: '',
      jobTitle: 'Assessment',
      windowDays,
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

  return {
    status: inviteSent ? 'sent' : 'failed',
    message: inviteSent ? 'Resent successfully' : inviteFailure,
  }
}

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
  getOrgUsers,
  getEmailDeliveries,
  resendMagicLink,
  getAvailableSlots,
}
