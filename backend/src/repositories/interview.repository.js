const crypto = require('crypto')
const db = require('../db/connection')

const INTERVIEW_JOINS = `
  LEFT JOIN users iu ON iu.id = i.internal_user_id
  LEFT JOIN external_candidates ec ON ec.id = i.external_candidate_id
  LEFT JOIN users mu ON mu.id = i.manager_id
  LEFT JOIN companies co ON co.id = mu.company_id
  LEFT JOIN client_templates ct ON ct.id = i.client_template_id
  LEFT JOIN monthly_assessments ma ON ma.id = i.monthly_assessment_id`

const INTERVIEW_COLS = `
  COALESCE(iu.first_name, ec.first_name) AS candidate_first,
  COALESCE(iu.last_name, ec.last_name) AS candidate_last,
  COALESCE(iu.email, ec.email) AS candidate_email,
  COALESCE(iu.resume_url, ec.resume_url) AS candidate_resume_url,
  COALESCE(iu.resume_text, ec.resume_text) AS candidate_resume_text,
  COALESCE(iu.tags, ec.tags) AS candidate_tags,
  co.name AS company_name,
  COALESCE(ct.jd_text, ma.ai_generated_jd, i.context_notes) AS context_text,
  COALESCE(ct.tags, ma.sub_topics, i.focus_areas) AS context_focus_areas,
  COALESCE(ct.client_name, ma.subject_name, i.subject_name) AS context_title`

async function create(data) {
  const rows = await db.query(
    `INSERT INTO interviews
     (manager_id, internal_user_id, external_candidate_id, type, interview_mode,
        difficulty, question_count, duration_minutes, token, token_expires,
        client_template_id, monthly_assessment_id, report_emails, scheduled_at,
        available_from, due_at, schedule_timezone, client_team_id, location, meeting_url,
        flow_stage_run_id, calendar_event_id, subject_name, focus_areas, context_notes)
     VALUES
       (@managerId, @internalUserId, @externalCandidateId, @type, @interviewMode,
        @difficulty, @questionCount, @durationMinutes, @tokenHash, @tokenExpires,
        @clientTemplateId, @monthlyAssessmentId, @reportEmails, @scheduledAt,
        @availableFrom, @dueAt, @scheduleTimezone, @clientTeamId, @location, @meetingUrl,
        @flowStageRunId, @calendarEventId, @subjectName, @focusAreas, @contextNotes)
     RETURNING id, manager_id, internal_user_id, external_candidate_id, type,
       interview_mode, difficulty, question_count, duration_minutes, token_expires, status,
       client_template_id, monthly_assessment_id, report_emails, scheduled_at,
       available_from, due_at, schedule_timezone, client_team_id, location, meeting_url,
       flow_stage_run_id, calendar_event_id, subject_name, focus_areas, context_notes, created`,
    {
      managerId: data.managerId,
      internalUserId: data.internalUserId || null,
      externalCandidateId: data.externalCandidateId || null,
      type: data.type || 'ai_voice',
      interviewMode: data.interviewMode || 'simple',
      difficulty: data.difficulty || 'medium',
      questionCount: Math.min(50, Math.max(1, Number(data.questionCount) || 10)),
      durationMinutes: data.durationMinutes || null,
      tokenHash: data.tokenHash,
      tokenExpires: data.tokenExpires,
      clientTemplateId: data.clientTemplateId || null,
      monthlyAssessmentId: data.monthlyAssessmentId || null,
      reportEmails: data.reportEmails || null,
      scheduledAt: data.scheduledAt || null,
      availableFrom: data.availableFrom || null,
      dueAt: data.dueAt || null,
      scheduleTimezone: data.scheduleTimezone || null,
      clientTeamId: data.clientTeamId || null,
      location: data.location || null,
      meetingUrl: data.meetingUrl || null,
      flowStageRunId: data.flowStageRunId || null,
      calendarEventId: data.calendarEventId || null,
      // General-assessment context (null for mandate / monthly interviews)
      subjectName: data.subjectName || null,
      focusAreas: data.focusAreas || null,
      contextNotes: data.contextNotes || null,
    }
  )
  return rows[0]
}

