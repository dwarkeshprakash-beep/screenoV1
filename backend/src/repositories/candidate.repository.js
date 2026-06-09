// backend/src/repositories/candidate.repository.js
// SQL queries for the candidates table.
//
// candidates = interview subject record. No identity data stored here.
// name / email / phone come exclusively from users via user_id JOIN.
//
// Schema:
//   id, user_id (NOT NULL), company_id, last_assessed,
//   resume_url, resume_text, resume_updated, source, created, deleted

const db = require('../db/connection')

// Columns always pulled from users JOIN — returned on every candidate query.
const USER_COLS = `u.first_name, u.last_name, u.email,
  u.emp_number     AS employee_id,
  u.job_title      AS current_position,
  u.location,
  d.name           AS department`

const USER_JOIN = `
  JOIN users        u ON u.id = c.user_id AND u.deleted IS NULL
  LEFT JOIN departments d ON d.id = u.department_id`

/**
 * Get all candidates for a company.
 * @param {number} companyId
 * @param {string} filter - 'all' | 'overdue' | 'never'
 * @returns {Promise<Array>}
 */
async function getByCompany(companyId, filter = 'all') {
  let whereExtra = ''
  if (filter === 'never')   whereExtra = 'AND c.last_assessed IS NULL'
  if (filter === 'overdue') whereExtra = "AND c.last_assessed < NOW() - INTERVAL '30 days'"

  return db.query(
    `SELECT c.id, c.user_id, c.company_id, c.last_assessed,
            c.resume_url, c.resume_updated, c.source, c.created,
            ${USER_COLS}
     FROM candidates c ${USER_JOIN}
     WHERE c.company_id = @companyId AND c.deleted IS NULL
       ${whereExtra}
     ORDER BY u.first_name, u.last_name`,
    { companyId }
  )
}

/**
 * Get a single candidate by ID, scoped to a company.
 * @param {number} id
 * @param {number} companyId
 * @returns {Promise<Object|null>}
 */
async function getByIdForCompany(id, companyId) {
  const rows = await db.query(
    `SELECT c.id, c.user_id, c.company_id, c.last_assessed,
            c.resume_url, c.resume_updated, c.source, c.created,
            ${USER_COLS}
     FROM candidates c ${USER_JOIN}
     WHERE c.id = @id AND c.company_id = @companyId AND c.deleted IS NULL`,
    { id, companyId }
  )
  return rows[0] || null
}

/**
 * Get a single candidate by ID — used by report/interview services.
 * Returns user profile fields so callers don't need a separate users lookup.
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
async function getById(id) {
  const rows = await db.query(
    `SELECT c.id, c.user_id, c.company_id, c.last_assessed,
            c.resume_url, c.resume_text, c.resume_updated, c.source, c.created,
            ${USER_COLS}
     FROM candidates c ${USER_JOIN}
     WHERE c.id = @id AND c.deleted IS NULL`,
    { id }
  )
  return rows[0] || null
}

/**
 * Find a candidate by user_id within a company.
 * @param {number} userId
 * @param {number} companyId
 * @returns {Promise<Object|null>}
 */
async function getByUserId(userId, companyId) {
  const rows = await db.query(
    `SELECT c.id, c.user_id, c.company_id, c.last_assessed,
            c.resume_url, c.resume_updated, c.source, c.created,
            ${USER_COLS}
     FROM candidates c ${USER_JOIN}
     WHERE c.user_id = @userId AND c.company_id = @companyId AND c.deleted IS NULL
     LIMIT 1`,
    { userId, companyId }
  )
  return rows[0] || null
}

/**
 * Create or reactivate a candidate from a team member.
 * Called by schedule.service when an interview is first scheduled.
 * ON CONFLICT uses (company_id, user_id) — no identity data stored here.
 * @param {Object} teamMember - must include company_id, user_id
 * @returns {Promise<Object>}
 */
async function upsertFromTeamMember(teamMember) {
  const rows = await db.query(
    `INSERT INTO candidates (company_id, user_id, source)
     VALUES (@company_id, @user_id, @source)
     ON CONFLICT (company_id, user_id) DO UPDATE SET deleted = NULL
     RETURNING *`,
    {
      company_id: teamMember.company_id,
      user_id:    teamMember.user_id,
      source:     'manual',
    }
  )
  // Re-fetch with user JOIN so callers get name/email without a second query
  return getById(rows[0].id)
}

/**
 * Set last_assessed = NOW() after a completed interview.
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
 * Update resume fields on a candidate.
 * @param {number} id
 * @param {Object} data - { resumeUrl?, resumeText? }
 * @param {number|null} companyId
 * @returns {Promise<Object>}
 */
async function update(id, data, companyId = null) {
  const rows = await db.query(
    `UPDATE candidates
     SET
       resume_url     = COALESCE(@resume_url,  resume_url),
       resume_text    = COALESCE(@resume_text, resume_text),
       resume_updated = CASE WHEN @resume_url::text IS NOT NULL THEN NOW() ELSE resume_updated END
     WHERE id = @id
       AND (@company_id::int IS NULL OR company_id = @company_id)
       AND deleted IS NULL
     RETURNING *`,
    {
      id,
      company_id:  companyId,
      resume_url:  data.resumeUrl  || null,
      resume_text: data.resumeText || null,
    }
  )
  return rows[0]
}

/**
 * Soft-delete a candidate.
 */
async function softDelete(id, companyId) {
  await db.query(
    `UPDATE candidates SET deleted = NOW()
     WHERE id = @id AND company_id = @companyId`,
    { id, companyId }
  )
}

module.exports = {
  getByCompany, getById, getByIdForCompany, getByUserId,
  upsertFromTeamMember, updateLastAssessed, update, softDelete,
}
