// backend/src/repositories/candidate.repository.js
// SQL queries for the candidates table.
// candidates = interview subjects; profile data comes from users via user_id JOIN.

const db = require('../db/connection')

// Profile columns from users JOIN — used in detail views (profile page, schedule).
const PROFILE_JOIN = `
  LEFT JOIN users       u ON u.id = c.user_id AND u.deleted IS NULL
  LEFT JOIN departments d ON d.id = u.department_id`

const PROFILE_COLS = `
  u.emp_number     AS employee_id,
  u.job_title      AS current_position,
  u.location,
  d.name           AS department`

/**
 * Get all candidates for a company with optional filter.
 * Used by reports and schedule pages (not the team roster — that goes via team_members).
 * @param {number} companyId
 * @param {string} filter - 'all' | 'overdue' | 'never'
 * @returns {Promise<Array>}
 */
async function getByCompany(companyId, filter = 'all') {
  let whereExtra = ''
  if (filter === 'never')   whereExtra = 'AND c.last_assessed IS NULL'
  if (filter === 'overdue') whereExtra = "AND c.last_assessed < NOW() - INTERVAL '30 days'"

  return db.query(
    `SELECT c.id, c.user_id, c.first_name, c.last_name, c.email, c.phone,
            c.resume_url, c.resume_updated, c.source, c.created, c.last_assessed,
            ${PROFILE_COLS}
     FROM candidates c ${PROFILE_JOIN}
     WHERE c.company_id = @companyId AND c.deleted IS NULL
       ${whereExtra}
     ORDER BY c.first_name, c.last_name`,
    { companyId }
  )
}

/**
 * Get a single candidate by ID, scoped to a company.
 * Includes profile fields from users JOIN.
 * @param {number} id
 * @param {number} companyId
 * @returns {Promise<Object|null>}
 */
async function getByIdForCompany(id, companyId) {
  const rows = await db.query(
    `SELECT c.id, c.user_id, c.first_name, c.last_name, c.email, c.phone,
            c.resume_url, c.resume_updated, c.source, c.created, c.last_assessed,
            ${PROFILE_COLS}
     FROM candidates c ${PROFILE_JOIN}
     WHERE c.id = @id AND c.company_id = @companyId AND c.deleted IS NULL`,
    { id, companyId }
  )
  return rows[0] || null
}

/**
 * Get a single candidate by ID (no company scope — used by report/interview services).
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
async function getById(id) {
  const rows = await db.query(
    `SELECT * FROM candidates WHERE id = @id AND deleted IS NULL`,
    { id }
  )
  return rows[0] || null
}

/**
 * Find a candidate by email within a company.
 * @param {string} email
 * @param {number} companyId
 * @returns {Promise<Object|null>}
 */
async function getByEmail(email, companyId) {
  const rows = await db.query(
    `SELECT id, company_id, user_id, first_name, last_name, email
     FROM candidates
     WHERE email = @email AND company_id = @companyId AND deleted IS NULL
     LIMIT 1`,
    { email, companyId }
  )
  return rows[0] || null
}

/**
 * Create or reactivate a candidate from a team member object.
 * Called by schedule.service when an interview is first scheduled for a team member.
 * The team member object must include first_name, last_name, email, company_id, user_id.
 * @param {Object} teamMember - result from teamMemberRepository.getByIdForCompany
 * @returns {Promise<Object>}
 */
async function upsertFromTeamMember(teamMember) {
  const rows = await db.query(
    `INSERT INTO candidates (company_id, user_id, first_name, last_name, email, source)
     VALUES (@company_id, @user_id, @first_name, @last_name, @email, @source)
     ON CONFLICT (company_id, email) DO UPDATE SET
       deleted    = NULL,
       user_id    = COALESCE(candidates.user_id, EXCLUDED.user_id),
       first_name = EXCLUDED.first_name,
       last_name  = EXCLUDED.last_name
     RETURNING *`,
    {
      company_id: teamMember.company_id,
      user_id:    teamMember.user_id || null,
      first_name: teamMember.first_name,
      last_name:  teamMember.last_name || '',
      email:      teamMember.email,
      source:     'manual',
    }
  )
  return rows[0]
}

/**
 * Set last_assessed = NOW() for a candidate after a completed interview.
 * Called by interview.service.completeInterview.
 * @param {number} id
 */
async function updateLastAssessed(id) {
  await db.query(
    `UPDATE candidates SET last_assessed = NOW()
     WHERE id = @id AND deleted IS NULL`,
    { id }
  )
}

/**
 * Update a candidate's resume fields.
 * @param {number} id
 * @param {Object} data
 * @param {number|null} companyId
 * @returns {Promise<Object>}
 */
async function update(id, data, companyId = null) {
  const rows = await db.query(
    `UPDATE candidates
     SET
       first_name     = COALESCE(@first_name,   first_name),
       last_name      = COALESCE(@last_name,    last_name),
       email          = COALESCE(@email,         email),
       phone          = COALESCE(@phone,         phone),
       resume_url     = COALESCE(@resume_url,    resume_url),
       resume_updated = CASE WHEN @resume_url::text IS NOT NULL THEN NOW() ELSE resume_updated END
     WHERE id = @id
       AND (@company_id::int IS NULL OR company_id = @company_id)
       AND deleted IS NULL
     RETURNING *`,
    {
      id,
      company_id: companyId,
      first_name: data.firstName  || null,
      last_name:  data.lastName   || null,
      email:      data.email      || null,
      phone:      data.phone      || null,
      resume_url: data.resumeUrl  || null,
    }
  )
  return rows[0]
}

/**
 * Soft-delete a candidate.
 * @param {number} id
 * @param {number} companyId
 */
async function softDelete(id, companyId) {
  await db.query(
    `UPDATE candidates SET deleted = NOW()
     WHERE id = @id AND company_id = @companyId`,
    { id, companyId }
  )
}

/**
 * Bulk-insert candidates from CSV rows, skipping duplicates.
 * @param {Array<Object>} rows
 * @param {number} companyId
 * @param {number} managerId
 * @returns {Promise<{ inserted: number, skipped: number }>}
 */
async function bulkCreate(rows, companyId, managerId) {
  let inserted = 0
  for (const row of rows) {
    const result = await db.query(
      `INSERT INTO candidates (company_id, first_name, last_name, email, phone, source)
       VALUES (@company_id, @first_name, @last_name, @email, @phone, @source)
       ON CONFLICT (company_id, email) DO NOTHING
       RETURNING id`,
      {
        company_id: companyId,
        first_name: row.firstName,
        last_name:  row.lastName || '',
        email:      row.email,
        phone:      row.phone || null,
        source:     'csv_import',
      }
    )
    if (result.length > 0) inserted++
  }
  return { inserted, skipped: rows.length - inserted }
}

module.exports = {
  getByCompany, getById, getByIdForCompany, getByEmail,
  upsertFromTeamMember, updateLastAssessed, update, softDelete, bulkCreate,
}
