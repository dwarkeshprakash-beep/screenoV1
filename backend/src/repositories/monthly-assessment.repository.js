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

async function getByManager(managerId) {
  return db.query(
    `SELECT * FROM monthly_assessments WHERE manager_id = @managerId ORDER BY created DESC`,
    { managerId }
  )
}

async function getEnrollmentsByAssessment(assessmentId) {
  return db.query(
    `SELECT e.*, tm.user_id, tm.manager_id, u.first_name, u.last_name, u.email 
     FROM monthly_assessment_enrollments e
     JOIN team_members tm ON tm.id = e.team_member_id
     JOIN users u ON u.id = tm.user_id
     WHERE e.assessment_id = @assessmentId`,
    { assessmentId }
  )
}

module.exports = { create, createEnrollment, getByManager, getEnrollmentsByAssessment }
