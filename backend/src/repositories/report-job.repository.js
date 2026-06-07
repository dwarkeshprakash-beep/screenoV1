const db = require('../db/connection')

async function enqueue(interviewId, attemptId) {
  const rows = await db.query(
    `INSERT INTO report_jobs (interview_id, attempt_id, status)
     VALUES (@interviewId, @attemptId, 'pending')
     ON CONFLICT (attempt_id)
     DO UPDATE SET status = CASE
       WHEN report_jobs.status = 'completed' THEN report_jobs.status
       ELSE 'pending'
     END,
     available_at = NOW()
     RETURNING *`,
    { interviewId, attemptId }
  )
  return rows[0]
}

async function getReady(limit = 3) {
  return db.query(
    `SELECT * FROM report_jobs
     WHERE status IN ('pending', 'error')
       AND available_at <= NOW()
       AND attempts < 3
     ORDER BY created
     LIMIT @limit`,
    { limit }
  )
}

async function markRunning(id) {
  await db.query(
    `UPDATE report_jobs
     SET status = 'running', attempts = attempts + 1, started = NOW()
     WHERE id = @id`,
    { id }
  )
}

async function markCompleted(id) {
  await db.query(
    `UPDATE report_jobs
     SET status = 'completed', completed = NOW(), last_error = NULL
     WHERE id = @id`,
    { id }
  )
}

async function markError(id, error) {
  await db.query(
    `UPDATE report_jobs
     SET status = 'error',
         last_error = @error,
         available_at = NOW() + INTERVAL '5 minutes'
     WHERE id = @id`,
    { id, error: String(error || '').slice(0, 1000) }
  )
}

module.exports = { enqueue, getReady, markRunning, markCompleted, markError }
