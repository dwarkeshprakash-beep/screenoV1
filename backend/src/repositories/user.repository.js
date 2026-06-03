// backend/src/repositories/user.repository.js
// SQL queries for the users table only.

const db = require('../db/connection')

/**
 * Find a user by email (active only).
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
async function getByEmail(email) {
  const rows = await db.query(
    `SELECT id, company_id, first_name, last_name, email, password, role, status
     FROM users
     WHERE email = @email AND deleted IS NULL`,
    { email }
  )
  return rows[0] || null
}

/**
 * Find a user by ID (active only).
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
async function getById(id) {
  const rows = await db.query(
    `SELECT id, company_id, first_name, last_name, email, role, status
     FROM users
     WHERE id = @id AND deleted IS NULL`,
    { id }
  )
  return rows[0] || null
}

/**
 * Update a user's first and last name.
 * Uses COALESCE so null values leave the existing data intact.
 * @param {number} id
 * @param {{ firstName?: string, lastName?: string }} fields
 * @returns {Promise<Object>}
 */
async function updateProfile(id, { firstName, lastName }) {
  const rows = await db.query(
    `UPDATE users
     SET
       first_name = COALESCE(@first_name, first_name),
       last_name  = COALESCE(@last_name,  last_name)
     WHERE id = @id AND deleted IS NULL
     RETURNING *`,
    { id, first_name: firstName || null, last_name: lastName || null }
  )
  return rows[0]
}

/**
 * Update a user's hashed password.
 * @param {number} id
 * @param {string} passwordHash - bcrypt hash
 */
async function updatePassword(id, passwordHash) {
  await db.query(
    `UPDATE users SET password = @password WHERE id = @id`,
    { id, password: passwordHash }
  )
}

module.exports = { getByEmail, getById, updateProfile, updatePassword }
