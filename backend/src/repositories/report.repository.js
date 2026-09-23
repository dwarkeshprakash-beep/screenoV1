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

const REPORT_DETAIL_SELECT = `
  SELECT r.*,
         i.id AS interview_id,
         i.type AS interview_type,
         i.status AS interview_status,
         i.result AS interview_result,
         i.created AS interview_date,
         i.scheduled_at,
         COALESCE(iu.first_name, ec.first_name) AS candidate_first,
         COALESCE(iu.last_name, ec.last_name) AS candidate_last,
         COALESCE(iu.email, ec.email) AS candidate_email,
         tm.id AS team_member_id,
         sc.overall AS overall_score,
         sc.confidence,
         sc.tech_knowledge,
         sc.communication,
         sc.problem_solving,
         sc.decision,
         sc.reason,
         ct.client_name,
         ma.subject_name AS assessment_subject
  FROM reports r
  JOIN interviews i ON i.id = r.interview_id
  LEFT JOIN users iu ON iu.id = i.internal_user_id
  LEFT JOIN external_candidates ec ON ec.id = i.external_candidate_id
  LEFT JOIN team_members tm ON tm.user_id = i.internal_user_id AND tm.manager_id = i.manager_id
  LEFT JOIN scorecards sc ON sc.interview_id = r.interview_id
  LEFT JOIN client_templates ct ON ct.id = i.client_template_id
  LEFT JOIN monthly_assessments ma ON ma.id = i.monthly_assessment_id`

async function getDetailByIdForManager(reportId, managerId) {
  const rows = await db.query(`
    ${REPORT_DETAIL_SELECT}
    WHERE r.id = @reportId
      AND i.manager_id = @managerId
    LIMIT 1
  `, { reportId, managerId })
  return rows[0] || null
}

async function getDetailByInterviewForManager(interviewId, managerId) {
  const rows = await db.query(`
    ${REPORT_DETAIL_SELECT}
    WHERE i.id = @interviewId
      AND i.manager_id = @managerId
    ORDER BY r.created DESC
    LIMIT 1
  `, { interviewId, managerId })
  return rows[0] || null
}

async function getDetailByIdForCreator(reportId, creatorUserId) {
  const rows = await db.query(`
    ${REPORT_DETAIL_SELECT}
    WHERE r.id = @reportId
      AND (ct.created_by_user_id = @creatorUserId OR ct.assigned_bde_id = @creatorUserId)
    LIMIT 1
  `, { reportId, creatorUserId })
  return rows[0] || null
}

async function getDetailByInterviewForCreator(interviewId, creatorUserId) {
  const rows = await db.query(`
    ${REPORT_DETAIL_SELECT}
    WHERE i.id = @interviewId
      AND (ct.created_by_user_id = @creatorUserId OR ct.assigned_bde_id = @creatorUserId)
    ORDER BY r.created DESC
    LIMIT 1
  `, { interviewId, creatorUserId })
  return rows[0] || null
}

// Self-scoped "View" tier for the client_mandates ownership chain - owner (manager_id
// on the interview), creator/assigned collaborator on the mandate, or a client_teams
// participant on it. Replaces the getDetailByIdForCreator/getDetailByInterviewForCreator/
// getReportsByCreator/getLatestByInternalUserForCreator/getHistoryByUserForCreator family
// now that visibility is permission-driven rather than a fixed manager/bde portal.
const SELF_SCOPE_PREDICATE = `(
  i.manager_id = @userId
  OR ct.created_by_user_id = @userId
  OR ct.assigned_bde_id = @userId
  OR EXISTS (SELECT 1 FROM client_teams ctm WHERE ctm.mandate_id = ct.id AND ctm.user_id = @userId)
)`

async function getDetailByIdForSelf(reportId, userId) {
  const rows = await db.query(`
    ${REPORT_DETAIL_SELECT}
    WHERE r.id = @reportId
      AND ${SELF_SCOPE_PREDICATE}
    LIMIT 1
  `, { reportId, userId })
  return rows[0] || null
}

async function getDetailByInterviewForSelf(interviewId, userId) {
  const rows = await db.query(`
    ${REPORT_DETAIL_SELECT}
    WHERE i.id = @interviewId
      AND ${SELF_SCOPE_PREDICATE}
    ORDER BY r.created DESC
    LIMIT 1
  `, { interviewId, userId })
  return rows[0] || null
}

// Company-wide "View All" tier - every report for the caller's company, resolved via
// the interview's owning manager's company (interviews always have manager_id set).
async function getDetailByIdForCompany(reportId, companyId) {
  const rows = await db.query(`
    ${REPORT_DETAIL_SELECT}
    JOIN users mgr ON mgr.id = i.manager_id
    WHERE r.id = @reportId
      AND mgr.company_id = @companyId
    LIMIT 1
  `, { reportId, companyId })
  return rows[0] || null
}