async function getById(id) {
  const rows = await db.query(
    `SELECT i.*, ${INTERVIEW_COLS}, mu.email AS manager_email, mu.company_id AS company_id
     FROM interviews i
     ${INTERVIEW_JOINS}
     WHERE i.id = @id`,
    { id }
  )
  return rows[0] || null
}

async function getByToken(rawToken) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const rows = await db.query(
    `SELECT i.*, ${INTERVIEW_COLS}, mu.email AS manager_email, mu.company_id AS company_id
     FROM interviews i
     ${INTERVIEW_JOINS}
     WHERE i.token = @tokenHash`,
    { tokenHash }
  )
  return rows[0] || null
}

async function getByManager(managerId) {
  return db.query(
    `SELECT i.*, ${INTERVIEW_COLS}, tm.id AS team_member_id,
            sc.overall AS overall_score
     FROM interviews i
     ${INTERVIEW_JOINS}
     LEFT JOIN team_members tm
       ON tm.user_id = i.internal_user_id AND tm.manager_id = i.manager_id
     LEFT JOIN scorecards sc ON sc.interview_id = i.id
     WHERE i.manager_id = @managerId
     ORDER BY i.created DESC`,
    { managerId }
  )
}

// Self-scoped "View" tier for the client_mandates ownership chain - owner (own
// scheduled interviews via manager_id), creator/assigned collaborator on the mandate,
// or a client_teams participant on it. Replaces getByMandateCreator, which only
// checked created_by_user_id (missing assigned_bde_id was a bug) and didn't cover a
// caller's own non-mandate interviews the way the old "manager" portal branch did.
async function getVisibleToUser(userId) {
  return db.query(
    `SELECT i.*, ${INTERVIEW_COLS}, tm.id AS team_member_id,
            sc.overall AS overall_score
     FROM interviews i
     ${INTERVIEW_JOINS}
     LEFT JOIN team_members tm
       ON tm.user_id = i.internal_user_id AND tm.manager_id = i.manager_id
     LEFT JOIN scorecards sc ON sc.interview_id = i.id
     WHERE i.manager_id = @userId
        OR ct.created_by_user_id = @userId
        OR ct.assigned_bde_id = @userId
        OR EXISTS (SELECT 1 FROM client_teams ctm WHERE ctm.mandate_id = ct.id AND ctm.user_id = @userId)
     ORDER BY i.created DESC`,
    { userId }
  )
}

async function getByClientTemplateForManager(clientTemplateId, managerId) {
  return db.query(
    `SELECT i.id, i.internal_user_id, i.external_candidate_id, i.status, i.result,
            i.interview_mode, i.difficulty, i.question_count, i.duration_minutes,
            i.scheduled_at, i.created,
            ${INTERVIEW_COLS}
     FROM interviews i
     ${INTERVIEW_JOINS}
     WHERE i.client_template_id = @clientTemplateId
       AND i.manager_id = @managerId
     ORDER BY i.created DESC`,
    { clientTemplateId, managerId }
  )
}

async function getByClientTeamId(clientTeamId) {
  return db.query(
    `SELECT i.*, ${INTERVIEW_COLS}
     FROM interviews i
     ${INTERVIEW_JOINS}
     WHERE i.client_team_id = @clientTeamId
     ORDER BY i.created DESC`,
    { clientTeamId }
  )
}

async function cancelScheduledClientInterview(interviewId, clientTemplateId, managerId) {
  const rows = await db.query(
    `UPDATE interviews
     SET status = 'cancelled', result = 'cancelled'
     WHERE id = @interviewId
       AND client_template_id = @clientTemplateId
       AND manager_id = @managerId
       AND status = 'scheduled'
     RETURNING id, status, result`,
    { interviewId, clientTemplateId, managerId }
  )
  return rows[0] || null
}

