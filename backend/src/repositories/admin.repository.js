// backend/src/repositories/admin.repository.js
// SQL for the platform-admin repair screens (force status changes, broken-state checks).
// These bypass normal ownership rules on purpose - only admin.routes.js should call them.

const db = require('../db/connection')

async function setMandateArchived(mandateId, archived) {
  const rows = await db.query(
    `UPDATE client_templates
     SET archived_at = CASE WHEN @archived THEN NOW() ELSE NULL END
     WHERE id = @mandateId
     RETURNING *`,
    { mandateId, archived }
  )
  return rows[0] || null
}

async function getMandateSummary(mandateId) {
  const rows = await db.query(
    `SELECT id, client_name, manager_id FROM client_templates WHERE id = @mandateId`,
    { mandateId }
  )
  return rows[0] || null
}

async function getRecentInterviews(status) {
  const statusFilter = status ? 'WHERE i.status = @status' : ''
  return db.query(
    `SELECT
       i.id, i.status, i.type, i.scheduled_at, i.available_from, i.due_at,
       i.client_template_id, i.monthly_assessment_id, i.client_team_id, i.created,
       COALESCE(iu.first_name, ec.first_name) AS first_name,
       COALESCE(iu.last_name, ec.last_name) AS last_name,
       COALESCE(iu.email, ec.email) AS email,
       c.name AS company_name,
       ct.client_name AS mandate_name,
       ma.subject_name AS monthly_subject
     FROM interviews i
     LEFT JOIN users iu ON iu.id = i.internal_user_id
     LEFT JOIN external_candidates ec ON ec.id = i.external_candidate_id
     LEFT JOIN users manager ON manager.id = i.manager_id
     LEFT JOIN companies c ON c.id = manager.company_id
     LEFT JOIN client_templates ct ON ct.id = i.client_template_id
     LEFT JOIN monthly_assessments ma ON ma.id = i.monthly_assessment_id
     ${statusFilter}
     ORDER BY i.created DESC
     LIMIT 100`,
    status ? { status } : {}
  )
}

async function setInterviewStatus(interviewId, status) {
  const rows = await db.query(
    `UPDATE interviews
     SET status = @status
     WHERE id = @interviewId
     RETURNING *`,
    { interviewId, status }
  )
  return rows[0] || null
}

async function setClientTeamStatus(clientTeamId, status, notes) {
  const rows = await db.query(
    `UPDATE client_teams
     SET status = @status,
         notes = COALESCE(@notes, notes)
     WHERE id = @clientTeamId
     RETURNING *`,
    { clientTeamId, status, notes }
  )
  return rows[0] || null
}

async function getClientTeamMandate(clientTeamId) {
  const rows = await db.query(
    `SELECT id, mandate_id FROM client_teams WHERE id = @clientTeamId`,
    { clientTeamId }
  )
  return rows[0] || null
}

async function requirementBelongsToMandate(requirementId, mandateId) {
  const rows = await db.query(
    `SELECT id FROM client_mandate_requirements
     WHERE id = @requirementId
       AND mandate_id = @mandateId`,
    { requirementId, mandateId }
  )
  return rows.length > 0
}

async function setClientTeamRequirement(clientTeamId, requirementId) {
  const rows = await db.query(
    `UPDATE client_teams
     SET requirement_id = @requirementId
     WHERE id = @clientTeamId
     RETURNING *`,
    { clientTeamId, requirementId }
  )
  return rows[0] || null
}

async function getOrphanedMandates() {
  return db.query(
    `SELECT ct.id, ct.client_name, ct.manager_id
     FROM client_templates ct
     LEFT JOIN users u ON u.id = ct.manager_id
     WHERE u.id IS NULL`
  )
}

async function getInvalidRequirementLinks() {
  return db.query(
    `SELECT ct.id, ct.mandate_id, ct.user_id, ct.requirement_id
     FROM client_teams ct
     WHERE ct.requirement_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM client_mandate_requirements cmr
         WHERE cmr.id = ct.requirement_id
           AND cmr.mandate_id = ct.mandate_id
       )`
  )
}

async function getStuckInterviews() {
  return db.query(
    `SELECT id, status, type, scheduled_at, created
     FROM interviews
     WHERE status = 'in_progress'
       AND created < NOW() - INTERVAL '7 days'`
  )
}

module.exports = {
  setMandateArchived,
  getMandateSummary,
  getRecentInterviews,
  setInterviewStatus,
  setClientTeamStatus,
  getClientTeamMandate,
  requirementBelongsToMandate,
  setClientTeamRequirement,
  getOrphanedMandates,
  getInvalidRequirementLinks,
  getStuckInterviews,
}
