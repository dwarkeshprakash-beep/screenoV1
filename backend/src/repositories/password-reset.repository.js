const db = require('../db/connection')

async function create(userId, tokenHash, expires) {
  const rows = await db.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires)
     VALUES (@userId, @tokenHash, @expires)
     RETURNING *`,
    { userId, tokenHash, expires }
  )
  return rows[0]
}

async function getValidByHash(tokenHash) {
  const rows = await db.query(
    `SELECT *
     FROM password_reset_tokens
     WHERE token_hash = @tokenHash
       AND used = FALSE
       AND expires > NOW()
     ORDER BY created DESC
     LIMIT 1`,
    { tokenHash }
  )
  return rows[0] || null
}

/**
 * Atomically consume a valid reset token and set the user's new password. The token row
 * is locked for the check+update, so two concurrent submits (double-click, two tabs)
 * can't both pass the validity check before either marks it used.
 * @returns {Promise<object|null>} the consumed token row, or null if invalid/expired/used
 */
async function consumeAndSetPassword(tokenHash, passwordHash) {
  return db.transaction(async (tx) => {
    const rows = await tx.query(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = @tokenHash AND used = FALSE AND expires > NOW()
       FOR UPDATE`,
      { tokenHash }
    )
    const stored = rows[0]
    if (!stored) return null

    await tx.query(`UPDATE password_reset_tokens SET used = TRUE WHERE id = @id`, { id: stored.id })
    await tx.query(`UPDATE users SET password = @passwordHash WHERE id = @userId`, {
      passwordHash, userId: stored.user_id,
    })
    return stored
  })
}

module.exports = { create, getValidByHash, consumeAndSetPassword }
