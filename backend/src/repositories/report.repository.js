const db = require('../db/connection')

async function upsertGenerating({ interviewId, scorecardId, summary, strengths }) {
  const rows = await db.query(
    `INSERT INTO reports
       (interview_id, scorecard_id, summary, strengths, status)
     VALUES
       (@interviewId, @scorecardId, @summary, @strengths, 'generating')
     ON CONFLICT (interview_id) DO UPDATE SET
       scorecard_id = EXCLUDED.scorecard_id,
       summary      = EXCLUDED.summary,
       strengths    = EXCLUDED.strengths,
       status       = 'generating'
     RETURNING *`,
    {
      interviewId,
      scorecardId,
      summary,
      strengths: JSON.stringify(strengths || []),
    }
  )
  return rows[0]
}

async function updateStatus(id, status, pdfUrl = null) {
  const rows = await db.query(
    `UPDATE reports SET
       status = @status,
       pdf_url = COALESCE(@pdfUrl, pdf_url)
     WHERE id = @id
     RETURNING *`,
    { id, status, pdfUrl }
  )
  return rows[0] || null
}

async function getByInterview(interviewId) {
  const rows = await db.query(
    `SELECT * FROM reports WHERE interview_id = @interviewId ORDER BY created DESC LIMIT 1`,
    { interviewId }
  )
  return rows[0] || null
}

async function getReportsByManager(managerId, source = null) {
  const sourceFilter = source === 'client' ? 'AND i.client_template_id IS NOT NULL'
    : source === 'monthly' ? 'AND i.monthly_assessment_id IS NOT NULL'
      : ''
  return db.query(`
    SELECT r.*,
           COALESCE(iu.first_name, ec.first_name) AS candidate_first,
           COALESCE(iu.last_name, ec.last_name) AS candidate_last,
           i.type AS interview_type,
           i.created AS interview_date,
           i.client_template_id,
           i.monthly_assessment_id,
           tm.id AS team_member_id,
           sc.decision,
           sc.overall AS overall_score,
           ct.client_name,
           ma.subject_name AS assessment_subject
    FROM reports r
    JOIN interviews i ON i.id = r.interview_id
    LEFT JOIN users iu ON iu.id = i.internal_user_id
    LEFT JOIN external_candidates ec ON ec.id = i.external_candidate_id
    LEFT JOIN team_members tm ON tm.user_id = i.internal_user_id AND tm.manager_id = i.manager_id
    LEFT JOIN scorecards sc ON sc.interview_id = r.interview_id
    LEFT JOIN client_templates ct ON ct.id = i.client_template_id
    LEFT JOIN monthly_assessments ma ON ma.id = i.monthly_assessment_id
    WHERE i.manager_id = @managerId
    ${sourceFilter}
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

async function getLatestByCandidateIdentity(
  { internalUserId = null, externalCandidateId = null },
  interviewId = null
) {
  const candidatePredicate = internalUserId
    ? { sql: 'i.internal_user_id = @candidateId', candidateId: internalUserId }
    : externalCandidateId
      ? { sql: 'i.external_candidate_id = @candidateId', candidateId: externalCandidateId }
      : { sql: '1 = 0', candidateId: null }
  const interviewPredicate = interviewId ? 'AND i.id = @interviewId' : ''
  const rows = await db.query(`
    SELECT r.*
    FROM reports r
    JOIN interviews i ON i.id = r.interview_id
    WHERE ${candidatePredicate.sql}
      ${interviewPredicate}
    ORDER BY r.created DESC
    LIMIT 1
  `, {
    ...(candidatePredicate.candidateId === null
      ? {}
      : { candidateId: candidatePredicate.candidateId }),
    ...(interviewId ? { interviewId } : {}),
  })
  return rows[0] || null
}

async function getLatestByInternalUserForManager(userId, managerId) {
  const rows = await db.query(`
    SELECT r.*
    FROM reports r
    JOIN interviews i ON i.id = r.interview_id
    WHERE i.internal_user_id = @userId
      AND i.manager_id = @managerId
    ORDER BY r.created DESC
    LIMIT 1
  `, { userId, managerId })
  return rows[0] || null
}

async function getHistoryByUserForManager(userId, managerId) {
  return db.query(`
    SELECT r.*, i.type AS interview_type, i.created AS interview_date,
           sc.overall AS overall_score, sc.confidence, sc.tech_knowledge, sc.communication,
           sc.problem_solving, sc.decision
    FROM reports r
    JOIN interviews i ON i.id = r.interview_id
    LEFT JOIN scorecards sc ON sc.interview_id = r.interview_id
    WHERE i.internal_user_id = @userId
      AND i.manager_id = @managerId
    ORDER BY r.created DESC
  `, { userId, managerId })
}

module.exports = {
  upsertGenerating,
  updateStatus,
  getByInterview,
  getReportsByManager,
  getStatsByManager,
  getLatestByCandidateIdentity,
  getLatestByInternalUserForManager,
  getHistoryByUserForManager,
}
