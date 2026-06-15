const monthlyAssessmentRepository = require('../repositories/monthly-assessment.repository')
const teamMemberRepository = require('../repositories/team-member.repository')
const companyRepository = require('../repositories/company.repository')
const emailService = require('./email.service')

function parseArray(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function addMonths(date, months) {
  const result = new Date(date)
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(
    result.getUTCFullYear(),
    result.getUTCMonth() + 1,
    0
  )).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  result.setUTCDate(result.getUTCDate() - 1)
  return result
}

async function createAssessment(body, managerId, companyId) {
  const teamMemberIds = Array.isArray(body.team_member_ids)
    ? [...new Set(body.team_member_ids.map(Number).filter(Number.isInteger))]
    : []

  const subjectName = String(body.subject_name || body.subject || '').trim()
  if (!subjectName) throw new Error('Subject is required')
  const durationMonths = Math.min(12, Math.max(1, Number(body.duration_months) || 1))
  if (teamMemberIds.length > 0) {
    const ownedMembers = await teamMemberRepository.getByIdsForManager(teamMemberIds, managerId)
    if (ownedMembers.length !== teamMemberIds.length) {
      throw new Error('Forbidden: some team members do not belong to you')
    }
    const startDate = body.assessment_date ? new Date(body.assessment_date) : new Date()
    if (Number.isNaN(startDate.getTime())) throw new Error('Assessment date is invalid')
  }

  const assessment = await monthlyAssessmentRepository.createTemplate({
    managerId,
    subjectName,
    difficulty: ['easy', 'medium', 'hard'].includes(body.difficulty) ? body.difficulty : 'medium',
    topics: parseArray(body.topics),
    subTopics: parseArray(body.sub_topics),
    jd: String(body.ai_generated_jd || body.jd_text || ''),
    durationMonths,
  })

  if (teamMemberIds.length === 0) {
    return { ...assessment, enrollments: [], invitations: { sent: 0, failed: 0 } }
  }

  const assignment = await assignCandidates(
    assessment.id,
    {
      team_member_ids: teamMemberIds,
      assessment_date: body.assessment_date,
    },
    managerId,
    companyId
  )
  return { ...assessment, ...assignment }
}

async function sendAssignmentInvitations({
  assessment,
  members,
  companyId,
  startDate,
}) {
  const company = await companyRepository.getById(companyId)
  const recipients = members.filter(member => member?.email)
  const invitationResults = await Promise.allSettled(recipients.map(async member => {
    await emailService.sendMonthlyAssessmentInvite(member.email, {
      candidateName: `${member.first_name} ${member.last_name}`.trim(),
      companyName: company?.name || 'Your company',
      subject: assessment.subject_name,
      assessmentDate: startDate,
      durationMonths: assessment.duration_months,
      jdText: assessment.ai_generated_jd || '',
    })
  }))
  return {
    sent: invitationResults.filter(result => result.status === 'fulfilled').length,
    failed: invitationResults.filter(result => result.status === 'rejected').length,
  }
}

async function assignCandidates(assessmentId, body, managerId, companyId) {
  const assessment = await monthlyAssessmentRepository.getByIdForManager(
    Number(assessmentId),
    managerId
  )
  if (!assessment) throw new Error('Monthly assessment not found')

  const teamMemberIds = Array.isArray(body.team_member_ids)
    ? [...new Set(body.team_member_ids.map(Number).filter(Number.isInteger))]
    : []
  if (teamMemberIds.length === 0) throw new Error('At least one team member is required')

  const ownedMembers = await teamMemberRepository.getByIdsForManager(teamMemberIds, managerId)
  if (ownedMembers.length !== teamMemberIds.length) {
    throw new Error('Forbidden: some team members do not belong to you')
  }

  const startDate = body.assessment_date ? new Date(body.assessment_date) : new Date()
  if (Number.isNaN(startDate.getTime())) throw new Error('Assessment date is invalid')
  const endDate = addMonths(startDate, Number(assessment.duration_months) || 1)
  const enrollments = await monthlyAssessmentRepository.createEnrollments(
    assessment.id,
    teamMemberIds,
    {
      startDate,
      endDate,
      durationMonths: Number(assessment.duration_months) || 1,
    }
  )
  const invitations = await sendAssignmentInvitations({
    assessment,
    members: ownedMembers,
    companyId,
    startDate,
  })

  return {
    enrollments,
    invitations,
  }
}

async function getAssessments(managerId) {
  const [assessments, enrollments] = await Promise.all([
    monthlyAssessmentRepository.getByManager(managerId),
    monthlyAssessmentRepository.getEnrollmentsByManager(managerId),
  ])
  const byAssessment = new Map()
  for (const enrollment of enrollments) {
    const list = byAssessment.get(enrollment.assessment_id) || []
    list.push(enrollment)
    byAssessment.set(enrollment.assessment_id, list)
  }
  return assessments.map(assessment => ({
    ...assessment,
    enrollments: byAssessment.get(assessment.id) || [],
  }))
}

function monthIndexForDate(startDate, year, month) {
  const start = new Date(startDate)
  if (Number.isNaN(start.getTime())) return -1
  return (year - start.getUTCFullYear()) * 12 + (month - start.getUTCMonth())
}

async function getMonthPlan(managerId, monthValue) {
  if (!/^\d{4}-\d{2}$/.test(String(monthValue || ''))) {
    throw new Error('Month must use YYYY-MM format')
  }
  const [year, monthNumber] = String(monthValue).split('-').map(Number)
  if (monthNumber < 1 || monthNumber > 12) throw new Error('Month must use YYYY-MM format')
  const monthIndex = monthNumber - 1

  const [assessments, enrollments, teamMembers] = await Promise.all([
    monthlyAssessmentRepository.getByManager(managerId),
    monthlyAssessmentRepository.getEnrollmentsByManager(managerId),
    teamMemberRepository.getByManager(managerId),
  ])
  const activeEnrollments = enrollments.filter(enrollment => {
    const index = monthIndexForDate(enrollment.start_date, year, monthIndex)
    const progress = parseArray(enrollment.month_progress)
    const assessment = assessments.find(item => item.id === enrollment.assessment_id)
    const duration = Number(assessment?.duration_months) || progress.length || 1
    return index >= 0 && index < duration
  })
  const assignedTeamMemberIds = new Set(
    activeEnrollments.map(enrollment => Number(enrollment.team_member_id))
  )
  const byAssessment = new Map()
  for (const enrollment of activeEnrollments) {
    const candidates = byAssessment.get(enrollment.assessment_id) || []
    candidates.push(enrollment)
    byAssessment.set(enrollment.assessment_id, candidates)
  }

  return {
    month: monthValue,
    subjects: assessments.map(assessment => ({
      ...assessment,
      candidates: byAssessment.get(assessment.id) || [],
    })),
    unassigned: teamMembers.filter(member => !assignedTeamMemberIds.has(Number(member.id))),
    assignedCount: assignedTeamMemberIds.size,
    teamCount: teamMembers.length,
  }
}

module.exports = {
  createAssessment,
  assignCandidates,
  getAssessments,
  getMonthPlan,
  parseArray,
  addMonths,
  monthIndexForDate,
}
