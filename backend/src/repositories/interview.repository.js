// backend/src/repositories/interview.repository.js
// SQL queries for the interviews table.
//
// candidates no longer stores first_name/last_name/email — get them via users JOIN.

const db = require('../db/connection')

// Reusable fragments for pulling candidate identity from users
const CANDIDATE_USER_JOIN = `
  LEFT JOIN candidates c2 ON c2.id = i.candidate_id AND c2.deleted IS NULL
  LEFT JOIN users      cu ON cu.id = c2.user_id   AND cu.deleted IS NULL`

const CANDIDATE_USER_COLS = `
  cu.first_name AS candidate_first, cu.last_name AS candidate_last, cu.email AS candidate_email`

/**
 * Create a new interview record.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
async function create(data) {
  const rows = await db.query(
    `INSERT INTO interviews
       (company_id, candidate_id, manager_id, scheduled_by, interviewer_id, type, mode, interview_mode,
        difficulty, jd_text, focus_areas, question_count, max_attempts, cooldown_hours, window_days,
        report_timing, report_every_n, report_emails, token, token_expires, window_closes,
        scheduled_start, scheduled_end, timezone)
     VALUES
       (@company_id, @candidate_id, @manager_id, @scheduled_by, @interviewer_id, @type, @mode, @interview_mode,
        @difficulty, @jd_text, @focus_areas, @question_count, @max_attempts, @cooldown_hours, @window_days,
        @report_timing, @report_every_n, @report_emails, @token, @token_expires, @window_closes,
        @scheduled_start, @scheduled_end, @timezone)
     RETURNING *`,
    {
      company_id:    data.companyId,
      candidate_id:  data.candidateId,
      manager_id:    data.managerId,
      scheduled_by:  data.managerId,
      interviewer_id: data.interviewerId || null,
      type:          data.type || 'ai_voice',
      mode:          data.mode || 'internal_monthly',
      interview_mode: data.interviewMode || 'simple',
      difficulty:    data.difficulty || 'medium',
      jd_text:       data.jdText || null,
      focus_areas:   data.focusAreas || null,
      question_count: data.questionCount || 10,
      max_attempts:  data.maxAttempts || 3,
      cooldown_hours: data.cooldownHours || 24,
      window_days:   data.windowDays || 7,
      report_timing: data.reportTiming || 'all',
      report_every_n: data.reportEveryN || 3,
      report_emails: data.reportEmails ? JSON.stringify(data.reportEmails) : null,
      token:         data.token,
      token_expires: data.tokenExpires,
      window_closes: data.windowCloses,
      scheduled_start: data.scheduledStart || null,
      scheduled_end:   data.scheduledEnd   || null,
      timezone:      data.timezone || null,
    }
  )
  return rows[0]
}

async function getByIdForCandidate(id, candidateId) {
  const rows = await db.query(
    `SELECT * FROM interviews
     WHERE id = @id AND candidate_id = @candidateId`,
    { id, candidateId }
  )
  return rows[0] || null
}

async function getByIdForCompany(id, companyId) {
  const rows = await db.query(
    `SELECT i.*, ${CANDIDATE_USER_COLS}
     FROM interviews i ${CANDIDATE_USER_JOIN}
     WHERE i.id = @id AND i.company_id = @companyId`,
    { id, companyId }
  )
  return rows[0] || null
}

async function getAssignedHuman(id, interviewerId) {
  const rows = await db.query(
    `SELECT i.*, ${CANDIDATE_USER_COLS}
     FROM interviews i ${CANDIDATE_USER_JOIN}
     WHERE i.id = @id AND i.interviewer_id = @interviewerId AND i.type = 'human'`,
    { id, interviewerId }
  )
  return rows[0] || null
}

async function countHumanConflicts(interviewerId, scheduledStart, scheduledEnd) {
  const rows = await db.query(
    `SELECT COUNT(*) AS count
     FROM interviews
     WHERE interviewer_id = @interviewerId
       AND type = 'human'
       AND status IN ('scheduled', 'in_progress')
       AND scheduled_start IS NOT NULL
       AND scheduled_end IS NOT NULL
       AND scheduled_start < @scheduledEnd
       AND scheduled_end > @scheduledStart`,
    { interviewerId, scheduledStart, scheduledEnd }
  )
  return parseInt(rows[0].count, 10)
}

/**
 * Get an interview by ID — includes candidate name/email and manager email.
 * Used by interview.service for report generation.
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
async function getById(id) {
  const rows = await db.query(
    `SELECT i.*,
            ${CANDIDATE_USER_COLS},
            mu.email AS manager_email
     FROM interviews i
     ${CANDIDATE_USER_JOIN}
     LEFT JOIN users mu ON mu.id = i.manager_id
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
    `SELECT i.*,
            ${CANDIDATE_USER_COLS},
            co.name AS company_name
     FROM interviews i
     ${CANDIDATE_USER_JOIN}
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
    `SELECT i.*,
            cu.first_name, cu.last_name
     FROM interviews i
     LEFT JOIN candidates c2 ON c2.id = i.candidate_id AND c2.deleted IS NULL
     LEFT JOIN users      cu ON cu.id = c2.user_id     AND cu.deleted IS NULL
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
    `SELECT i.*,
            cu.first_name, cu.last_name
     FROM interviews i
     LEFT JOIN candidates c2 ON c2.id = i.candidate_id AND c2.deleted IS NULL
     LEFT JOIN users      cu ON cu.id = c2.user_id     AND cu.deleted IS NULL
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
    `SELECT i.*,
            cu.first_name, cu.last_name
     FROM interviews i
     LEFT JOIN candidates c2 ON c2.id = i.candidate_id AND c2.deleted IS NULL
     LEFT JOIN users      cu ON cu.id = c2.user_id     AND cu.deleted IS NULL
     WHERE i.candidate_id = @candidateId
     ORDER BY i.created DESC`,
    { candidateId }
  )
}

module.exports = {
  create, getById, getByIdForCandidate, getByIdForCompany, getAssignedHuman,
  getByToken, getByCompany, getByManager, getByCandidate, countHumanConflicts, updateStatus,
}
