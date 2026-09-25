// backend/src/repositories/monthly-assessment.repository.js
const db = require('../db/connection')

async function createTemplate(data) {
  const rows = await db.query(
    `INSERT INTO monthly_assessments
      (manager_id, subject_name, difficulty, topics, sub_topics, ai_generated_jd, duration_months, interview_type, interview_mode)
     VALUES
      (@managerId, @subjectName, @difficulty, @topics, @subTopics, @jd, @durationMonths, @interviewType, @interviewMode)
     RETURNING *`,
    {
      managerId: data.managerId,
      subjectName: data.subjectName,
      difficulty: data.difficulty,
      topics: JSON.stringify(data.topics),
      subTopics: JSON.stringify(data.subTopics),
      jd: data.jd,
      durationMonths: data.durationMonths,
      interviewType: data.interviewType || 'exam',
      interviewMode: data.interviewMode || 'simple',
    }
  )
  return rows[0]
}

// "View" tier: subjects the caller manages (created), UNION subjects they have no
// ownership of but are personally enrolled in as a team member (assigned to them).
// This is the merge of what the old manager-only queries covered plus what the
// candidate-only /candidate/monthly-assessments endpoint used to cover separately.
async function getVisibleToUser(userId) {
  return db.query(
    `SELECT a.*
     FROM monthly_assessments a
     WHERE a.manager_id = @userId
        OR EXISTS (
          SELECT 1
          FROM monthly_assessment_enrollments e
          JOIN team_members tm ON tm.id = e.team_member_id
          WHERE e.assessment_id = a.id
            AND tm.user_id = @userId
        )
     ORDER BY a.created DESC`,
    { userId }
  )
}

