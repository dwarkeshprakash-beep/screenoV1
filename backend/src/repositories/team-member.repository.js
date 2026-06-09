// backend/src/repositories/team-member.repository.js
// SQL queries for team_members (pure manager → user mapping).
// Profile data (name, email, location, etc.) is NOT on team_members — it comes
// from users via JOIN. Assessment state (last_assessed) is on candidates via JOIN.

const db = require('../db/connection')

// Common SELECT columns — used in both list and single-record queries.
const SELECT_COLS = `
  tm.id, tm.company_id, tm.manager_id, tm.user_id, tm.candidate_id, tm.created,
  u.first_name, u.last_name, u.email,
  u.emp_number     AS employee_id,
  u.job_title      AS current_position,
  u.location,
  d.name           AS department,
  c.last_assessed,
  c.resume_url,
  c.resume_updated`

const JOIN_PROFILE = `
  JOIN users u ON u.id = tm.user_id AND u.deleted IS NULL
  LEFT JOIN departments d ON d.id = u.department_id
  LEFT JOIN candidates c ON c.id = tm.candidate_id AND c.deleted IS NULL`

/**
 * List all active roster members for a company.
 * Profile data comes from users JOIN; assessment date from candidates JOIN.
 * @param {number} companyId
 * @param {string} filter - 'all' | 'overdue' | 'never'
 * @returns {Promise<Array>}
 */
async function getByCompany(companyId, filter = 'all') {
  let filterSql = ''
  if (filter === 'never') filterSql = 'AND (tm.candidate_id IS NULL OR c.last_assessed IS NULL)'
  if (filter === 'overdue') filterSql = "AND c.last_assessed < NOW() - INTERVAL '30 days'"

  return db.query(
    `SELECT ${SELECT_COLS}
     FROM team_members tm ${JOIN_PROFILE}
     WHERE tm.company_id = @companyId AND tm.deleted IS NULL
       ${filterSql}
     ORDER BY u.first_name, u.last_name`,
    { companyId }
  )
}

/**
 * Get one roster member scoped to company.
 * @param {number} id - team_members.id
 * @param {number} companyId
 * @returns {Promise<Object|null>}
 */
async function getByIdForCompany(id, companyId) {
  const rows = await db.query(
    `SELECT ${SELECT_COLS}
     FROM team_members tm ${JOIN_PROFILE}
     WHERE tm.id = @id AND tm.company_id = @companyId AND tm.deleted IS NULL`,
    { id, companyId }
  )
  return rows[0] || null
}

/**
 * Add a user to a manager's roster.
 * user_id MUST be a valid users.id.
 * @param {Object} data - { companyId, managerId, userId }
 * @returns {Promise<Object>}
 */
async function create(data) {
  const rows = await db.query(
    `INSERT INTO team_members (company_id, manager_id, user_id)
     VALUES (@company_id, @manager_id, @user_id)
     ON CONFLICT (manager_id, user_id) WHERE deleted IS NULL DO NOTHING
     RETURNING *`,
    {
      company_id: data.companyId,
      manager_id: data.managerId,
      user_id:    data.userId,
    }
  )
  if (rows.length > 0) return rows[0]
  // Conflict — row already exists; return it
  const existing = await db.query(
    `SELECT * FROM team_members
     WHERE manager_id = @manager_id AND user_id = @user_id AND deleted IS NULL`,
    { manager_id: data.managerId, user_id: data.userId }
  )
  return existing[0] || null
}

/**
 * Set candidate_id on a team member row after an interview is first scheduled.
 * @param {number} id - team_members.id
 * @param {number} candidateId
 * @returns {Promise<Object|null>}
 */
async function linkCandidate(id, candidateId) {
  const rows = await db.query(
    `UPDATE team_members SET candidate_id = @candidateId
     WHERE id = @id AND deleted IS NULL
     RETURNING *`,
    { id, candidateId }
  )
  return rows[0] || null
}

/**
 * Soft-delete a roster member.
 * @param {number} id
 * @param {number} companyId
 */
async function softDelete(id, companyId) {
  await db.query(
    `UPDATE team_members SET deleted = NOW()
     WHERE id = @id AND company_id = @companyId`,
    { id, companyId }
  )
}

module.exports = { getByCompany, getByIdForCompany, create, linkCandidate, softDelete }
