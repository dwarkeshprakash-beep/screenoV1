// backend/src/repositories/report-job.repository.js
const db = require('../db/connection')

async function create(interviewId) {
  const rows = await db.query(
    `INSERT INTO report_jobs (interview_id, status)
     VALUES (@interview_id, 'pending')
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
    `UPDATE report_jobs SET status = 'failed', last_error = @error WHERE id = @id`,
    { id, error: errorMessage }
  )
}

async function getPendingJobs() {
  return db.query(
    `SELECT * FROM report_jobs 
     WHERE status IN ('pending', 'failed') AND attempts < 3 AND available_at <= NOW()
     ORDER BY available_at ASC`
  )
}

async function resetProcessingJobs() {
  await db.query(`UPDATE report_jobs SET status = 'pending' WHERE status = 'processing'`)
}

module.exports = { create, markStarted, markCompleted, markFailed, getPendingJobs, resetProcessingJobs }
