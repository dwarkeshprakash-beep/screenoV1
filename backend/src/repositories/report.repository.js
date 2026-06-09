// backend/src/repositories/report.repository.js
// SQL queries for the reports table.

const db = require('../db/connection')

/**
 * Create a new report record.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
async function create(data) {
  const rows = await db.query(
    `INSERT INTO reports
       (interview_id, attempt_id, candidate_id, overall_score, confidence,
        tech_knowledge, communication, summary, strengths, tips, status)
     VALUES
       (@interviewId, @attemptId, @candidateId, @overallScore, @confidence,
        @techKnowledge, @communication, @summary, @strengths, @tips, 'ready')
     RETURNING *`,
    {
      interviewId: data.interviewId,
      attemptId: data.attemptId || null,
      candidateId: data.candidateId,
      overallScore: data.overall_score || null,
      confidence: data.confidence || null,
      techKnowledge: data.tech_knowledge || null,
      communication: data.communication || null,
      summary: data.summary || null,
      strengths: data.strengths ? JSON.stringify(data.strengths) : null,
      tips: data.tips ? JSON.stringify(data.tips) : null,
    }
  )
  return rows[0]
}

/**
 * Get all reports for a candidate (newest first).
 * @param {number} candidateId
 * @returns {Promise<Array>}
 */
async function getByCandidate(candidateId) {
  return db.query(
    `SELECT * FROM reports
     WHERE candidate_id = @candidateId
     ORDER BY created DESC`,
    { candidateId }
  )
}

async function getByAttempt(attemptId) {
  const rows = await db.query(
    `SELECT * FROM reports WHERE attempt_id = @attemptId ORDER BY created DESC LIMIT 1`,
    { attemptId }
  )
  return rows[0] || null
}

/**
 * Get the most recent report for a candidate.
 * @param {number} candidateId
 * @returns {Promise<Object|null>}
 */
async function getLatestByCandidate(candidateId, companyId = null) {
  const rows = await db.query(
    `SELECT r.* FROM reports r
     JOIN candidates c ON c.id = r.candidate_id
     WHERE r.candidate_id = @candidateId
       AND (@companyId::int IS NULL OR c.company_id = @companyId)
       AND r.status = 'ready'
     ORDER BY r.created DESC
     LIMIT 1`,
    { candidateId, companyId }
  )
  return rows[0] || null
}

/**
 * Get every ready report for a candidate, newest first — full session history
 * (not just the latest), scoped to the manager's company.
 * @param {number} candidateId
 * @param {number|null} companyId
 * @returns {Promise<Array>}
 */
async function getHistoryByCandidate(candidateId, companyId = null) {
  return db.query(
    `SELECT r.*, i.type AS interview_type, i.mode AS interview_mode
     FROM reports r
     JOIN candidates c ON c.id = r.candidate_id
     LEFT JOIN interviews i ON i.id = r.interview_id
     WHERE r.candidate_id = @candidateId
       AND (@companyId::int IS NULL OR c.company_id = @companyId)
       AND r.status = 'ready'
     ORDER BY r.created DESC`,
    { candidateId, companyId }
  )
}

/**
 * Get all team reports for a company (join candidates + latest reports).
 * @param {number} companyId
 * @returns {Promise<Array>}
 */
async function getTeamReports(companyId) {
  return db.query(
    `SELECT
       c.id AS candidate_id,
       u.first_name,
       u.last_name,
       u.email,
       i.type AS interview_type,
       i.mode,
       i.created AS scheduled_date,
       a.id AS attempt_id,
       a.attempt_num AS attempts,
       a.status AS attempt_status,
       a.ended AS completed_date,
       r.id AS report_id,
       r.overall_score,
       10 AS score_max,
       r.confidence,
       r.tech_knowledge,
       r.communication,
       r.summary,
       r.strengths,
       r.pdf_url,
       r.created AS report_date,
       COALESCE(sc.decision, CASE WHEN r.id IS NULL THEN 'pending' ELSE 'needs_review' END) AS decision
     FROM attempts a
     JOIN interviews i ON i.id = a.interview_id
     JOIN candidates c ON c.id = i.candidate_id AND c.company_id = i.company_id
     LEFT JOIN users      u  ON u.id  = c.user_id AND u.deleted IS NULL
     LEFT JOIN reports r ON r.attempt_id = a.id AND r.status = 'ready'
     LEFT JOIN scorecards sc ON sc.interview_id = i.id
     WHERE i.company_id = @companyId
       AND c.deleted IS NULL
       AND a.status = 'completed'
     ORDER BY COALESCE(r.created, a.ended, a.started) DESC`,
    { companyId }
  )
}

async function getTeamReportStats(companyId) {
  const rows = await db.query(
    `SELECT
       COUNT(a.id)::INT AS total_interviews,
       COUNT(r.id)::INT AS reports_ready,
       COUNT(sc.id)::INT AS decisions_recorded,
       COUNT(sc.id) FILTER (WHERE sc.decision = 'pass')::INT AS pass_count,
       ROUND(AVG(r.overall_score)::numeric, 1) AS average_score,
       COUNT(a.id) FILTER (WHERE r.id IS NULL)::INT AS reports_pending
     FROM attempts a
     JOIN interviews i ON i.id = a.interview_id
     JOIN candidates c ON c.id = i.candidate_id AND c.company_id = i.company_id
     LEFT JOIN reports r ON r.attempt_id = a.id AND r.status = 'ready'
     LEFT JOIN scorecards sc ON sc.interview_id = i.id
     WHERE i.company_id = @companyId
       AND c.deleted IS NULL
       AND a.status = 'completed'`,
    { companyId }
  )
  const stats = rows[0] || {}
  const total = Number(stats.total_interviews || 0)
  const passCount = Number(stats.pass_count || 0)
  return {
    totalInterviews: total,
    reportsReady: Number(stats.reports_ready || 0),
    decisionsRecorded: Number(stats.decisions_recorded || 0),
    passCount,
    passRate: total ? Math.round((passCount / total) * 100) : null,
    averageScore: stats.average_score == null ? null : Number(stats.average_score),
    reportsPending: Number(stats.reports_pending || 0),
    scoreMax: 10,
  }
}

/**
 * Save the report PDF URL (Supabase Storage) on a report row.
 * @param {number} id
 * @param {string} pdfUrl
 */
async function updatePdfUrl(id, pdfUrl) {
  await db.query(
    `UPDATE reports SET pdf_url = @pdfUrl WHERE id = @id`,
    { id, pdfUrl }
  )
}

module.exports = { create, getByCandidate, getByAttempt, getLatestByCandidate, getHistoryByCandidate, getTeamReports, getTeamReportStats, updatePdfUrl }