// For the Admin Users module - every interview this internal user was the
// candidate for, scoped by their OWN company (iu.company_id), not the manager
// who created the interview. Includes the report row (at most one per interview,
// enforced by reports.interview_id being unique - see report.repository.js
// upsertGenerating's ON CONFLICT) so the UI can tell "no report yet" from "ready".
async function getByInternalUserForCompany(userId, companyId) {
  return db.query(
    `SELECT i.id, i.type, i.status, i.result, i.question_count, i.scheduled_at,
            i.started_at, i.ended_at, i.created,
            sc.overall AS overall_score, sc.decision,
            r.id AS report_id, r.status AS report_status, r.pdf_url AS report_pdf_url,
            COALESCE(ct.client_name, ma.subject_name, i.subject_name) AS context_title
     FROM interviews i
     JOIN users iu ON iu.id = i.internal_user_id
     LEFT JOIN scorecards sc ON sc.interview_id = i.id
     LEFT JOIN reports r ON r.interview_id = i.id
     LEFT JOIN client_templates ct ON ct.id = i.client_template_id
     LEFT JOIN monthly_assessments ma ON ma.id = i.monthly_assessment_id
     WHERE i.internal_user_id = @userId AND iu.company_id = @companyId
     ORDER BY i.created DESC`,
    { userId, companyId }
  )
}

// Company-wide "View All" tier (also used as the schedule module's company-wide view -
// see schedule.service.js#getScheduledInterviewsForCompany). Includes the same
// team_member_id/overall_score joins as getByManager/getVisibleToUser for shape parity.
async function getByCompany(companyId) {
  return db.query(
    `SELECT i.*, ${INTERVIEW_COLS}, tm.id AS team_member_id,
            sc.overall AS overall_score
     FROM interviews i
     ${INTERVIEW_JOINS}
     LEFT JOIN team_members tm
       ON tm.user_id = i.internal_user_id AND tm.manager_id = i.manager_id
     LEFT JOIN scorecards sc ON sc.interview_id = i.id
     WHERE mu.company_id = @companyId
     ORDER BY i.created DESC`,
    { companyId }
  )
}

async function getByCandidateIdentity({ internalUserId = null, externalCandidateId = null }) {
  const predicate = internalUserId
    ? { sql: 'i.internal_user_id = @candidateId', candidateId: internalUserId }
    : externalCandidateId
      ? { sql: 'i.external_candidate_id = @candidateId', candidateId: externalCandidateId }
      : { sql: '1 = 0', candidateId: null }
  return db.query(
    `SELECT i.*, ${INTERVIEW_COLS}, sc.decision AS candidate_decision
     FROM interviews i
     ${INTERVIEW_JOINS}
     LEFT JOIN scorecards sc ON sc.interview_id = i.id
     WHERE ${predicate.sql}
     ORDER BY i.created DESC`,
    predicate.candidateId === null ? {} : { candidateId: predicate.candidateId }
  )
}

async function getByIdForCandidateIdentity(
  interviewId,
  { internalUserId = null, externalCandidateId = null }
) {
  const predicate = internalUserId
    ? { sql: 'i.internal_user_id = @candidateId', candidateId: internalUserId }
    : externalCandidateId
      ? { sql: 'i.external_candidate_id = @candidateId', candidateId: externalCandidateId }
      : { sql: '1 = 0', candidateId: null }
  const rows = await db.query(
    `SELECT i.*, ${INTERVIEW_COLS}, mu.email AS manager_email, mu.company_id AS company_id
     FROM interviews i
     ${INTERVIEW_JOINS}
     WHERE i.id = @interviewId
       AND ${predicate.sql}`,
    {
      interviewId,
      ...(predicate.candidateId === null ? {} : { candidateId: predicate.candidateId }),
    }
  )
  return rows[0] || null
}

