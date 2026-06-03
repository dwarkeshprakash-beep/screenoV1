// backend/src/repositories/refresh-token.repository.js
// SQL queries for the refresh_tokens table.

const db = require('../db/connection')

/**
 * Store a new refresh token hash.
 * @param {number} userId
 * @param {string} tokenHash - SHA-256 hex hash of the raw token
 * @param {Date} expiresAt
 * @returns {Promise<Object>}
 */
async function create(userId, tokenHash, expiresAt) {
  const rows = await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires)
     VALUES (@userId, @tokenHash, @expiresAt)
     RETURNING *`,
    { userId, tokenHash, expiresAt }
  )
  return rows[0]
}

/**
 * Find a valid (not revoked, not expired) token by its hash.
 * @param {string} tokenHash
 * @returns {Promise<Object|null>}
 */
async function getByHash(tokenHash) {
  const rows = await db.query(
    `SELECT id, user_id, expires
     FROM refresh_tokens
     WHERE token_hash = @tokenHash
       AND revoked IS NULL
       AND expires > NOW()`,
    { tokenHash }
  )
  return rows[0] || null
}

/**
 * Revoke a refresh token by its DB id.
 * @param {number} id
 */
async function revoke(id) {
  await db.query(
    `UPDATE refresh_tokens SET revoked = NOW() WHERE id = @id`,
    { id }
  )
}

module.exports = { create, getByHash, revoke }
