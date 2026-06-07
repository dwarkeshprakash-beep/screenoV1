// backend/src/repositories/attempt.repository.js
// SQL queries for the attempts table.

const db = require('../db/connection')

/**
 * Create a new attempt record.
 * @param {number} interviewId
 * @param {number} attemptNum
 * @returns {Promise<Object>}
 */
async function create(interviewId, attemptNum) {
  const rows = await db.query(
    `INSERT INTO attempts (interview_id, attempt_num, started)
     VALUES (@interviewId, @attemptNum, NOW())
     RETURNING *`,
    { interviewId, attemptNum }
  )
  return rows[0]
}

/**
 * Count total attempts for an interview.
 * @param {number} interviewId
 * @returns {Promise<number>}
 */
async function countByInterview(interviewId) {
  const rows = await db.query(
    `SELECT COUNT(*) AS count FROM attempts WHERE interview_id = @interviewId`,
    { interviewId }
  )
  return parseInt(rows[0].count, 10)
}

/**
 * Get the most recent attempt for an interview.
 * @param {number} interviewId
 * @returns {Promise<Object|null>}
 */
async function getLatest(interviewId) {
  const rows = await db.query(
    `SELECT * FROM attempts
     WHERE interview_id = @interviewId
     ORDER BY attempt_num DESC
     LIMIT 1`,
    { interviewId }
  )
  return rows[0] || null
}

async function getByIdForInterview(id, interviewId) {
  const rows = await db.query(
    `SELECT * FROM attempts WHERE id = @id AND interview_id = @interviewId`,
    { id, interviewId }
  )
  return rows[0] || null
}

/**
 * Count completed attempts for an interview.
 * @param {number} interviewId
 * @returns {Promise<number>}
 */
async function countCompleted(interviewId) {
  const rows = await db.query(
    `SELECT COUNT(*) AS count FROM attempts
     WHERE interview_id = @interviewId AND status = 'completed'`,
    { interviewId }
  )
  return parseInt(rows[0].count, 10)
}

/**
 * Update attempt status and optional end time.
 * @param {number} id
 * @param {string} status
 * @param {Date|null} ended
 */
async function updateStatus(id, status, ended = null) {
  await db.query(
    `UPDATE attempts
     SET status = @status, ended = @ended
     WHERE id = @id`,
    { id, status, ended }
  )
}

module.exports = { create, countByInterview, getLatest, getByIdForInterview, countCompleted, updateStatus }
