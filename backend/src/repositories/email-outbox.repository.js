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

/**
 * Queue a "welcome, set your password" email for a newly created user.
 * Same JIT-token pattern as enqueuePasswordReset - the worker mints the
 * actual token right before sending so nothing usable sits in the queue.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
async function enqueueWelcomeSetPassword(data) {
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
 * Queue a monthly-occurrence invite for when its window opens. Runs inside the caller's
 * transaction; the event key makes re-queuing the same month a no-op.
 */
async function enqueueMonthlyOccurrence(tx, { eventKey, interviewId, recipient, payload, sendAfter }) {
  await tx.query(
    `INSERT INTO email_outbox_jobs (event_key, interview_id, recipient, payload, send_after, status)
     VALUES (@eventKey, @interviewId, @recipient, @payload, @sendAfter, 'pending')
     ON CONFLICT (event_key) DO NOTHING`,
    { eventKey, interviewId, recipient, payload, sendAfter }
  )
}

// ── Worker ──────────────────────────────────────────────────────────────────

/**
 * Claim the next batch of due jobs for this worker. In one transaction: release claims
 * older than 5 minutes (a worker that died mid-batch), lock due pending rows with
 * SKIP LOCKED so concurrent workers never pick the same job, and mark them claimed.
 * @returns {Promise<object[]>} the claimed jobs (as they were before claiming)
 */
async function claimDueBatch({ maxAttempts, batchSize }) {
  return db.transaction(async (tx) => {
    await tx.query(
      `UPDATE email_outbox_jobs
       SET status = 'pending', claimed_at = NULL, updated = CURRENT_TIMESTAMP
       WHERE status = 'claimed'
         AND claimed_at < CURRENT_TIMESTAMP - INTERVAL '5 minutes'`
    )

    const rows = await tx.query(
      `SELECT * FROM email_outbox_jobs
       WHERE status = 'pending'
         AND send_after <= CURRENT_TIMESTAMP
         AND attempts < @maxAttempts
       ORDER BY send_after ASC
       LIMIT @batchSize
       FOR UPDATE SKIP LOCKED`,
      { maxAttempts, batchSize }
    )

    if (rows.length === 0) return []

    const jobIds = rows.map(r => r.id)

    await tx.query(
      `UPDATE email_outbox_jobs
       SET status = 'claimed', claimed_at = CURRENT_TIMESTAMP, attempts = attempts + 1
       WHERE id = ANY(@jobIds::int[])`,
      { jobIds }
    )

    return rows
  })
}

async function markStatus(id, status) {
  await db.query(
    `UPDATE email_outbox_jobs
     SET status = @status, finished_at = CURRENT_TIMESTAMP, updated = CURRENT_TIMESTAMP
     WHERE id = @id`,
    { status, id }
  )
}

// Back to pending for another attempt, or 'failed' once attempts are used up.
async function markFailed(id, errorMsg, maxAttempts) {
  await db.query(
    `UPDATE email_outbox_jobs
     SET status = CASE WHEN attempts >= @maxAttempts THEN 'failed' ELSE 'pending' END,
         last_error = @errorMsg,
         updated = CURRENT_TIMESTAMP
     WHERE id = @id`,
    { maxAttempts, errorMsg: errorMsg || 'Unknown error', id }
  )
}

module.exports = {
  enqueuePasswordReset, hasRecentPasswordReset, enqueueWelcomeSetPassword, enqueueMonthlyOccurrence,
  claimDueBatch, markStatus, markFailed,
}
