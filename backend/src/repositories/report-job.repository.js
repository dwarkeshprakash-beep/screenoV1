// backend/src/repositories/report-job.repository.js
const db = require('../db/connection')

async function create(interviewId) {
  const existing = await db.query(
    `SELECT * FROM report_jobs WHERE interview_id = @interview_id ORDER BY id DESC LIMIT 1`,
    { interview_id: interviewId }
  )
  if (existing[0]) {
    if (existing[0].status !== 'completed') {
      const rows = await db.query(
        `UPDATE report_jobs SET
           status = 'pending',
           available_at = NOW(),
           last_error = NULL
         WHERE id = @id
         RETURNING *`,
        { id: existing[0].id }
      )
      return rows[0]
    }
    return existing[0]
  }

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
     ORDER BY available_at ASC`
  )
}

async function resetProcessingJobs() {
  await db.query(`UPDATE report_jobs SET status = 'pending' WHERE status = 'processing'`)
}

module.exports = { create, markStarted, markCompleted, markFailed, getPendingJobs, resetProcessingJobs }
