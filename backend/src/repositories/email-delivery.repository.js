// backend/src/repositories/email-delivery.repository.js
const db = require('../db/connection')

async function create(data) {
  const rows = await db.query(
    `INSERT INTO email_deliveries (kind, interview_id, intended_to, delivered_to, status, error)
     VALUES (@kind, @interview_id, @intended_to, @delivered_to, @status, @error)
     RETURNING *`,
    {
      kind:         data.kind,
      interview_id: data.interviewId || null,
      intended_to:  data.intendedTo,
      delivered_to: data.deliveredTo,
      status:       data.status,
      error:        data.error || null
    }
  )
  return rows[0]
}

async function updateStatus(id, status, error = null) {
  await db.query(
    `UPDATE email_deliveries SET status = @status, error = @error WHERE id = @id`,
    { id, status, error }
  )
}

async function getByInterview(interviewId) {
  return db.query(
    `SELECT * FROM email_deliveries
     WHERE interview_id = @interviewId
     ORDER BY created DESC`,
    { interviewId }
  )
}

module.exports = { create, updateStatus, getByInterview }
