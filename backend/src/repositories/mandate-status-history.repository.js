// backend/src/repositories/mandate-status-history.repository.js
const db = require('../db/connection')

// One row per (mandate_id, status) — a milestone is only ever recorded the first
// time it's reached. Returns null if it was already recorded (no-op).
async function record(mandateId, status, actorUserId) {
  const rows = await db.query(
    `INSERT INTO mandate_status_history (mandate_id, status, actor_user_id)
     VALUES (@mandateId, @status, @actorUserId)
     ON CONFLICT (mandate_id, status) DO NOTHING
     RETURNING *`,
    { mandateId, status, actorUserId: actorUserId || null }
  )
  return rows[0] || null
}

async function getByMandate(mandateId) {
  return db.query(
    `SELECT h.*, u.first_name, u.last_name
     FROM mandate_status_history h
     LEFT JOIN users u ON u.id = h.actor_user_id
     WHERE h.mandate_id = @mandateId
     ORDER BY h.created ASC`,
    { mandateId }
  )
}

module.exports = { record, getByMandate }