async function updateStatus(id, status) {
  await db.query(
    `UPDATE interviews SET status = @status WHERE id = @id`,
    { id, status }
  )
}

async function updateResult(id, result) {
  await db.query(
    `UPDATE interviews SET result = @result WHERE id = @id`,
    { id, result }
  )
}

async function markStarted(id) {
  await db.query(
    `UPDATE interviews
     SET status = 'in_progress', started_at = COALESCE(started_at, NOW())
     WHERE id = @id`,
    { id }
  )
}

async function markCompleted(id, result = 'success') {
  await db.query(
    `UPDATE interviews
     SET status = 'completed', ended_at = NOW(), result = @result
     WHERE id = @id`,
    { id, result }
  )
}

async function updateTokenHash(id, tokenHash, tokenExpires) {
  await db.query(
    `UPDATE interviews
     SET token = @tokenHash, token_expires = @tokenExpires
     WHERE id = @id`,
    { id, tokenHash, tokenExpires }
  )
}

async function updateMeetingDetails(id, meetingUrl, calendarEventId) {
  const rows = await db.query(
    `UPDATE interviews
     SET meeting_url = @meetingUrl, calendar_event_id = @calendarEventId,
         calendar_sync_error = NULL
     WHERE id = @id RETURNING *`,
    { id, meetingUrl: meetingUrl || null, calendarEventId: calendarEventId || null }
  )
  return rows[0] || null
}

async function setCalendarSyncError(id, error) {
  const rows = await db.query(
    `UPDATE interviews SET calendar_sync_error = @error
     WHERE id = @id RETURNING *`,
    { id, error: String(error || '').slice(0, 2000) || null }
  )
  return rows[0] || null
}

/** Atomically claim a scheduled interview whose attendance window has expired. */
async function markExpiredNoShow(id) {
  const rows = await db.query(
    `UPDATE interviews
     SET status = 'completed', result = 'expired_no_show', ended_at = CURRENT_TIMESTAMP
     WHERE id = @id AND status = 'scheduled'
       AND due_at IS NOT NULL AND due_at <= CURRENT_TIMESTAMP
     RETURNING *`,
    { id }
  )
  return rows[0] || null
}

async function updateSchedule(id, data) {
  const rows = await db.query(
    `UPDATE interviews
     SET scheduled_at = COALESCE(@scheduledAt, scheduled_at),
         available_from = COALESCE(@availableFrom, available_from),
         due_at = COALESCE(@dueAt, due_at),
         schedule_timezone = COALESCE(@scheduleTimezone, schedule_timezone),
         token = COALESCE(@tokenHash, token),
         token_expires = COALESCE(@tokenExpires, token_expires),
         status = CASE WHEN status = 'cancelled' THEN 'scheduled' ELSE status END
     WHERE id = @id
     RETURNING *`,
    {
      id,
      scheduledAt: data.scheduledAt || null,
      availableFrom: data.availableFrom || null,
      dueAt: data.dueAt || null,
      scheduleTimezone: data.scheduleTimezone || null,
      tokenHash: data.tokenHash || null,
      tokenExpires: data.tokenExpires || null,
    }
  )
  return rows[0] || null
}

// Candidate-safe interview list for many client_teams rows in one query (newest first
// within each row). candidate_result exposes only pass/fail, never scores. Callers group
// by client_team_id.
async function getCandidateViewByClientTeamIds(clientTeamIds) {
  if (clientTeamIds.length === 0) return []
  return db.query(
    `SELECT i.client_team_id, i.id, i.type, i.status, i.scheduled_at, i.duration_minutes,
            i.location, i.created,
            CASE
              WHEN i.status = 'completed' AND (sc.decision = 'pass' OR i.result = 'pass') THEN 'pass'
              WHEN i.status = 'completed' AND (
                sc.decision IS NOT NULL
                OR i.result IN ('fail', 'failed_mid_interview', 'cheating_attempt', 'expired_no_show')
              ) THEN 'fail'
              ELSE NULL
            END AS candidate_result
     FROM interviews i
     LEFT JOIN scorecards sc ON sc.interview_id = i.id
     WHERE i.client_team_id = ANY(@clientTeamIds)
     ORDER BY i.created DESC`,
    { clientTeamIds }
  )
}

