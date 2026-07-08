// backend/src/repositories/monthly-assessment.repository.js
const db = require('../db/connection')

async function create(data) {
  const rows = await db.query(
    `INSERT INTO monthly_assessments 
      (manager_id, subject_name, difficulty, topics, sub_topics, ai_generated_jd, duration_months)
     VALUES 
      (@manager_id, @subject_name, @difficulty, @topics, @sub_topics, @ai_generated_jd, @duration_months)
     RETURNING *`,
    {
      manager_id: data.manager_id,
      subject_name: data.subject_name,
      difficulty: data.difficulty || 'medium',
      topics: JSON.stringify(data.topics || []),
      sub_topics: JSON.stringify(data.sub_topics || []),
      ai_generated_jd: data.ai_generated_jd || '',
      duration_months: data.duration_months || 1
    }
  )
  return rows[0]
}

async function createEnrollment(data) {
  const rows = await db.query(
    `INSERT INTO monthly_assessment_enrollments 
      (assessment_id, team_member_id, start_date, end_date, month_progress)
     VALUES 
      (@assessment_id, @team_member_id, @start_date, @end_date, @month_progress)
     RETURNING *`,
    {
      assessment_id: data.assessment_id,
      team_member_id: data.team_member_id,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      month_progress: JSON.stringify(data.month_progress || [])
    }
  )
  return rows[0]
}

async function createWithEnrollments(data, teamMemberIds) {
  return db.transaction(async (tx) => {
    const assessments = await tx.query(
      `INSERT INTO monthly_assessments
        (manager_id, subject_name, difficulty, topics, sub_topics, ai_generated_jd, duration_months)
       VALUES
        (@managerId, @subjectName, @difficulty, @topics, @subTopics, @jd, @durationMonths)
       RETURNING *`,
      {
        managerId: data.managerId,
        subjectName: data.subjectName,
        difficulty: data.difficulty,
        topics: JSON.stringify(data.topics),
        subTopics: JSON.stringify(data.subTopics),
        jd: data.jd,
        durationMonths: data.durationMonths,
      }
    )
    const assessment = assessments[0]
    const monthProgress = JSON.stringify(new Array(data.durationMonths).fill('pending'))
    const enrollments = []

    for (const teamMemberId of teamMemberIds) {
      const rows = await tx.query(
        `INSERT INTO monthly_assessment_enrollments
          (assessment_id, team_member_id, start_date, end_date, month_progress)
         VALUES
          (@assessmentId, @teamMemberId, @startDate, @endDate, @monthProgress)
         RETURNING *`,
        {
          assessmentId: assessment.id,
          teamMemberId,
          startDate: data.startDate,
          endDate: data.endDate,
          monthProgress,
        }
      )
      enrollments.push(rows[0])
    }

    return { ...assessment, enrollments }
  })
}

async function createTemplate(data) {
  const rows = await db.query(
    `INSERT INTO monthly_assessments
      (manager_id, subject_name, difficulty, topics, sub_topics, ai_generated_jd, duration_months)
     VALUES
      (@managerId, @subjectName, @difficulty, @topics, @subTopics, @jd, @durationMonths)
     RETURNING *`,
    {
      managerId: data.managerId,
      subjectName: data.subjectName,
      difficulty: data.difficulty,
      topics: JSON.stringify(data.topics),
      subTopics: JSON.stringify(data.subTopics),
      jd: data.jd,
      durationMonths: data.durationMonths,
    }
  )
  return rows[0]
}

