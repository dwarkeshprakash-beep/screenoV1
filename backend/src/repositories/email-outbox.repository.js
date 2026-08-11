const db = require('../db/connection')

/**
 * Queue a password-reset email without storing the raw reset token.
 * The worker generates the token immediately before attempting delivery.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
async function enqueuePasswordReset(data) {
  const rows = await db.query(
    `INSERT INTO email_outbox_jobs
      (event_key, recipient, payload, send_after, status)
     VALUES
      (@eventKey, @recipient, @payload, CURRENT_TIMESTAMP, 'pending')
     RETURNING *`,
    {
      eventKey: data.eventKey,
      recipient: data.recipient,
      payload: JSON.stringify({
        userId: data.userId,
        name: data.name,
      }),
    }
  )
  return rows[0]
}

/**
 * Check whether this user already requested a reset in the last minute.
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
async function hasRecentPasswordReset(userId) {
  const rows = await db.query(
    `SELECT id
     FROM email_outbox_jobs
     WHERE event_key LIKE @eventPrefix
       AND created > CURRENT_TIMESTAMP - INTERVAL '1 minute'
     LIMIT 1`,
    { eventPrefix: `password_reset_${userId}_%` }
  )
  return rows.length > 0
}

module.exports = { enqueuePasswordReset, hasRecentPasswordReset }