async function getDetailByInterviewForCompany(interviewId, companyId) {
  const rows = await db.query(`
    ${REPORT_DETAIL_SELECT}
    JOIN users mgr ON mgr.id = i.manager_id
    WHERE i.id = @interviewId
      AND mgr.company_id = @companyId
    ORDER BY r.created DESC
    LIMIT 1
  `, { interviewId, companyId })
  return rows[0] || null
}

async function getReportsByCreator(creatorUserId) {
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
    WHERE (ct.created_by_user_id = @creatorUserId OR ct.assigned_bde_id = @creatorUserId)
    ORDER BY r.created DESC
  `, { creatorUserId })
}

async function getReportsByManager(managerId, source = null) {
  const sourceFilter = source === 'client' ? 'AND i.client_template_id IS NOT NULL'
    : source === 'monthly' ? 'AND i.monthly_assessment_id IS NOT NULL'
      : source === 'general' ? 'AND i.client_template_id IS NULL AND i.monthly_assessment_id IS NULL'
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

// Self-scoped "View" tier for GET /reports/team - same broadened ownership chain as
// SELF_SCOPE_PREDICATE above, replacing getReportsByCreator.
async function getReportsForSelf(userId, source = null) {
  const sourceFilter = source === 'client' ? 'AND i.client_template_id IS NOT NULL'
    : source === 'monthly' ? 'AND i.monthly_assessment_id IS NOT NULL'
      : source === 'general' ? 'AND i.client_template_id IS NULL AND i.monthly_assessment_id IS NULL'
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
    WHERE ${SELF_SCOPE_PREDICATE}
    ${sourceFilter}
    ORDER BY r.created DESC
  `, { userId })
}

