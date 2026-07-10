const monthlyAssessmentRepository = require('../repositories/monthly-assessment.repository')
const teamMemberRepository = require('../repositories/team-member.repository')
const companyRepository = require('../repositories/company.repository')
const emailService = require('./email.service')
const scheduleService = require('./schedule.service')
const { parseStoredArray } = require('../utils/parse')

const parseArray = parseStoredArray

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

function shiftMonths(date, months) {
  const source = new Date(date)
  const result = new Date(source)
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(
    result.getUTCFullYear(),
    result.getUTCMonth() + 1,
    0
  )).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  return result
}

function normalizeWindow(body, fallbackDurationMinutes) {
  const startValue = String(
    body.available_from
    || body.availableFrom
    || body.assessment_date
    || body.scheduledAt
    || ''
  ).trim()
  if (!startValue) throw new Error('Assessment date is required')

  const startDate = new Date(startValue)
  if (Number.isNaN(startDate.getTime())) throw new Error('Assessment date is invalid')

  const dueValue = String(body.due_at || body.dueAt || '').trim()
  const dueAt = dueValue
    ? new Date(dueValue)
    : new Date(startDate.getTime() + fallbackDurationMinutes * 60000)
  if (Number.isNaN(dueAt.getTime())) throw new Error('Due date is invalid')
  if (dueAt <= startDate) throw new Error('Due date must be after the available date')

  return { startDate, dueAt }
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
    const durationMinutes = Number(body.duration_minutes || body.durationMinutes || 60)
    normalizeWindow(body, Number.isInteger(durationMinutes) ? durationMinutes : 60)
  }

  const assessment = await monthlyAssessmentRepository.createTemplate({
    managerId,
    subjectName,
    difficulty: ['easy', 'medium', 'hard'].includes(body.difficulty) ? body.difficulty : 'medium',
    topics: parseArray(body.topics),
    subTopics: parseArray(body.sub_topics),
    jd: String(body.ai_generated_jd || body.jd_text || ''),
    durationMonths,
    interviewType: body.interview_type === 'ai_voice' ? 'ai_voice' : 'exam',
    interviewMode: body.interview_type === 'ai_voice'
      ? (['simple', 'adaptive'].includes(body.interview_mode) ? body.interview_mode : 'simple')
      : 'simple',
  })

  if (teamMemberIds.length === 0) {
    return { ...assessment, enrollments: [], invitations: { sent: 0, failed: 0 } }
  }

  const assignment = await assignCandidates(
    assessment.id,
    {
      team_member_ids: teamMemberIds,
      assessment_date: body.assessment_date,
      available_from: body.available_from || body.availableFrom,
      due_at: body.due_at || body.dueAt,
      schedule_timezone: body.schedule_timezone || body.scheduleTimezone,
      question_count: body.question_count || body.questionCount,
      duration_minutes: body.duration_minutes || body.durationMinutes,
      interview_type: body.interview_type,
      interview_mode: body.interview_mode,
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
  endDate,
}) {
  const company = await companyRepository.getById(companyId)
  const recipients = members.filter(member => member?.email)
  const invitationResults = await Promise.allSettled(recipients.map(async member => {
    await emailService.sendMonthlyAssessmentInvite(member.email, {
      candidateName: `${member.first_name} ${member.last_name}`.trim(),
      companyName: company?.name || 'Your company',
      subject: assessment.subject_name,
      assessmentDate: startDate,
      assessmentEndDate: endDate,
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

  const questionCount = Number(body.question_count || body.questionCount || 10)
  if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 50) {
    throw new Error('Question count must be an integer between 1 and 50')
  }
  const durationMinutes = Number(body.duration_minutes || body.durationMinutes || 60)
  if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 180) {
    throw new Error('Duration must be an integer between 15 and 180 minutes')
  }
  const { startDate, dueAt: firstDueAt } = normalizeWindow(body, durationMinutes)
  const scheduleTimezone = body.schedule_timezone || body.scheduleTimezone || 'UTC'
  const endDate = addMonths(startDate, Number(assessment.duration_months) || 1)
  
  const company = await companyRepository.getById(companyId)
  
  const db = require('../db/connection')
  const scheduledEnrollments = await db.transaction(async (tx) => {
    const enrollments = []
    const memberByTeamMemberId = new Map(ownedMembers.map(member => [Number(member.id), member]))
    const interviewType = assessment.interview_type === 'ai_voice' ? 'ai_voice' : 'exam'
    const interviewMode = interviewType === 'ai_voice'
      ? (assessment.interview_mode || 'simple')
      : 'simple'

    for (const teamMemberId of teamMemberIds) {
      const overlapping = await tx.query(
        `SELECT e.id, e.assessment_id, e.start_date, e.end_date,
                a.subject_name, a.duration_months
         FROM monthly_assessment_enrollments e
         JOIN monthly_assessments a ON a.id = e.assessment_id
         JOIN monthly_assessments selected ON selected.id = @assessmentId
         WHERE e.team_member_id = @teamMemberId
           AND a.manager_id = selected.manager_id
           AND COALESCE(e.status, 'pending') != 'cancelled'
           AND e.start_date < @endDate
           AND e.end_date > @startDate
         LIMIT 1`,
        {
          assessmentId: assessment.id,
          teamMemberId,
          startDate,
          endDate,
        }
      )
      if (overlapping[0]) {
        const conflict = overlapping[0]
        const error = new Error(
          `Candidate already has "${conflict.subject_name}" scheduled from `
          + `${new Date(conflict.start_date).toISOString().slice(0, 10)} to `
          + `${new Date(conflict.end_date).toISOString().slice(0, 10)}`
        )
        error.code = 'MONTHLY_ASSESSMENT_CONFLICT'
        error.conflict = conflict
        throw error
      }

      const eRows = await tx.query(
        `INSERT INTO monthly_assessment_enrollments
          (assessment_id, team_member_id, start_date, end_date, status)
         VALUES
          (@assessmentId, @teamMemberId, @startDate, @endDate, 'scheduled')
         RETURNING *`,
        {
          assessmentId: assessment.id,
          teamMemberId,
          startDate,
          endDate,
        }
      )
      const enrollment = eRows[0]
      const member = memberByTeamMemberId.get(Number(enrollment.team_member_id))
      const occurrenceIds = []
      let firstInterviewId = null
      const durationMonths = Number(assessment.duration_months) || 1

      for (let monthOffset = 0; monthOffset < durationMonths; monthOffset += 1) {
        const occurrenceAvailableFrom = shiftMonths(startDate, monthOffset)
        const occurrenceDueAt = shiftMonths(firstDueAt, monthOffset)
        const periodMonth = new Date(Date.UTC(
          occurrenceAvailableFrom.getUTCFullYear(),
          occurrenceAvailableFrom.getUTCMonth(),
          1
        ))

        const iRows = await tx.query(
          `INSERT INTO interviews
            (manager_id, internal_user_id, type, interview_mode, difficulty, question_count,
             duration_minutes, scheduled_at, available_from, due_at, schedule_timezone,
             monthly_assessment_id)
           VALUES
            (@managerId, @internalUserId, @interviewType, @interviewMode, @difficulty, @questionCount,
             @durationMinutes, @scheduledAt, @availableFrom, @dueAt, @scheduleTimezone,
             @monthlyAssessmentId)
           RETURNING *`,
          {
            managerId,
            internalUserId: member.user_id,
            interviewType,
            interviewMode,
            difficulty: assessment.difficulty || 'medium',
            questionCount,
            durationMinutes,
            scheduledAt: occurrenceAvailableFrom.toISOString(),
            availableFrom: occurrenceAvailableFrom.toISOString(),
            dueAt: occurrenceDueAt.toISOString(),
            scheduleTimezone,
            monthlyAssessmentId: assessment.id,
          }
        )
        const interview = iRows[0]
        if (!firstInterviewId) firstInterviewId = interview.id

        const occurrenceRows = await tx.query(
          `INSERT INTO monthly_assessment_occurrences
            (enrollment_id, period_month, available_from, due_at, duration_minutes, interview_id, status)
           VALUES
            (@enrollmentId, @periodMonth, @availableFrom, @dueAt, @durationMinutes, @interviewId, 'scheduled')
           RETURNING *`,
          {
            enrollmentId: enrollment.id,
            periodMonth: periodMonth.toISOString().slice(0, 10),
            availableFrom: occurrenceAvailableFrom.toISOString(),
            dueAt: occurrenceDueAt.toISOString(),
            durationMinutes,
            interviewId: interview.id,
          }
        )
        occurrenceIds.push(occurrenceRows[0].id)

        if (member && member.email) {
          const payload = {
            candidateName: `${member.first_name} ${member.last_name}`.trim(),
            companyName: company?.name || 'Your organization',
            jobTitle: assessment.subject_name,
            details: assessment.ai_generated_jd || null,
          }
          await tx.query(
            `INSERT INTO email_outbox_jobs (event_key, interview_id, recipient, payload, send_after, status)
             VALUES (@eventKey, @interviewId, @recipient, @payload, @sendAfter, 'pending')
             ON CONFLICT (event_key) DO NOTHING`,
            {
              eventKey: `monthly_occurrence_${enrollment.id}_${periodMonth.toISOString().slice(0, 7)}`,
              interviewId: interview.id,
              recipient: member.email,
              payload: JSON.stringify(payload),
              sendAfter: occurrenceAvailableFrom.toISOString(),
            }
          )
        }
      }

      enrollments.push({
        ...enrollment,
        first_interview_id: firstInterviewId,
        status: 'scheduled',
        candidate_email: member?.email || null,
        occurrence_ids: occurrenceIds,
      })
    }
    return enrollments
  })

  const invitations = await sendAssignmentInvitations({
    assessment,
    members: ownedMembers,
    companyId,
    startDate,
    endDate,
  })

  return {
    enrollments: scheduledEnrollments,
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
    const assessment = assessments.find(item => item.id === enrollment.assessment_id)
    const duration = Number(assessment?.duration_months) || 1
    return index >= 0 && index < duration
  })
  const assignedTeamMemberIds = new Set(
    activeEnrollments
      .filter(e => e.status !== 'cancelled')
      .map(enrollment => Number(enrollment.team_member_id))
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

async function cancelEnrollment(enrollmentId, managerId) {
  const enrollment = await monthlyAssessmentRepository.cancelEnrollment(
    Number(enrollmentId),
    managerId
  )
  if (!enrollment) throw new Error('Monthly enrollment not found')
  return enrollment
}

async function deleteEnrollment(enrollmentId, managerId) {
  const enrollment = await monthlyAssessmentRepository.deleteEnrollment(
    Number(enrollmentId),
    managerId
  )
  if (!enrollment) throw new Error('Monthly enrollment not found')
  return enrollment
}

async function updateAssessment(id, managerId, data) {
  const assessment = await monthlyAssessmentRepository.updateTemplate(
    Number(id),
    managerId,
    data
  )
  if (!assessment) throw new Error('Monthly assessment not found')
  return assessment
}

async function deleteAssessment(id, managerId) {
  const assessment = await monthlyAssessmentRepository.deleteTemplate(
    Number(id),
    managerId
  )
  if (!assessment) throw new Error('Monthly assessment not found')
  return assessment
}

module.exports = {
  createAssessment,
  assignCandidates,
  getAssessments,
  getMonthPlan,
  cancelEnrollment,
  deleteEnrollment,
  updateAssessment,
  deleteAssessment,
  parseArray,
  addMonths,
  monthIndexForDate,
}
