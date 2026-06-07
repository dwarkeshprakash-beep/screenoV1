// SQL queries for proctoring events.

const db = require('../db/connection')

/**
 * Save a proctoring event using the live database schema.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
async function create(data) {
  const rows = await db.query(
    `INSERT INTO proctoring_events
       (interview_id, attempt_id, event_type, severity, occurred)
     VALUES
       (@interviewId, @attemptId, @eventType, @severity, @occurred)
     RETURNING *`,
    data
  )
  return rows[0]
}

module.exports = { create }
