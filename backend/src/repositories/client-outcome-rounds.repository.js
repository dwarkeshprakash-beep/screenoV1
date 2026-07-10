// backend/src/repositories/client-outcome-rounds.repository.js
// Handles CRUD for client_interview_rounds.
// Manager-facing: returns all fields.
// Candidate-facing: NEVER returns manager_notes (DTO allowlist enforced here).

const db = require('../db/connection')

const VALID_OUTCOMES = ['pending', 'passed', 'failed', 'on_hold', 'offer_made', 'hired', 'withdrawn']

function validateOutcome(outcome) {
  if (outcome && !VALID_OUTCOMES.includes(outcome)) {
    throw new Error(`Invalid outcome. Must be one of: ${VALID_OUTCOMES.join(', ')}`)
  }
}

// ── Manager: all fields ───────────────────────────────────────────────────────

async function listByClientTeamId(clientTeamId, mandateId) {
  return db.query(
    `SELECT cr.* FROM client_interview_rounds cr
     JOIN client_teams ct ON ct.id = cr.client_team_id
     WHERE cr.client_team_id = @clientTeamId AND ct.mandate_id = @mandateId
     ORDER BY cr.round_number ASC`,
    { clientTeamId, mandateId }
  )
}

async function getById(id) {
  const rows = await db.query(
    `SELECT * FROM client_interview_rounds WHERE id = @id`,
    { id }
  )
  return rows[0] || null
}

async function getByIdForMandate(id, mandateId) {
  const rows = await db.query(
    `SELECT cr.* FROM client_interview_rounds cr
     JOIN client_teams ct ON ct.id = cr.client_team_id
     WHERE cr.id = @id AND ct.mandate_id = @mandateId`,
    { id, mandateId }
  )
  return rows[0] || null
}

async function getNextRoundNumber(clientTeamId) {
  const rows = await db.query(
    `SELECT COALESCE(MAX(round_number), 0) + 1 AS next_round
     FROM client_interview_rounds
     WHERE client_team_id = @clientTeamId`,
    { clientTeamId }
  )
  return rows[0]?.next_round || 1
}

async function create(clientTeamId, mandateId, managerId, data) {
  // Verify clientTeamId belongs to mandateId
  const ctRows = await db.query(`SELECT id FROM client_teams WHERE id = @clientTeamId AND mandate_id = @mandateId`, { clientTeamId, mandateId })
  if (ctRows.length === 0) throw new Error('Forbidden: Client team does not belong to this mandate')

  validateOutcome(data.outcome)
  const roundNumber = await getNextRoundNumber(clientTeamId)
  const rows = await db.query(
    `INSERT INTO client_interview_rounds
       (client_team_id, round_number, interview_at, outcome, feedback, manager_notes,
        candidate_visible, created_by_manager_id)
     VALUES
       (@clientTeamId, @roundNumber, @interviewAt, @outcome, @feedback, @managerNotes,
        FALSE, @managerId)
     RETURNING *`,
    {
      clientTeamId,
      roundNumber,
      interviewAt: data.interview_at || null,
      outcome: data.outcome || 'pending',
      feedback: data.feedback || null,
      managerNotes: data.manager_notes || null,
      managerId,
    }
  )
  return rows[0]
}

async function update(id, clientTeamId, mandateId, managerId, data) {
  // Cannot edit a published round — must unpublish first
  const existing = await getByIdForMandate(id, mandateId)
  if (!existing) throw new Error('Round not found or access denied')
  if (existing.client_team_id !== clientTeamId) throw new Error('Forbidden')
  
  if (existing.candidate_visible && existing.published_at) {
    throw new Error('Cannot edit a published round. Unpublish it first.')
  }
  validateOutcome(data.outcome)

  const rows = await db.query(
    `UPDATE client_interview_rounds
     SET interview_at = COALESCE(@interviewAt, interview_at),
         outcome = COALESCE(@outcome, outcome),
         feedback = COALESCE(@feedback, feedback),
         manager_notes = COALESCE(@managerNotes, manager_notes),
         updated = CURRENT_TIMESTAMP
     WHERE id = @id
     RETURNING *`,
    {
      id,
      interviewAt: data.interview_at !== undefined ? (data.interview_at || null) : undefined,
      outcome: data.outcome || null,
      feedback: data.feedback !== undefined ? (data.feedback || null) : null,
      managerNotes: data.manager_notes !== undefined ? (data.manager_notes || null) : null,
    }
  )
  return rows[0]
}

async function publish(id, clientTeamId, mandateId) {
  const existing = await getByIdForMandate(id, mandateId)
  if (!existing) throw new Error('Round not found or access denied')
  if (existing.client_team_id !== clientTeamId) throw new Error('Forbidden')

  const rows = await db.query(
    `UPDATE client_interview_rounds
     SET candidate_visible = TRUE, published_at = CURRENT_TIMESTAMP, updated = CURRENT_TIMESTAMP
     WHERE id = @id
     RETURNING *`,
    { id }
  )
  return rows[0]
}

async function unpublish(id, clientTeamId, mandateId) {
  const existing = await getByIdForMandate(id, mandateId)
  if (!existing) throw new Error('Round not found or access denied')
  if (existing.client_team_id !== clientTeamId) throw new Error('Forbidden')

  const rows = await db.query(
    `UPDATE client_interview_rounds
     SET candidate_visible = FALSE, published_at = NULL, updated = CURRENT_TIMESTAMP
     WHERE id = @id
     RETURNING *`,
    { id }
  )
  return rows[0]
}

// ── Candidate: safe DTO (no manager_notes) ────────────────────────────────────

function toSafeDto(round) {
  return {
    id: round.id,
    client_team_id: round.client_team_id,
    round_number: round.round_number,
    interview_at: round.interview_at,
    outcome: round.outcome,
    feedback: round.feedback,
    candidate_visible: round.candidate_visible,
    published_at: round.published_at,
    created: round.created,
    updated: round.updated,
    // manager_notes: OMITTED — never included in candidate DTO
  }
}

async function listVisibleByClientTeamId(clientTeamId) {
  const rows = await db.query(
    `SELECT id, client_team_id, round_number, interview_at, outcome, feedback,
            candidate_visible, published_at, created, updated
     FROM client_interview_rounds
     WHERE client_team_id = @clientTeamId
       AND candidate_visible = TRUE
     ORDER BY round_number ASC`,
    { clientTeamId }
  )
  return rows.map(toSafeDto)
}

module.exports = {
  listByClientTeamId,
  getById,
  getByIdForMandate,
  create,
  update,
  publish,
  unpublish,
  listVisibleByClientTeamId,
  VALID_OUTCOMES,
  toSafeDto,
}
