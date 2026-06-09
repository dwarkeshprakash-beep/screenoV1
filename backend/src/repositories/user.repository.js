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

/**
 * Get users in a company whose email is NOT already in the candidates table for that company.
 * Used by AddCandidateModal "Find in organisation" tab.
 * @param {number} companyId
 * @returns {Promise<Array>}
 */
async function getNotInTeam(companyId) {
  return db.query(
    `SELECT id, first_name, last_name, email, role
     FROM users
     WHERE company_id = @companyId
       AND deleted IS NULL
       AND role != 'manager'
       AND email NOT IN (
         SELECT email FROM candidates
         WHERE company_id = @companyId AND deleted IS NULL
       )
     ORDER BY first_name`,
    { companyId }
  )
}

async function getByRole(companyId, role) {
  return db.query(
    `SELECT id, first_name, last_name, email, role
     FROM users
     WHERE company_id = @companyId
       AND role = @role
       AND deleted IS NULL
       AND status = 'active'
     ORDER BY first_name`,
    { companyId, role }
  )
}

async function getByCompany(companyId) {
  return db.query(
    `SELECT id, first_name, last_name, email, role
     FROM users
     WHERE company_id = @companyId
       AND deleted IS NULL
       AND status = 'active'
     ORDER BY first_name`,
    { companyId }
  )
}

/**
 * Bulk upsert users from CSV rows into the users table.
 * Match by email first; if no email match and emp_number provided, match by emp_number.
 * Existing records: update name, email, emp_number, department_id, job_title, location — never password.
 * New records: insert with role='employee', status='active', and a temp password hash.
 * @param {Array<Object>} rows
 * @param {number} companyId
 * @param {string} tempPasswordHash - bcrypt hash used for all new-user rows
 * @returns {Promise<{ inserted: number, updated: number, errors: string[] }>}
 */
async function bulkUpsert(rows, companyId, tempPasswordHash) {
  let inserted = 0
  let updated = 0
  const errors = []

  for (const row of rows) {
    try {
      // 1. Try to find by email
      let existing = null
      const byEmail = await db.query(
        `SELECT id FROM users WHERE company_id = @company_id AND email = @email AND deleted IS NULL LIMIT 1`,
        { company_id: companyId, email: row.email }
      )
      if (byEmail.length > 0) existing = byEmail[0]

      // 2. Fall back to emp_number lookup
      if (!existing && row.empNumber) {
        const byEmp = await db.query(
          `SELECT id FROM users WHERE company_id = @company_id AND emp_number = @emp_number AND deleted IS NULL LIMIT 1`,
          { company_id: companyId, emp_number: row.empNumber }
        )
        if (byEmp.length > 0) existing = byEmp[0]
      }

      if (existing) {
        await db.query(
          `UPDATE users SET
             first_name    = COALESCE(@first_name,    first_name),
             last_name     = COALESCE(@last_name,     last_name),
             email         = COALESCE(@email,         email),
             emp_number    = COALESCE(@emp_number,    emp_number),
             department_id = COALESCE(@department_id, department_id),
             job_title     = COALESCE(@job_title,     job_title),
             location      = COALESCE(@location,      location)
           WHERE id = @id AND deleted IS NULL`,
          {
            id:            existing.id,
            first_name:    row.firstName    || null,
            last_name:     row.lastName     || null,
            email:         row.email        || null,
            emp_number:    row.empNumber    || null,
            department_id: row.departmentId ? parseInt(row.departmentId, 10) : null,
            job_title:     row.jobTitle     || null,
            location:      row.location     || null,
          }
        )
        updated++
      } else {
        await db.query(
          `INSERT INTO users
             (company_id, first_name, last_name, email, emp_number, department_id, job_title, location, password, role, status)
           VALUES
             (@company_id, @first_name, @last_name, @email, @emp_number, @department_id, @job_title, @location, @password, 'employee', 'active')
           ON CONFLICT (company_id, email) DO NOTHING`,
          {
            company_id:    companyId,
            first_name:    row.firstName,
            last_name:     row.lastName     || '',
            email:         row.email,
            emp_number:    row.empNumber    || null,
            department_id: row.departmentId ? parseInt(row.departmentId, 10) : null,
            job_title:     row.jobTitle     || null,
            location:      row.location     || null,
            password:      tempPasswordHash,
          }
        )
        inserted++
      }
    } catch (err) {
      errors.push(`${row.email}: ${err.message}`)
    }
  }

  return { inserted, updated, errors }
}

module.exports = { getByEmail, getById, getNotInTeam, getByRole, getByCompany, updateProfile, updatePassword, bulkUpsert }
