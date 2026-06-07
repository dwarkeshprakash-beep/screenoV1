// backend/src/repositories/email-delivery.repository.js
// SQL queries for transactional email delivery status.

const db = require('../db/connection')

async function create(data) {
  const rows = await db.query(
    `INSERT INTO email_deliveries
       (kind, interview_id, candidate_id, intended_to, delivered_to, status, error, attempts)
     VALUES
       (@kind, @interviewId, @candidateId, @intendedTo, @deliveredTo, @status, @error, @attempts)
     RETURNING *`,
    {
      kind: data.kind,
      interviewId: data.interviewId || null,
      candidateId: data.candidateId || null,
      intendedTo: data.intendedTo,
      deliveredTo: data.deliveredTo,
      status: data.status,
      error: data.error || null,
      attempts: data.attempts || 1,
    }
  )
  return rows[0]
}

async function listByInterview(interviewId) {
  return db.query(
    `SELECT * FROM email_deliveries
     WHERE interview_id = @interviewId
     ORDER BY created DESC`,
    { interviewId }
  )
}

module.exports = { create, listByInterview }
