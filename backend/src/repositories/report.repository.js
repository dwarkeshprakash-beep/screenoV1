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

/**
 * Get the most recent report for a candidate.
 * @param {number} candidateId
 * @returns {Promise<Object|null>}
 */
async function getLatestByCandidate(candidateId) {
  const rows = await db.query(
    `SELECT * FROM reports
     WHERE candidate_id = @candidateId AND status = 'ready'
     ORDER BY created DESC
     LIMIT 1`,
    { candidateId }
  )
  return rows[0] || null
}

/**
 * Get all team reports for a company (join candidates + latest reports).
 * @param {number} companyId
 * @returns {Promise<Array>}
 */
async function getTeamReports(companyId) {
  return db.query(
    `SELECT DISTINCT ON (c.id)
       c.id AS candidate_id,
       c.first_name,
       c.last_name,
       c.email,
       c.type,
       r.id AS report_id,
       r.overall_score,
       r.confidence,
       r.tech_knowledge,
       r.communication,
       r.summary,
       r.strengths,
       r.created AS report_date
     FROM candidates c
     LEFT JOIN reports r ON r.candidate_id = c.id AND r.status = 'ready'
     WHERE c.company_id = @companyId AND c.deleted IS NULL
     ORDER BY c.id, r.created DESC`,
    { companyId }
  )
}

/**
 * Save the Cloudinary PDF URL on a report row.
 * @param {number} id
 * @param {string} pdfUrl
 */
async function updatePdfUrl(id, pdfUrl) {
  await db.query(
    `UPDATE reports SET pdf_url = @pdfUrl WHERE id = @id`,
    { id, pdfUrl }
  )
}

module.exports = { create, getByCandidate, getLatestByCandidate, getTeamReports, updatePdfUrl }
