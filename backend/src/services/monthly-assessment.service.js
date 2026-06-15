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
  if (teamMemberIds.length === 0) throw new Error('At least one team member is required')

  const ownedMembers = await teamMemberRepository.getByManager(managerId)
  const ownedIds = new Set(ownedMembers.map(member => Number(member.id)))
  if (teamMemberIds.some(id => !ownedIds.has(id))) {
    throw new Error('Forbidden: some team members do not belong to you')
  }

  const subjectName = String(body.subject_name || body.subject || '').trim()
  if (!subjectName) throw new Error('Subject is required')
  const durationMonths = Math.min(12, Math.max(1, Number(body.duration_months) || 1))
  const startDate = body.assessment_date ? new Date(body.assessment_date) : new Date()
  if (Number.isNaN(startDate.getTime())) throw new Error('Assessment date is invalid')
  const endDate = addMonths(startDate, durationMonths)

  const assessment = await monthlyAssessmentRepository.createWithEnrollments({
    managerId,
    subjectName,
    difficulty: ['easy', 'medium', 'hard'].includes(body.difficulty) ? body.difficulty : 'medium',
    topics: parseArray(body.topics),
    subTopics: parseArray(body.sub_topics),
    jd: String(body.ai_generated_jd || body.jd_text || ''),
    durationMonths,
    startDate,
    endDate,
  }, teamMemberIds)

  const membersById = new Map(ownedMembers.map(member => [Number(member.id), member]))
  const company = await companyRepository.getById(companyId)
  const invitationResults = await Promise.allSettled(teamMemberIds.map(async teamMemberId => {
    const member = membersById.get(teamMemberId)
    if (!member?.email) return
    try {
      await emailService.sendMonthlyAssessmentInvite(member.email, {
        candidateName: `${member.first_name} ${member.last_name}`.trim(),
        companyName: company?.name || 'Your company',
        subject: subjectName,
        assessmentDate: startDate,
        durationMonths,
        jdText: String(body.ai_generated_jd || body.jd_text || ''),
      })
    } catch (error) {
      throw error
    }
  }))

  return {
    ...assessment,
    invitations: {
      sent: invitationResults.filter(result => result.status === 'fulfilled').length,
      failed: invitationResults.filter(result => result.status === 'rejected').length,
    },
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

module.exports = { createAssessment, getAssessments, parseArray, addMonths }
