// backend/src/repositories/schedule-record.repository.js
// SQL queries for idempotent schedule creation records.

const db = require('../db/connection')

async function getByKey(companyId, idempotencyKey) {
  const rows = await db.query(
    `SELECT * FROM schedule_records
     WHERE company_id = @companyId AND idempotency_key = @idempotencyKey
     LIMIT 1`,
    { companyId, idempotencyKey }
  )
  return rows[0] || null
}

async function createPending({ companyId, candidateId, idempotencyKey, expires }) {
  const rows = await db.query(
    `INSERT INTO schedule_records
       (company_id, candidate_id, idempotency_key, expires, status)
     VALUES
       (@companyId, @candidateId, @idempotencyKey, @expires, 'pending')
     ON CONFLICT (company_id, idempotency_key) DO NOTHING
     RETURNING *`,
    { companyId, candidateId, idempotencyKey, expires }
  )
  return rows[0] || null
}

async function markCompleted(id, interviewId) {
  const rows = await db.query(
    `UPDATE schedule_records
     SET interview_id = @interviewId, status = 'completed', completed = NOW()
     WHERE id = @id
     RETURNING *`,
    { id, interviewId }
  )
  return rows[0] || null
}

module.exports = { getByKey, createPending, markCompleted }
