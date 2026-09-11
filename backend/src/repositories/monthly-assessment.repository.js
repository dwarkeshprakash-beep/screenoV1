// backend/src/repositories/monthly-assessment.repository.js
const db = require('../db/connection')

async function create(data) {
  const rows = await db.query(
    `INSERT INTO monthly_assessments 
      (manager_id, subject_name, difficulty, topics, sub_topics, ai_generated_jd, duration_months, interview_type, interview_mode)
     VALUES 
      (@manager_id, @subject_name, @difficulty, @topics, @sub_topics, @ai_generated_jd, @duration_months, @interview_type, @interview_mode)
     RETURNING *`,
    {
      manager_id: data.manager_id,
      subject_name: data.subject_name,
      difficulty: data.difficulty || 'medium',
      topics: JSON.stringify(data.topics || []),
      sub_topics: JSON.stringify(data.sub_topics || []),
      ai_generated_jd: data.ai_generated_jd || '',
      duration_months: data.duration_months || 1,
      interview_type: data.interview_type || 'exam',
      interview_mode: data.interview_mode || 'simple',
    }
  )
  return rows[0]
}

async function createEnrollment(data) {
  const rows = await db.query(
    `INSERT INTO monthly_assessment_enrollments 
      (assessment_id, team_member_id, start_date, end_date)
     VALUES 
      (@assessment_id, @team_member_id, @start_date, @end_date)
     RETURNING *`,
    {
      assessment_id: data.assessment_id,
      team_member_id: data.team_member_id,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
    }
  )
  return rows[0]
}

async function createWithEnrollments(data, teamMemberIds) {
  return db.transaction(async (tx) => {
    const assessments = await tx.query(
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
    const assessment = assessments[0]
    const enrollments = []

    for (const teamMemberId of teamMemberIds) {
      const rows = await tx.query(
        `INSERT INTO monthly_assessment_enrollments
          (assessment_id, team_member_id, start_date, end_date)
         VALUES
          (@assessmentId, @teamMemberId, @startDate, @endDate)
         RETURNING *`,
        {
          assessmentId: assessment.id,
          teamMemberId,
          startDate: data.startDate,
          endDate: data.endDate,
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

async function createEnrollments(assessmentId, teamMemberIds, data) {
  return db.transaction(async (tx) => {
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
          (assessment_id, team_member_id, start_date, end_date)
         VALUES
          (@assessmentId, @teamMemberId, @startDate, @endDate)
         RETURNING *`,
        {
          assessmentId,
          teamMemberId,
          startDate: data.startDate,
          endDate: data.endDate,
        }
      )
      enrollments.push(rows[0])
    }
    return enrollments
  })
}

async function getAssignmentRequest(requestKey) {
  const rows = await db.query(
    `SELECT * FROM assignment_requests WHERE request_key = @requestKey`,
    { requestKey }
  )
  return rows[0] || null
}

async function createAssignmentRequest(tx, data) {
  const rows = await tx.query(
    `INSERT INTO assignment_requests
      (request_key, assessment_id, team_member_id, enrollment_id)
     VALUES
      (@requestKey, @assessmentId, @teamMemberId, @enrollmentId)
     RETURNING *`,
    data
  )
  return rows[0]
}

async function createOccurrences(tx, occurrences) {
  const inserted = []
  for (const occ of occurrences) {
    const rows = await tx.query(
      `INSERT INTO monthly_assessment_occurrences
        (enrollment_id, period_month, available_from, due_at, duration_minutes, interview_id, status)
       VALUES
        (@enrollmentId, @periodMonth, @availableFrom, @dueAt, @durationMinutes, @interviewId, @status)
       RETURNING *`,
      {
        enrollmentId: occ.enrollment_id,
        periodMonth: occ.period_month,
        availableFrom: occ.available_from,
        dueAt: occ.due_at,
        durationMinutes: occ.duration_minutes,
        interviewId: occ.interview_id || null,
        status: occ.status || 'scheduled',
      }
    )
    inserted.push(rows[0])
  }
  return inserted
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
  // start_date/end_date describe the whole multi-month enrollment plan, which is NOT the same
  // as when any single occurrence actually opens/closes. Pull the currently-relevant occurrence's
  // real window too (whichever hasn't expired yet, or the earliest one if all have) so the UI can
  // show what actually gates the candidate's access instead of only the outer plan range.
  return db.query(
    `SELECT e.*, tm.user_id, tm.manager_id, u.first_name, u.last_name, u.email, u.availability,
            occ.available_from AS occurrence_available_from,
            occ.due_at AS occurrence_due_at,
            occ.status AS occurrence_status
     FROM monthly_assessment_enrollments e
     JOIN team_members tm ON tm.id = e.team_member_id
     JOIN users u ON u.id = tm.user_id
     LEFT JOIN LATERAL (
       SELECT available_from, due_at, status
       FROM monthly_assessment_occurrences o
       WHERE o.enrollment_id = e.id
       ORDER BY (due_at < NOW()) ASC, period_month ASC
       LIMIT 1
     ) occ ON true
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
     WHERE a.manager_id = @managerId
     ORDER BY a.created DESC, u.first_name, o.period_month`,
    { managerId }
  )
}

// Called when a month-end interview is created from an enrollment
async function updateEnrollmentInterview(enrollmentId, interviewId) {
  const rows = await db.query(
    `UPDATE monthly_assessment_enrollments
     SET status = 'scheduled'
     WHERE id = @id
     RETURNING *`,
    { id: enrollmentId }
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

    const occurrenceInterviews = await tx.query(
      `SELECT interview_id
       FROM monthly_assessment_occurrences
       WHERE enrollment_id = @enrollmentId
         AND interview_id IS NOT NULL`,
      { enrollmentId }
    )
    const interviewIds = [
      ...occurrenceInterviews.map(row => row.interview_id),
    ].filter(Boolean)
    if (interviewIds.length > 0) {
      await tx.query(
        `UPDATE interviews
         SET status = 'cancelled', result = 'cancelled', token = NULL, token_expires = NULL
         WHERE id = ANY(@interviewIds)
           AND status <> 'completed'`,
        { interviewIds }
      )
    }

    // Cancel future/open occurrences
    await tx.query(
      `UPDATE monthly_assessment_occurrences
       SET status = 'cancelled'
       WHERE enrollment_id = @enrollmentId
         AND status <> 'completed'`,
      { enrollmentId }
    )

    // Mark pending outbox jobs terminal without introducing a DB status not allowed by old constraints.
    await tx.query(
      `UPDATE email_outbox_jobs
       SET status = 'finished',
           last_error = 'cancelled before delivery',
           finished_at = CURRENT_TIMESTAMP,
           updated = CURRENT_TIMESTAMP
       WHERE event_key LIKE @eventKey
         AND status = 'pending'`,
      { eventKey: `monthly_occurrence_${enrollmentId}_%` }
    )

    return { ...updated[0], subject_name: enrollment.subject_name }
  })
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
  getAssignmentRequest,
  createAssignmentRequest,
  createOccurrences,
  create, createEnrollment, createWithEnrollments, createTemplate, createEnrollments,
  getByManager, getByIdForManager,
  getEnrollmentsByAssessment, getEnrollmentsByManager,
  getCalendarByManager, updateEnrollmentInterview, cancelEnrollment, deleteEnrollment,
  updateTemplate, deleteTemplate,
}
