const monthlyAssessmentRepository = require('../repositories/monthly-assessment.repository')
const teamMemberRepository = require('../repositories/team-member.repository')

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

async function createAssessment(body, managerId) {
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

  return monthlyAssessmentRepository.createWithEnrollments({
    managerId,
    subjectName,
    difficulty: ['easy', 'medium', 'hard'].includes(body.difficulty) ? body.difficulty : 'medium',
    topics: parseArray(body.topics),
    subTopics: parseArray(body.sub_topics),
    jd: String(body.ai_generated_jd || body.jd_text || ''),
    durationMonths,
  }, teamMemberIds)
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

module.exports = { createAssessment, getAssessments, parseArray }
