// backend/src/repositories/report.repository.js
const db = require('../db/connection')

async function create(interviewId, summary, strengths, pdfUrl) {
  const rows = await db.query(
    `INSERT INTO reports (interview_id, summary, strengths, pdf_url, status)
     VALUES (@interview_id, @summary, @strengths, @pdf_url, 'generating')
     RETURNING *`,
    { interview_id: interviewId, summary, strengths: JSON.stringify(strengths), pdf_url: pdfUrl }
  )
  return rows[0]
}

async function updateStatus(id, status, pdfUrl = null) {
  await db.query(
    `UPDATE reports SET
       status = @status,
       pdf_url = COALESCE(@pdf_url, pdf_url)
     WHERE id = @id`,
    { id, status, pdf_url: pdfUrl }
  )
}

async function getByInterview(interviewId) {
  const rows = await db.query(
    `SELECT * FROM reports WHERE interview_id = @interviewId ORDER BY created DESC LIMIT 1`,
    { interviewId }
  )
  return rows[0] || null
}

async function getReportsByManager(managerId) {
  return db.query(`
    SELECT r.*,
           COALESCE(iu.first_name, ec.first_name) AS candidate_first,
           COALESCE(iu.last_name,  ec.last_name)  AS candidate_last,
           i.type AS interview_type,
           i.created AS interview_date,
           tm.id AS team_member_id,
           sc.decision,
           sc.overall AS overall_score
    FROM reports r
    JOIN interviews i ON i.id = r.interview_id
    LEFT JOIN users iu ON iu.id = i.internal_user_id
    LEFT JOIN external_candidates ec ON ec.id = i.external_candidate_id
    LEFT JOIN team_members tm ON tm.user_id = i.internal_user_id AND tm.manager_id = i.manager_id
    LEFT JOIN scorecards sc ON sc.interview_id = r.interview_id
    WHERE i.manager_id = @managerId
    ORDER BY r.created DESC
  `, { managerId })
}

async function getStatsByManager(managerId) {
  const rows = await db.query(`
    SELECT COUNT(*) AS total_reports
    FROM reports r
    JOIN interviews i ON i.id = r.interview_id
    WHERE i.manager_id = @managerId AND r.status = 'ready'
  `, { managerId })
  return rows[0] || { total_reports: 0 }
}

// Latest report for a candidate (by internal_user_id) — used by candidate Done page
async function getLatestByCandidate(candidateId) {
  const rows = await db.query(`
    SELECT r.*
    FROM reports r
    JOIN interviews i ON i.id = r.interview_id
    WHERE i.internal_user_id = @candidateId
       OR i.external_candidate_id = @candidateId
    ORDER BY r.created DESC
    LIMIT 1
  `, { candidateId })
  return rows[0] || null
}

// All reports for a user (newest first) — for MemberProfilePage history tab
async function getHistoryByUser(userId) {
  return db.query(`
    SELECT r.*, i.type AS interview_type, i.created AS interview_date,
           sc.overall AS overall_score, sc.confidence, sc.tech_knowledge, sc.communication,
           sc.problem_solving, sc.decision
    FROM reports r
    JOIN interviews i ON i.id = r.interview_id
    LEFT JOIN scorecards sc ON sc.interview_id = r.interview_id
    WHERE i.internal_user_id = @userId
    ORDER BY r.created DESC
  `, { userId })
}

module.exports = { create, updateStatus, getByInterview, getReportsByManager, getStatsByManager, getLatestByCandidate, getHistoryByUser }
