// backend/src/repositories/candidate.repository.js
// SQL queries for the candidates table.

const db = require('../db/connection')

/**
 * Get all candidates for a company with optional filter.
 * @param {number} companyId
 * @param {string} filter - 'all' | 'overdue' | 'never'
 * @returns {Promise<Array>}
 */
async function getByCompany(companyId, filter = 'all') {
  const latestAssessmentSql = `NULLIF(GREATEST(
    COALESCE((
      SELECT MAX(a.ended)
      FROM interviews i
      JOIN attempts a ON a.interview_id = i.id
      WHERE i.candidate_id = c.id AND a.status = 'completed'
    ), 'epoch'::timestamptz),
    COALESCE((
      SELECT MAX(r.created)
      FROM reports r
      WHERE r.candidate_id = c.id AND r.status = 'ready'
    ), 'epoch'::timestamptz)
  ), 'epoch'::timestamptz)`

  let whereExtra = ''
  if (filter === 'never') {
    whereExtra = `AND ${latestAssessmentSql} IS NULL`
  } else if (filter === 'overdue') {
    whereExtra = `AND ${latestAssessmentSql} < NOW() - INTERVAL '90 days'`
  }

  return db.query(
    `SELECT
       c.id,
       c.first_name,
       c.last_name,
       c.email,
       c.phone,
       c.type,
       c.resume_url,
       c.resume_updated,
       c.status,
       c.created,
       ${latestAssessmentSql} AS last_assessed
     FROM candidates c
     WHERE c.company_id = @companyId
       AND c.deleted IS NULL
       ${whereExtra}
     ORDER BY c.first_name`,
    { companyId }
  )
}

/**
 * Get a single candidate by ID.
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

async function getByIdForCompany(id, companyId) {
  const rows = await db.query(
    `SELECT * FROM candidates
     WHERE id = @id AND company_id = @companyId AND deleted IS NULL`,
    { id, companyId }
  )
  return rows[0] || null
}

/**
 * Create a new candidate.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
async function create(data) {
  // ON CONFLICT reactivates a soft-deleted record for the same company+email
  const rows = await db.query(
    `INSERT INTO candidates
       (company_id, manager_id, first_name, last_name, email, phone, type, source)
     VALUES
       (@company_id, @manager_id, @first_name, @last_name, @email, @phone, @type, @source)
     ON CONFLICT (company_id, email)
     DO UPDATE SET
       deleted     = NULL,
       first_name  = EXCLUDED.first_name,
       last_name   = EXCLUDED.last_name,
       phone       = EXCLUDED.phone,
       manager_id  = EXCLUDED.manager_id
     RETURNING *`,
    {
      company_id: data.companyId,
      manager_id: data.managerId || null,
      first_name: data.firstName,
      last_name: data.lastName || '',
      email: data.email,
      phone: data.phone || null,
      type: data.type || 'internal',
      source: data.source || 'manual',
    }
  )
  return rows[0]
}

/**
 * Update a candidate's fields.
 * @param {number} id
 * @param {Object} data
 * @returns {Promise<Object>}
 */
async function update(id, data, companyId = null) {
  const rows = await db.query(
    `UPDATE candidates
     SET
       first_name   = COALESCE(@first_name, first_name),
       last_name    = COALESCE(@last_name, last_name),
       email        = COALESCE(@email, email),
       phone        = COALESCE(@phone, phone),
       resume_url   = COALESCE(@resume_url, resume_url),
       resume_text  = COALESCE(@resume_text, resume_text),
       resume_updated = CASE WHEN @resume_url IS NOT NULL THEN NOW() ELSE resume_updated END
     WHERE id = @id
       AND (@company_id IS NULL OR company_id = @company_id)
       AND deleted IS NULL
     RETURNING *`,
    {
      id,
      company_id: companyId,
      first_name: data.firstName || null,
      last_name: data.lastName || null,
      email: data.email || null,
      phone: data.phone || null,
      resume_url: data.resumeUrl || null,
      resume_text: data.resumeText || null,
    }
  )
  return rows[0]
}

/**
 * Soft-delete a candidate.
 * @param {number} id
 */
async function softDelete(id, companyId) {
  await db.query(
    `UPDATE candidates SET deleted = NOW()
     WHERE id = @id AND company_id = @companyId`,
    { id, companyId }
  )
}

/**
 * Bulk-insert candidates from CSV rows, skipping duplicates by company+email.
 * @param {Array<Object>} rows - parsed CSV rows
 * @param {number} companyId
 * @param {number} managerId
 * @returns {Promise<{ inserted: number, skipped: number }>}
 */
async function bulkCreate(rows, companyId, managerId) {
  let inserted = 0
  for (const row of rows) {
    const result = await db.query(
      `INSERT INTO candidates (company_id, manager_id, first_name, last_name, email, phone, type, source)
       VALUES (@company_id, @manager_id, @first_name, @last_name, @email, @phone, @type, @source)
       ON CONFLICT (company_id, email) DO NOTHING
       RETURNING id`,
      {
        company_id: companyId,
        manager_id: managerId,
        first_name: row.firstName,
        last_name: row.lastName || '',
        email: row.email,
        phone: row.phone || null,
        type: row.type || 'internal',
        source: 'csv_import',
      }
    )
    if (result.length > 0) inserted++
  }
  return { inserted, skipped: rows.length - inserted }
}

/**
 * Find a candidate by email within a company.
 * @param {string} email
 * @param {number} companyId
 * @returns {Promise<Object|null>}
 */
async function getByEmail(email, companyId) {
  const rows = await db.query(
    `SELECT id, company_id, first_name, last_name, email
     FROM candidates
     WHERE email = @email AND company_id = @companyId AND deleted IS NULL
     LIMIT 1`,
    { email, companyId }
  )
  return rows[0] || null
}

module.exports = { getByCompany, getById, getByIdForCompany, getByEmail, create, update, softDelete, bulkCreate }
