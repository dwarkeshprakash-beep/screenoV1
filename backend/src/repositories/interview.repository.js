// backend/src/repositories/interview.repository.js
// SQL queries for the interviews table.

const db = require('../db/connection')

/**
 * Create a new interview record.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
async function create(data) {
  const rows = await db.query(
    `INSERT INTO interviews
       (company_id, candidate_id, manager_id, scheduled_by, type, mode, interview_mode, transcription_mode,
        difficulty, jd_text, focus_areas, max_attempts, cooldown_hours, window_days,
        report_timing, report_every_n, report_emails, token, token_expires, window_closes)
     VALUES
       (@company_id, @candidate_id, @manager_id, @manager_id, @type, @mode, @interview_mode, @transcription_mode,
        @difficulty, @jd_text, @focus_areas, @max_attempts, @cooldown_hours, @window_days,
        @report_timing, @report_every_n, @report_emails, @token, @token_expires, @window_closes)
     RETURNING *`,
    {
      company_id: data.companyId,
      candidate_id: data.candidateId,
      manager_id: data.managerId,
      type: data.type || 'ai_voice',
      mode: data.mode || 'internal_monthly',
      interview_mode: data.interviewMode || 'simple',
      transcription_mode: data.transcriptionMode || 'api',
      difficulty: data.difficulty || 'medium',
      jd_text: data.jdText || null,
      focus_areas: data.focusAreas || null,
      max_attempts: data.maxAttempts || 3,
      cooldown_hours: data.cooldownHours || 24,
      window_days: data.windowDays || 7,
      report_timing: data.reportTiming || 'all',
      report_every_n: data.reportEveryN || 3,
      report_emails: data.reportEmails ? JSON.stringify(data.reportEmails) : null,
      token: data.token,
      token_expires: data.tokenExpires,
      window_closes: data.windowCloses,
    }
  )
  return rows[0]
}

/**
 * Get an interview by ID.
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
async function getById(id) {
  const rows = await db.query(
    `SELECT i.*,
            c.first_name AS candidate_first, c.last_name AS candidate_last, c.email AS candidate_email,
            u.email AS manager_email
     FROM interviews i
     LEFT JOIN candidates c ON c.id = i.candidate_id
     LEFT JOIN users u ON u.id = i.manager_id
     WHERE i.id = @id`,
    { id }
  )
  return rows[0] || null
}

/**
 * Find an interview by its magic-link token.
 * @param {string} token
 * @returns {Promise<Object|null>}
 */
async function getByToken(token) {
  const rows = await db.query(
    `SELECT i.*, c.first_name AS candidate_first, c.last_name AS candidate_last, c.email AS candidate_email,
            co.name AS company_name
     FROM interviews i
     LEFT JOIN candidates c ON c.id = i.candidate_id
     LEFT JOIN companies co ON co.id = i.company_id
     WHERE i.token = @token`,
    { token }
  )
  return rows[0] || null
}

/**
 * Get all interviews for a company (for calendar view).
 * @param {number} companyId
 * @returns {Promise<Array>}
 */
async function getByCompany(companyId) {
  return db.query(
    `SELECT i.*, c.first_name, c.last_name
     FROM interviews i
     LEFT JOIN candidates c ON c.id = i.candidate_id
     WHERE i.company_id = @companyId
     ORDER BY i.created DESC`,
    { companyId }
  )
}

/**
 * Get all interviews managed by a specific manager.
 * @param {number} managerId
 * @returns {Promise<Array>}
 */
async function getByManager(managerId) {
  return db.query(
    `SELECT i.*, c.first_name, c.last_name
     FROM interviews i
     LEFT JOIN candidates c ON c.id = i.candidate_id
     WHERE i.manager_id = @managerId
     ORDER BY i.created DESC`,
    { managerId }
  )
}

/**
 * Update interview status.
 * @param {number} id
 * @param {string} status
 */
async function updateStatus(id, status) {
  await db.query(
    `UPDATE interviews SET status = @status WHERE id = @id`,
    { id, status }
  )
}

/**
 * Get all interviews for a specific candidate.
 * @param {number} candidateId
 * @returns {Promise<Array>}
 */
async function getByCandidate(candidateId) {
  return db.query(
    `SELECT i.*, c.first_name, c.last_name
     FROM interviews i
     LEFT JOIN candidates c ON c.id = i.candidate_id
     WHERE i.candidate_id = @candidateId
     ORDER BY i.created DESC`,
    { candidateId }
  )
}

module.exports = { create, getById, getByToken, getByCompany, getByManager, getByCandidate, updateStatus }
