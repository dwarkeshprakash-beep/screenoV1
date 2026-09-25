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

module.exports = { create, getValidByHash }
