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
  await db.query(
    `UPDATE monthly_assessment_enrollments
     SET interview_id = @interviewId, status = 'scheduled'
     WHERE id = @id`,
    { id: enrollmentId, interviewId }
  )
}

module.exports = {
  create, createEnrollment, createWithEnrollments, getByManager, getByIdForManager,
  getEnrollmentsByAssessment, getEnrollmentsByManager,
  getCalendarByManager, updateEnrollmentInterview,
}
