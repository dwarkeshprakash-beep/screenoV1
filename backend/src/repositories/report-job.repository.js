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

module.exports = { create, markStarted, markCompleted, markFailed, getPendingJobs, resetProcessingJobs }
