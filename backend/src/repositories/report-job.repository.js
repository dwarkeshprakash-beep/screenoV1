// backend/src/repositories/report-job.repository.js
const db = require('../db/connection')

async function create(interviewId) {
  const rows = await db.query(
    `INSERT INTO report_jobs (interview_id, status, available_at)
     VALUES (@interview_id, 'pending', NOW())
     ON CONFLICT (interview_id) DO UPDATE SET
       status       = CASE WHEN report_jobs.status = 'completed' THEN report_jobs.status       ELSE 'pending' END,
       available_at = CASE WHEN report_jobs.status = 'completed' THEN report_jobs.available_at ELSE NOW()     END,
       last_error   = CASE WHEN report_jobs.status = 'completed' THEN report_jobs.last_error   ELSE NULL      END
     RETURNING *`,
    { interview_id: interviewId }
  )
  return rows[0]
}

async function markStarted(id) {
  await db.query(
    `UPDATE report_jobs SET status = 'processing', started = NOW(), attempts = attempts + 1 WHERE id = @id`,
    { id }
  )
}

async function markCompleted(id) {
  await db.query(
    `UPDATE report_jobs SET status = 'completed', completed = NOW() WHERE id = @id`,
    { id }
  )
}

async function markFailed(id, errorMessage) {
  await db.query(
    `UPDATE report_jobs SET
       status = 'failed',
       last_error = @error,
       available_at = NOW() + INTERVAL '30 seconds'
     WHERE id = @id`,
    { id, error: errorMessage }
  )
}

async function getPendingJobs() {
  return db.query(
    `SELECT * FROM report_jobs
     WHERE status IN ('pending', 'failed') AND attempts < 3 AND available_at <= NOW()
     ORDER BY available_at ASC
     LIMIT 10`
  )
}

async function resetProcessingJobs() {
  await db.query(`UPDATE report_jobs SET status = 'pending' WHERE status = 'processing'`)
}

async function getByManager(managerId) {
  return db.query(`
    SELECT j.*,
           i.type AS interview_type,
           i.status AS interview_status,
           i.created AS interview_created,
           COALESCE(iu.first_name, ec.first_name) AS candidate_first,
           COALESCE(iu.last_name, ec.last_name) AS candidate_last,
           COALESCE(iu.email, ec.email) AS candidate_email,
           COALESCE(ct.client_name, ma.subject_name) AS context_title
    FROM report_jobs j
    JOIN interviews i ON i.id = j.interview_id
    LEFT JOIN users iu ON iu.id = i.internal_user_id
    LEFT JOIN external_candidates ec ON ec.id = i.external_candidate_id
    LEFT JOIN client_templates ct ON ct.id = i.client_template_id
    LEFT JOIN monthly_assessments ma ON ma.id = i.monthly_assessment_id
    WHERE i.manager_id = @managerId
    ORDER BY j.created DESC
    LIMIT 50
  `, { managerId })
}

async function retryForManager(jobId, managerId) {
  const rows = await db.query(`
    UPDATE report_jobs j
    SET status = 'pending',
        attempts = 0,
        last_error = NULL,
        available_at = NOW()
    FROM interviews i
    WHERE j.id = @jobId
      AND i.id = j.interview_id
      AND i.manager_id = @managerId
      AND j.status = 'failed'
    RETURNING j.*
  `, { jobId, managerId })
  return rows[0] || null
}

module.exports = {
  create,
  markStarted,
  markCompleted,
  markFailed,
  getPendingJobs,
  resetProcessingJobs,
  getByManager,
  retryForManager,
}
