// backend/src/repositories/interview.repository.js
const db = require('../db/connection')

const CANDIDATE_JOIN = `
  LEFT JOIN users iu ON iu.id = i.internal_user_id
  LEFT JOIN external_candidates ec ON ec.id = i.external_candidate_id`

const CANDIDATE_COLS = `
  COALESCE(iu.first_name, ec.first_name) AS candidate_first,
  COALESCE(iu.last_name, ec.last_name)   AS candidate_last,
  COALESCE(iu.email, ec.email)           AS candidate_email`

async function create(data) {
  const rows = await db.query(
    `INSERT INTO interviews
       (manager_id, internal_user_id, external_candidate_id, type, interview_mode,
        difficulty, question_count, token, token_expires)
     VALUES
       (@manager_id, @internal_user_id, @external_candidate_id, @type, @interview_mode,
        @difficulty, @question_count, @token, @token_expires)
     RETURNING *`,
    {
      manager_id:            data.managerId,
      internal_user_id:      data.internalUserId || null,
      external_candidate_id: data.externalCandidateId || null,
      type:                  data.type || 'ai_voice',
      interview_mode:        data.interviewMode || 'simple',
      difficulty:            data.difficulty || 'medium',
      question_count:        data.questionCount || 10,
      token:                 data.token,
      token_expires:         data.tokenExpires,
    }
  )
  return rows[0]
}

async function getById(id) {
  const rows = await db.query(
    `SELECT i.*, ${CANDIDATE_COLS}, mu.email AS manager_email
     FROM interviews i
     ${CANDIDATE_JOIN}
     LEFT JOIN users mu ON mu.id = i.manager_id
     WHERE i.id = @id`,
    { id }
  )
  return rows[0] || null
}

async function getByToken(token) {
  const rows = await db.query(
    `SELECT i.*, ${CANDIDATE_COLS}
     FROM interviews i
     ${CANDIDATE_JOIN}
     WHERE i.token = @token`,
    { token }
  )
  return rows[0] || null
}

async function getByManager(managerId) {
  return db.query(
    `SELECT i.*, ${CANDIDATE_COLS},
            tm.id AS team_member_id
     FROM interviews i
     ${CANDIDATE_JOIN}
     LEFT JOIN team_members tm ON tm.user_id = i.internal_user_id AND tm.manager_id = i.manager_id
     WHERE i.manager_id = @managerId
     ORDER BY i.created DESC`,
    { managerId }
  )
}

async function getByInternalUser(userId) {
  return db.query(
    `SELECT i.*, ${CANDIDATE_COLS}
     FROM interviews i
     ${CANDIDATE_JOIN}
     WHERE i.internal_user_id = @userId
     ORDER BY i.created DESC`,
    { userId }
  )
}

// Alias used by team.routes.js
const getByInternalUserId = getByInternalUser

async function getByCompany(companyId) {
  return db.query(
    `SELECT i.*, ${CANDIDATE_COLS}
     FROM interviews i
     ${CANDIDATE_JOIN}
     LEFT JOIN users mu ON mu.id = i.manager_id
     WHERE mu.company_id = @companyId
     ORDER BY i.created DESC`,
    { companyId }
  )
}

// Candidate's own interviews (by internal_user_id or external_candidate_id)
async function getByCandidate(candidateId) {
  return db.query(
    `SELECT i.*, ${CANDIDATE_COLS}
     FROM interviews i
     ${CANDIDATE_JOIN}
     WHERE i.internal_user_id = @candidateId
        OR i.external_candidate_id = @candidateId
     ORDER BY i.created DESC`,
    { candidateId }
  )
}

// Used for candidate magic-link flows — look up by interview ID and assert ownership
async function getByIdForCandidate(interviewId, candidateId) {
  const rows = await db.query(
    `SELECT i.*, ${CANDIDATE_COLS}
     FROM interviews i
     ${CANDIDATE_JOIN}
     WHERE i.id = @interviewId
       AND (i.internal_user_id = @candidateId OR i.external_candidate_id = @candidateId)`,
    { interviewId, candidateId }
  )
  return rows[0] || null
}

// Used by interviewer routes — get a human interview assigned to a specific interviewer
// Human interviews are type='human'; we match by manager company for now since we removed interviewer_id
async function getAssignedHuman(interviewId, interviewerId) {
  const rows = await db.query(
    `SELECT i.*, ${CANDIDATE_COLS}
     FROM interviews i
     ${CANDIDATE_JOIN}
     LEFT JOIN users mu ON mu.id = i.manager_id
     LEFT JOIN users iv ON iv.id = @interviewerId
     WHERE i.id = @interviewId
       AND i.type = 'human'
       AND mu.company_id = iv.company_id`,
    { interviewId, interviewerId }
  )
  return rows[0] || null
}

async function updateStatus(id, status) {
  await db.query(
    `UPDATE interviews SET status = @status WHERE id = @id`,
    { id, status }
  )
}

async function markStarted(id) {
  await db.query(
    `UPDATE interviews SET status = 'in_progress', started_at = NOW() WHERE id = @id`,
    { id }
  )
}

async function markCompleted(id, result = 'completed') {
  await db.query(
    `UPDATE interviews SET status = 'completed', ended_at = NOW(), result = @result WHERE id = @id`,
    { id, result }
  )
}

module.exports = {
  create, getById, getByToken, getByManager, getByInternalUser, getByInternalUserId,
  getByCompany, getByCandidate, getByIdForCandidate, getAssignedHuman,
  updateStatus, markStarted, markCompleted
}