// One month's interview in a monthly-assessment plan. Runs inside the caller's transaction.
async function createMonthlyOccurrenceInterview(tx, data) {
  const rows = await tx.query(
    `INSERT INTO interviews
      (manager_id, internal_user_id, type, interview_mode, difficulty, question_count,
       duration_minutes, scheduled_at, available_from, due_at, schedule_timezone,
       monthly_assessment_id, report_emails)
     VALUES
      (@managerId, @internalUserId, @interviewType, @interviewMode, @difficulty, @questionCount,
       @durationMinutes, @scheduledAt, @availableFrom, @dueAt, @scheduleTimezone,
       @monthlyAssessmentId, @reportEmails)
     RETURNING *`,
    {
      managerId: data.managerId,
      internalUserId: data.internalUserId,
      interviewType: data.interviewType,
      interviewMode: data.interviewMode,
      difficulty: data.difficulty,
      questionCount: data.questionCount,
      durationMinutes: data.durationMinutes,
      scheduledAt: data.scheduledAt,
      availableFrom: data.availableFrom,
      dueAt: data.dueAt,
      scheduleTimezone: data.scheduleTimezone,
      monthlyAssessmentId: data.monthlyAssessmentId,
      reportEmails: data.reportEmails,
    }
  )
  return rows[0]
}

// Just the fields the email worker needs to decide whether to (re)send an invite.
async function getLaunchState(id) {
  const rows = await db.query(
    `SELECT id, status, due_at, available_from, schedule_timezone, duration_minutes
     FROM interviews WHERE id = @id`,
    { id }
  )
  return rows[0] || null
}

/**
 * Single-use magic-link claim. Locks the interview row, runs `validate(interview)` inside
 * the lock (it throws to reject the claim, which rolls back), then clears the token so
 * the link can't be used again.
 * @param {string} tokenHash
 * @param {(interview: object) => Promise<void>} validate
 * @returns {Promise<object|null>} the interview as it was before clearing, or null if no match
 */
async function claimByTokenHash(tokenHash, validate) {
  return db.transaction(async (tx) => {
    const rows = await tx.query(
      `SELECT *
       FROM interviews
       WHERE token = @tokenHash
       FOR UPDATE`,
      { tokenHash }
    )
    const interview = rows[0]
    if (!interview) return null

    await validate(interview)

    await tx.query(
      `UPDATE interviews
       SET token = NULL,
           token_expires = NULL
       WHERE id = @id`,
      { id: interview.id }
    )
    return interview
  })
}

// Link a client-mandate interview to its client_teams row and store where/when it happens.
async function linkClientTeamSchedule(id, { ctId, scheduledAt, location, meetingUrl }) {
  await db.query(
    `UPDATE interviews SET client_team_id = @ctId, scheduled_at = @scheduledAt, location = @location, meeting_url = @meetingUrl WHERE id = @id`,
    { id, ctId, scheduledAt, location, meetingUrl }
  )
}

module.exports = {
  create,
  getById,
  getByToken,
  getByManager,
  getVisibleToUser,
  getByClientTemplateForManager,
  getByClientTeamId,
  cancelScheduledClientInterview,
  getByInternalUserForCompany,
  getByCompany,
  getByCandidateIdentity,
  getByIdForCandidateIdentity,
  updateStatus,
  updateResult,
  markStarted,
  markCompleted,
  updateTokenHash,
  updateMeetingDetails,
  setCalendarSyncError,
  linkClientTeamSchedule,
  getCandidateViewByClientTeamIds,
  claimByTokenHash,
  getLaunchState,
  createMonthlyOccurrenceInterview,
  markExpiredNoShow,
  updateSchedule,
}