// Company-wide "View All" tier for GET /reports/team.
async function getReportsForCompany(companyId, source = null) {
  const sourceFilter = source === 'client' ? 'AND i.client_template_id IS NOT NULL'
    : source === 'monthly' ? 'AND i.monthly_assessment_id IS NOT NULL'
      : source === 'general' ? 'AND i.client_template_id IS NULL AND i.monthly_assessment_id IS NULL'
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
    JOIN users mgr ON mgr.id = i.manager_id
    LEFT JOIN users iu ON iu.id = i.internal_user_id
    LEFT JOIN external_candidates ec ON ec.id = i.external_candidate_id
    LEFT JOIN team_members tm ON tm.user_id = i.internal_user_id AND tm.manager_id = i.manager_id
    LEFT JOIN scorecards sc ON sc.interview_id = r.interview_id
    LEFT JOIN client_templates ct ON ct.id = i.client_template_id
    LEFT JOIN monthly_assessments ma ON ma.id = i.monthly_assessment_id
    WHERE mgr.company_id = @companyId
    ${sourceFilter}
    ORDER BY r.created DESC
  `, { companyId })
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

async function getStatsForSelf(userId) {
  const rows = await db.query(`
    SELECT COUNT(*) AS total_reports
    FROM reports r
    JOIN interviews i ON i.id = r.interview_id
    LEFT JOIN client_templates ct ON ct.id = i.client_template_id
    WHERE ${SELF_SCOPE_PREDICATE} AND r.status = 'ready'
  `, { userId })
  return rows[0] || { total_reports: 0 }
}

async function getStatsForCompany(companyId) {
  const rows = await db.query(`
    SELECT COUNT(*) AS total_reports
    FROM reports r
    JOIN interviews i ON i.id = r.interview_id
    JOIN users mgr ON mgr.id = i.manager_id
    WHERE mgr.company_id = @companyId AND r.status = 'ready'
  `, { companyId })
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

async function getHistoryByCandidateIdentity({ internalUserId = null, externalCandidateId = null }) {
  const candidatePredicate = internalUserId
    ? { sql: 'i.internal_user_id = @candidateId', candidateId: internalUserId }
    : externalCandidateId
      ? { sql: 'i.external_candidate_id = @candidateId', candidateId: externalCandidateId }
      : { sql: '1 = 0', candidateId: null }
  return db.query(`
    SELECT r.id, r.interview_id, r.summary, r.strengths, r.status, r.created,
           i.type AS interview_type,
           i.scheduled_at,
           COALESCE(ct.client_name, ma.subject_name) AS context_title
    FROM reports r
    JOIN interviews i ON i.id = r.interview_id
    LEFT JOIN client_templates ct ON ct.id = i.client_template_id
    LEFT JOIN monthly_assessments ma ON ma.id = i.monthly_assessment_id
    WHERE ${candidatePredicate.sql}
    ORDER BY r.created DESC
  `, candidatePredicate.candidateId === null ? {} : { candidateId: candidatePredicate.candidateId })
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

async function getLatestByInternalUserForCreator(userId, creatorUserId) {
  const rows = await db.query(`
    SELECT r.*
    FROM reports r
    JOIN interviews i ON i.id = r.interview_id
    JOIN client_templates ct ON ct.id = i.client_template_id
    WHERE i.internal_user_id = @userId
      AND (ct.created_by_user_id = @creatorUserId OR ct.assigned_bde_id = @creatorUserId)
    ORDER BY r.created DESC
    LIMIT 1
  `, { userId, creatorUserId })
  return rows[0] || null
}

async function getHistoryByUserForCreator(userId, creatorUserId) {
  return db.query(`
    SELECT r.*, i.type AS interview_type, i.created AS interview_date,
           sc.overall AS overall_score, sc.confidence, sc.tech_knowledge, sc.communication,
           sc.problem_solving, sc.decision
    FROM reports r
    JOIN interviews i ON i.id = r.interview_id
    JOIN client_templates ct ON ct.id = i.client_template_id
    LEFT JOIN scorecards sc ON sc.interview_id = r.interview_id
    WHERE i.internal_user_id = @userId
      AND (ct.created_by_user_id = @creatorUserId OR ct.assigned_bde_id = @creatorUserId)
    ORDER BY r.created DESC
  `, { userId, creatorUserId })
}

// Note: these "ForSelf"/"ForCompany" pairs take (targetUserId, viewerId/companyId) -
// targetUserId is the candidate whose report history is being viewed, viewerId/companyId
// scopes which of the caller's visible mandates that candidate must belong to.
async function getLatestByInternalUserForSelf(targetUserId, viewerId) {
  const rows = await db.query(`
    SELECT r.*
    FROM reports r
    JOIN interviews i ON i.id = r.interview_id
    LEFT JOIN client_templates ct ON ct.id = i.client_template_id
    WHERE i.internal_user_id = @targetUserId
      AND ${SELF_SCOPE_PREDICATE.replace(/@userId/g, '@viewerId')}
    ORDER BY r.created DESC
    LIMIT 1
  `, { targetUserId, viewerId })
  return rows[0] || null
}

async function getLatestByInternalUserForCompany(targetUserId, companyId) {
  const rows = await db.query(`
    SELECT r.*
    FROM reports r
    JOIN interviews i ON i.id = r.interview_id
    JOIN users mgr ON mgr.id = i.manager_id
    WHERE i.internal_user_id = @targetUserId
      AND mgr.company_id = @companyId
    ORDER BY r.created DESC
    LIMIT 1
  `, { targetUserId, companyId })
  return rows[0] || null
}

async function getHistoryByUserForSelf(targetUserId, viewerId) {
  return db.query(`
    SELECT r.*, i.type AS interview_type, i.created AS interview_date,
           sc.overall AS overall_score, sc.confidence, sc.tech_knowledge, sc.communication,
           sc.problem_solving, sc.decision
    FROM reports r
    JOIN interviews i ON i.id = r.interview_id
    LEFT JOIN client_templates ct ON ct.id = i.client_template_id
    LEFT JOIN scorecards sc ON sc.interview_id = r.interview_id
    WHERE i.internal_user_id = @targetUserId
      AND ${SELF_SCOPE_PREDICATE.replace(/@userId/g, '@viewerId')}
    ORDER BY r.created DESC
  `, { targetUserId, viewerId })
}

async function getHistoryByUserForCompany(targetUserId, companyId) {
  return db.query(`
    SELECT r.*, i.type AS interview_type, i.created AS interview_date,
           sc.overall AS overall_score, sc.confidence, sc.tech_knowledge, sc.communication,
           sc.problem_solving, sc.decision
    FROM reports r
    JOIN interviews i ON i.id = r.interview_id
    JOIN users mgr ON mgr.id = i.manager_id
    LEFT JOIN scorecards sc ON sc.interview_id = r.interview_id
    WHERE i.internal_user_id = @targetUserId
      AND mgr.company_id = @companyId
    ORDER BY r.created DESC
  `, { targetUserId, companyId })
}

module.exports = {
  upsertGenerating,
  updateStatus,
  getByInterview,
  getDetailByIdForManager,
  getDetailByInterviewForManager,
  getDetailByIdForCreator,
  getDetailByInterviewForCreator,
  getDetailByIdForSelf,
  getDetailByInterviewForSelf,
  getDetailByIdForCompany,
  getDetailByInterviewForCompany,
  getReportsByManager,
  getReportsByCreator,
  getReportsForSelf,
  getReportsForCompany,
  getStatsByManager,
  getStatsForSelf,
  getStatsForCompany,
  getLatestByCandidateIdentity,
  getHistoryByCandidateIdentity,
  getLatestByInternalUserForManager,
  getHistoryByUserForManager,
  getLatestByInternalUserForCreator,
  getHistoryByUserForCreator,
  getLatestByInternalUserForSelf,
  getLatestByInternalUserForCompany,
  getHistoryByUserForSelf,
  getHistoryByUserForCompany,
}
