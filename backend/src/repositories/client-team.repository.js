// backend/src/repositories/client-team.repository.js
const db = require('../db/connection')

async function add(mandateId, userId, requirementId) {
  const rows = await db.query(
    `INSERT INTO client_teams (mandate_id, user_id, requirement_id)
     VALUES (@mandateId, @userId, @requirementId)
     ON CONFLICT (mandate_id, user_id) DO UPDATE
       SET requirement_id = COALESCE(EXCLUDED.requirement_id, client_teams.requirement_id)
     RETURNING *`,
    { mandateId, userId, requirementId: requirementId || null }
  )
  return rows[0]
}

async function getByMandate(mandateId) {
  return db.query(
    `SELECT ct.*,
            u.first_name, u.last_name, u.email, u.resume_url, u.tags, u.job_title,
            cmr.profile_name AS requirement_name,
            cmr.years_min AS requirement_years_min,
            cmr.years_max AS requirement_years_max,
            cmr.headcount AS requirement_headcount
     FROM client_teams ct
     JOIN users u ON u.id = ct.user_id
     LEFT JOIN client_mandate_requirements cmr ON cmr.id = ct.requirement_id
     WHERE ct.mandate_id = @mandateId
     ORDER BY ct.created ASC`,
    { mandateId }
  )
}

async function getByUser(userId) {
  return db.query(
    `SELECT ct.*,
            ctm.client_name, ctm.requirements AS mandate_role, ctm.jd_text, ctm.tags AS mandate_tags,
            cmr.profile_name AS requirement_name,
            cmr.years_min AS requirement_years_min,
            cmr.years_max AS requirement_years_max,
            cmr.headcount AS requirement_headcount
     FROM client_teams ct
     JOIN client_templates ctm ON ctm.id = ct.mandate_id
     LEFT JOIN client_mandate_requirements cmr ON cmr.id = ct.requirement_id
     WHERE ct.user_id = @userId
     ORDER BY ct.created DESC`,
    { userId }
  )
}

async function getById(id) {
  const rows = await db.query(
    `SELECT ct.*, u.first_name, u.last_name, u.email, u.resume_url,
            cmr.profile_name AS requirement_name,
            cmr.years_min AS requirement_years_min,
            cmr.years_max AS requirement_years_max,
            cmr.headcount AS requirement_headcount
     FROM client_teams ct
     JOIN users u ON u.id = ct.user_id
     LEFT JOIN client_mandate_requirements cmr ON cmr.id = ct.requirement_id
     WHERE ct.id = @id`,
    { id }
  )
  return rows[0] || null
}

async function markJdSent(id) {
  const rows = await db.query(
    `UPDATE client_teams SET jd_sent = TRUE, jd_sent_at = NOW() WHERE id = @id RETURNING *`,
    { id }
  )
  return rows[0]
}

async function updateClientResume(id, clientResumeUrl) {
  const rows = await db.query(
    `UPDATE client_teams
     SET client_resume_url = @clientResumeUrl, resume_updated_at = NOW()
     WHERE id = @id RETURNING *`,
    { id, clientResumeUrl }
  )
  return rows[0]
}

async function updateStatus(id, status, notes) {
  const rows = await db.query(
    `UPDATE client_teams
     SET status = COALESCE(@status, status),
         notes  = COALESCE(@notes,  notes)
     WHERE id = @id RETURNING *`,
    { id, status: status || null, notes: notes || null }
  )
  return rows[0]
}

async function remove(id, mandateId) {
  const rows = await db.query(
    `DELETE FROM client_teams WHERE id = @id AND mandate_id = @mandateId RETURNING *`,
    { id, mandateId }
  )
  return rows[0] || null
}

module.exports = { add, getByMandate, getByUser, getById, markJdSent, updateClientResume, updateStatus, remove }