// "View All" tier: every subject belonging to any manager in the caller's company.
// monthly_assessments has no direct company_id column, so company is resolved via
// the owning manager's users.company_id.
async function getByCompany(companyId) {
  return db.query(
    `SELECT a.*
     FROM monthly_assessments a
     JOIN users mgr ON mgr.id = a.manager_id
     WHERE mgr.company_id = @companyId
     ORDER BY a.created DESC`,
    { companyId }
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

// "View" tier enrollments. Note the WHERE clause is evaluated per enrollment row, not
// per assessment: for a subject the caller manages, every enrollment row matches
// (a.manager_id = @userId) so they see the full roster, same as today. For a subject
// they don't manage but are personally enrolled in, only THEIR OWN row matches
// (tm.user_id = @userId) - colleagues enrolled in that same outside subject are not
// leaked to a self-scoped viewer.
async function getEnrollmentsVisibleToUser(userId) {
  return db.query(
    `SELECT e.*, tm.user_id, tm.manager_id, u.first_name, u.last_name, u.email, u.availability
     FROM monthly_assessment_enrollments e
     JOIN monthly_assessments a ON a.id = e.assessment_id
     JOIN team_members tm ON tm.id = e.team_member_id
     JOIN users u ON u.id = tm.user_id
     WHERE a.manager_id = @userId
        OR tm.user_id = @userId
     ORDER BY e.created`,
    { userId }
  )
}

// "View All" tier enrollments: every enrollment under any subject owned by a manager
// in the caller's company.
async function getEnrollmentsByCompany(companyId) {
  return db.query(
    `SELECT e.*, tm.user_id, tm.manager_id, u.first_name, u.last_name, u.email, u.availability
     FROM monthly_assessment_enrollments e
     JOIN monthly_assessments a ON a.id = e.assessment_id
     JOIN team_members tm ON tm.id = e.team_member_id
     JOIN users u ON u.id = tm.user_id
     JOIN users mgr ON mgr.id = a.manager_id
     WHERE mgr.company_id = @companyId
     ORDER BY e.created`,
    { companyId }
  )
}

// Calendar view, "View" tier: same self/assigned-to-me merge as getEnrollmentsVisibleToUser.
async function getCalendarVisibleToUser(userId) {
  return db.query(
    `SELECT e.*, a.subject_name, a.difficulty, a.duration_months,
            a.created AS assessment_created,
            tm.user_id, u.first_name, u.last_name,
            o.id AS occurrence_id,
            o.period_month,
            o.available_from AS occurrence_available_from,
            o.due_at AS occurrence_due_at,
            o.status AS occurrence_status,
            i.id AS interview_id, i.status AS interview_status, i.result AS interview_result
     FROM monthly_assessment_enrollments e
     JOIN monthly_assessments a ON a.id = e.assessment_id
     JOIN team_members tm ON tm.id = e.team_member_id
     JOIN users u ON u.id = tm.user_id
     LEFT JOIN monthly_assessment_occurrences o ON o.enrollment_id = e.id
     LEFT JOIN interviews i ON i.id = o.interview_id
     WHERE a.manager_id = @userId
        OR tm.user_id = @userId
     ORDER BY a.created DESC, u.first_name, o.period_month`,
    { userId }
  )
}

// Calendar view, "View All" tier: every enrollment for any manager in the company.
async function getCalendarByCompany(companyId) {
  return db.query(
    `SELECT e.*, a.subject_name, a.difficulty, a.duration_months,
            a.created AS assessment_created,
            tm.user_id, u.first_name, u.last_name,
            o.id AS occurrence_id,
            o.period_month,
            o.available_from AS occurrence_available_from,
            o.due_at AS occurrence_due_at,
            o.status AS occurrence_status,
            i.id AS interview_id, i.status AS interview_status, i.result AS interview_result
     FROM monthly_assessment_enrollments e
     JOIN monthly_assessments a ON a.id = e.assessment_id
     JOIN team_members tm ON tm.id = e.team_member_id
     JOIN users u ON u.id = tm.user_id
     JOIN users mgr ON mgr.id = a.manager_id
     LEFT JOIN monthly_assessment_occurrences o ON o.enrollment_id = e.id
     LEFT JOIN interviews i ON i.id = o.interview_id
     WHERE mgr.company_id = @companyId
     ORDER BY a.created DESC, u.first_name, o.period_month`,
    { companyId }
  )
}

async function deleteEnrollment(enrollmentId, managerId) {
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

    const occurrenceInterviews = await tx.query(
      `SELECT interview_id
       FROM monthly_assessment_occurrences
       WHERE enrollment_id = @enrollmentId
         AND interview_id IS NOT NULL`,
      { enrollmentId }
    )
    const interviewIds = occurrenceInterviews.map(row => row.interview_id).filter(Boolean)

    await tx.query(
      `DELETE FROM email_outbox_jobs
       WHERE event_key LIKE @eventKey`,
      { eventKey: `monthly_occurrence_${enrollmentId}_%` }
    )
    await tx.query(
      `DELETE FROM assignment_requests
       WHERE enrollment_id = @enrollmentId`,
      { enrollmentId }
    )

    if (interviewIds.length > 0) {
      await tx.query(`DELETE FROM email_deliveries WHERE interview_id = ANY(@interviewIds)`, { interviewIds })
      await tx.query(`DELETE FROM report_jobs WHERE interview_id = ANY(@interviewIds)`, { interviewIds })
      await tx.query(`DELETE FROM reports WHERE interview_id = ANY(@interviewIds)`, { interviewIds })
      await tx.query(`DELETE FROM scorecards WHERE interview_id = ANY(@interviewIds)`, { interviewIds })
      await tx.query(`DELETE FROM transcripts WHERE interview_id = ANY(@interviewIds)`, { interviewIds })
      await tx.query(`DELETE FROM interviews WHERE id = ANY(@interviewIds)`, { interviewIds })
    }

    await tx.query(
      `DELETE FROM monthly_assessment_occurrences
       WHERE enrollment_id = @enrollmentId`,
      { enrollmentId }
    )

    const deleted = await tx.query(
      `DELETE FROM monthly_assessment_enrollments
       WHERE id = @enrollmentId
       RETURNING *`,
      { enrollmentId }
    )

    return { ...deleted[0], subject_name: enrollment.subject_name, deleted: true }
  })
}