async function createEnrollments(assessmentId, teamMemberIds, data) {
  return db.transaction(async (tx) => {
    const monthProgress = JSON.stringify(new Array(data.durationMonths).fill('pending'))
    const enrollments = []
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
           AND e.start_date <= @endDate
           AND e.end_date >= @startDate
         LIMIT 1`,
        {
          assessmentId,
          teamMemberId,
          startDate: data.startDate,
          endDate: data.endDate,
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

      const rows = await tx.query(
        `INSERT INTO monthly_assessment_enrollments
          (assessment_id, team_member_id, start_date, end_date, month_progress)
         VALUES
          (@assessmentId, @teamMemberId, @startDate, @endDate, @monthProgress)
         RETURNING *`,
        {
          assessmentId,
          teamMemberId,
          startDate: data.startDate,
          endDate: data.endDate,
          monthProgress,
        }
      )
      enrollments.push(rows[0])
    }
    return enrollments
  })
}

async function getByManager(managerId) {
  return db.query(
    `SELECT * FROM monthly_assessments WHERE manager_id = @managerId ORDER BY created DESC`,
    { managerId }
  )
}

async function getByIdForManager(id, managerId) {
  const rows = await db.query(
    `SELECT *
     FROM monthly_assessments
     WHERE id = @id AND manager_id = @managerId`,
    { id, managerId }
  )
  return rows[0] || null
}

async function getEnrollmentsByAssessment(assessmentId) {
  return db.query(
    `SELECT e.*, tm.user_id, tm.manager_id, u.first_name, u.last_name, u.email, u.availability
     FROM monthly_assessment_enrollments e
     JOIN team_members tm ON tm.id = e.team_member_id
     JOIN users u ON u.id = tm.user_id
     WHERE e.assessment_id = @assessmentId`,
    { assessmentId }
  )
}

async function getEnrollmentsByManager(managerId) {
  return db.query(
    `SELECT e.*, tm.user_id, tm.manager_id, u.first_name, u.last_name, u.email, u.availability
     FROM monthly_assessment_enrollments e
     JOIN monthly_assessments a ON a.id = e.assessment_id
     JOIN team_members tm ON tm.id = e.team_member_id
     JOIN users u ON u.id = tm.user_id
     WHERE a.manager_id = @managerId
     ORDER BY e.created`,
    { managerId }
  )
}

// Calendar view: all enrollments for a manager with interview status
async function getCalendarByManager(managerId) {
  return db.query(
    `SELECT e.*, a.subject_name, a.difficulty, a.duration_months,
            a.created AS assessment_created,
            tm.user_id, u.first_name, u.last_name,
            i.id AS interview_id, i.status AS interview_status, i.result AS interview_result
     FROM monthly_assessment_enrollments e
     JOIN monthly_assessments a ON a.id = e.assessment_id
     JOIN team_members tm ON tm.id = e.team_member_id
     JOIN users u ON u.id = tm.user_id
     LEFT JOIN interviews i ON i.id = e.interview_id
     WHERE a.manager_id = @managerId
     ORDER BY a.created DESC, u.first_name`,
    { managerId }
  )
}

// Called when a month-end interview is created from an enrollment
async function updateEnrollmentInterview(enrollmentId, interviewId) {
  const rows = await db.query(
    `UPDATE monthly_assessment_enrollments
     SET interview_id = @interviewId, status = 'scheduled'
     WHERE id = @id
     RETURNING *`,
    { id: enrollmentId, interviewId }
  )
  return rows[0] || null
}

async function cancelEnrollment(enrollmentId, managerId) {
  return db.transaction(async tx => {
    const rows = await tx.query(
      `SELECT e.*, a.subject_name
       FROM monthly_assessment_enrollments e
       JOIN monthly_assessments a ON a.id = e.assessment_id
       WHERE e.id = @enrollmentId
         AND a.manager_id = @managerId
       LIMIT 1`,
      { enrollmentId, managerId }
    )
    const enrollment = rows[0]
    if (!enrollment) return null
    if (enrollment.status === 'cancelled') return enrollment

    const updated = await tx.query(
      `UPDATE monthly_assessment_enrollments
       SET status = 'cancelled'
       WHERE id = @enrollmentId
       RETURNING *`,
      { enrollmentId }
    )

    if (enrollment.interview_id) {
      await tx.query(
        `UPDATE interviews
         SET status = 'cancelled', result = 'cancelled'
         WHERE id = @interviewId
           AND status = 'scheduled'`,
        { interviewId: enrollment.interview_id }
      )
    }

    return { ...updated[0], subject_name: enrollment.subject_name }
  })
}

module.exports = {
  create, createEnrollment, createWithEnrollments, createTemplate, createEnrollments,
  getByManager, getByIdForManager,
  getEnrollmentsByAssessment, getEnrollmentsByManager,
  getCalendarByManager, updateEnrollmentInterview, cancelEnrollment,
}