async function updateTemplate(id, managerId, data) {
  const rows = await db.query(
    `UPDATE monthly_assessments
     SET subject_name   = COALESCE(@subjectName, subject_name),
         difficulty     = COALESCE(@difficulty, difficulty),
         sub_topics     = COALESCE(@subTopics, sub_topics),
         ai_generated_jd = COALESCE(@jd, ai_generated_jd),
         duration_months = COALESCE(@durationMonths, duration_months),
         interview_type  = COALESCE(@interviewType, interview_type),
         interview_mode  = COALESCE(@interviewMode, interview_mode)
     WHERE id = @id AND manager_id = @managerId
     RETURNING *`,
    {
      id,
      managerId,
      subjectName: data.subjectName || null,
      difficulty: data.difficulty || null,
      subTopics: data.subTopics != null ? JSON.stringify(data.subTopics) : null,
      jd: data.jd != null ? data.jd : null,
      durationMonths: data.durationMonths || null,
      interviewType: data.interviewType || null,
      interviewMode: data.interviewMode || null,
    }
  )
  return rows[0] || null
}

async function deleteTemplate(id, managerId) {
  return db.transaction(async tx => {
    const existingRows = await tx.query(
      `SELECT * FROM monthly_assessments WHERE id = @id AND manager_id = @managerId`,
      { id, managerId }
    )
    const assessment = existingRows[0]
    if (!assessment) return null

    const interviewRows = await tx.query(
      `SELECT o.interview_id
       FROM monthly_assessment_occurrences o
       JOIN monthly_assessment_enrollments e ON e.id = o.enrollment_id
       WHERE e.assessment_id = @id
         AND o.interview_id IS NOT NULL`,
      { id }
    )
    const interviewIds = interviewRows.map(row => row.interview_id).filter(Boolean)

    if (interviewIds.length > 0) {
      await tx.query(`DELETE FROM email_outbox_jobs WHERE interview_id = ANY(@interviewIds)`, { interviewIds })
      await tx.query(`DELETE FROM email_deliveries WHERE interview_id = ANY(@interviewIds)`, { interviewIds })
      await tx.query(`DELETE FROM report_jobs WHERE interview_id = ANY(@interviewIds)`, { interviewIds })
      await tx.query(`DELETE FROM reports WHERE interview_id = ANY(@interviewIds)`, { interviewIds })
      await tx.query(`DELETE FROM scorecards WHERE interview_id = ANY(@interviewIds)`, { interviewIds })
      await tx.query(`DELETE FROM transcripts WHERE interview_id = ANY(@interviewIds)`, { interviewIds })
      await tx.query(`DELETE FROM interviews WHERE id = ANY(@interviewIds)`, { interviewIds })
    }

    await tx.query(
      `DELETE FROM assignment_requests
       WHERE assessment_id = @id
          OR enrollment_id IN (
            SELECT id FROM monthly_assessment_enrollments WHERE assessment_id = @id
          )`,
      { id }
    )
    await tx.query(
      `DELETE FROM monthly_assessment_occurrences
       WHERE enrollment_id IN (
         SELECT id FROM monthly_assessment_enrollments WHERE assessment_id = @id
       )`,
      { id }
    )
    await tx.query(`DELETE FROM monthly_assessment_enrollments WHERE assessment_id = @id`, { id })
    const deleted = await tx.query(
      `DELETE FROM monthly_assessments WHERE id = @id AND manager_id = @managerId RETURNING *`,
      { id, managerId }
    )
    return deleted[0] || null
  })
}

module.exports = {
  createTemplate, getByIdForManager, getVisibleToUser, getByCompany,
  getEnrollmentsVisibleToUser, getEnrollmentsByCompany,
  getCalendarVisibleToUser, getCalendarByCompany,
  deleteEnrollment,
  updateTemplate, deleteTemplate,
}
