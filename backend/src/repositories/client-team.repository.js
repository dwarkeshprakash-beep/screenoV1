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

async function create(data) {
  const rows = await db.query(
    `INSERT INTO client_teams (mandate_id, user_id, requirement_id, status, notes)
     VALUES (@mandate_id, @user_id, @requirement_id, @status, @notes)
     ON CONFLICT (mandate_id, user_id) DO UPDATE
       SET requirement_id = COALESCE(EXCLUDED.requirement_id, client_teams.requirement_id),
           status = COALESCE(EXCLUDED.status, client_teams.status),
           notes = COALESCE(EXCLUDED.notes, client_teams.notes)
     RETURNING *`,
    { 
      mandate_id: data.mandate_id, 
      user_id: data.user_id, 
      requirement_id: data.requirement_id || null,
      status: data.status || null,
      notes: data.notes || null
    }
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
            cmr.headcount AS requirement_headcount,
            cmr.jd_text AS requirement_jd_text,
            cmr.resume_deadline AS requirement_resume_deadline
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
            ctm.resume_deadline AS mandate_resume_deadline,
            cmr.profile_name AS requirement_name,
            cmr.years_min AS requirement_years_min,
            cmr.years_max AS requirement_years_max,
            cmr.headcount AS requirement_headcount,
            cmr.jd_text AS requirement_jd_text,
            cmr.resume_deadline AS requirement_resume_deadline
     FROM client_teams ct
     JOIN client_templates ctm ON ctm.id = ct.mandate_id
     LEFT JOIN client_mandate_requirements cmr ON cmr.id = ct.requirement_id
     WHERE ct.user_id = @userId
     ORDER BY ct.created DESC`,
    { userId }
  )
}

async function getByUserAndMandate(userId, mandateId) {
  const rows = await db.query(
    `SELECT ct.*, u.first_name, u.last_name, u.email, u.resume_url,
            ctm.resume_deadline AS mandate_resume_deadline,
            cmr.profile_name AS requirement_name,
            cmr.years_min AS requirement_years_min,
            cmr.years_max AS requirement_years_max,
            cmr.headcount AS requirement_headcount,
            cmr.jd_text AS requirement_jd_text,
            cmr.resume_deadline AS requirement_resume_deadline
     FROM client_teams ct
     JOIN users u ON u.id = ct.user_id
     JOIN client_templates ctm ON ctm.id = ct.mandate_id
     LEFT JOIN client_mandate_requirements cmr ON cmr.id = ct.requirement_id
     WHERE ct.user_id = @userId AND ct.mandate_id = @mandateId`,
    { userId, mandateId }
  )
  return rows[0] || null
}

async function getById(id) {
  const rows = await db.query(
    `SELECT ct.*, u.first_name, u.last_name, u.email, u.resume_url,
            ctm.resume_deadline AS mandate_resume_deadline,
            cmr.profile_name AS requirement_name,
            cmr.years_min AS requirement_years_min,
            cmr.years_max AS requirement_years_max,
            cmr.headcount AS requirement_headcount,
            cmr.jd_text AS requirement_jd_text,
            cmr.resume_deadline AS requirement_resume_deadline
     FROM client_teams ct
     JOIN users u ON u.id = ct.user_id
     JOIN client_templates ctm ON ctm.id = ct.mandate_id
     LEFT JOIN client_mandate_requirements cmr ON cmr.id = ct.requirement_id
     WHERE ct.id = @id`,
    { id }
  )
  return rows[0] || null
}

async function getByIdForMandate(id, mandateId) {
  const rows = await db.query(
    `SELECT ct.*, u.first_name, u.last_name, u.email, u.resume_url,
            cmr.profile_name AS requirement_name,
            cmr.years_min AS requirement_years_min,
            cmr.years_max AS requirement_years_max,
            cmr.headcount AS requirement_headcount,
            cmr.jd_text AS requirement_jd_text,
            cmr.resume_deadline AS requirement_resume_deadline
     FROM client_teams ct
     JOIN users u ON u.id = ct.user_id
     LEFT JOIN client_mandate_requirements cmr ON cmr.id = ct.requirement_id
     WHERE ct.id = @id AND ct.mandate_id = @mandateId`,
    { id, mandateId }
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

async function updateClientResume(id, clientResumeUrl, submittedResumeAssetId) {
  const rows = await db.query(
    `UPDATE client_teams
     SET client_resume_url = @clientResumeUrl, 
         submitted_resume_asset_id = COALESCE(@submittedResumeAssetId, submitted_resume_asset_id),
         resume_updated_at = NOW()
     WHERE id = @id RETURNING *`,
    { id, clientResumeUrl, submittedResumeAssetId: submittedResumeAssetId || null }
  )
  return rows[0]
}

async function updateStatus(id, mandateId, status, notes) {
  const rows = await db.query(
    `UPDATE client_teams
     SET status = COALESCE(@status, status),
         notes  = COALESCE(@notes, notes)
     WHERE id = @id AND mandate_id = @mandateId
     RETURNING *`,
    { id, mandateId, status: status || null, notes: notes || null }
  )
  return rows[0] || null
}

async function update(id, mandateId, data) {
  const rows = await db.query(
    `UPDATE client_teams
     SET requirement_id = COALESCE(@requirement_id, requirement_id),
         status = COALESCE(@status, status),
         notes = COALESCE(@notes, notes),
         jd_sent = COALESCE(@jd_sent, jd_sent),
         jd_sent_at = COALESCE(@jd_sent_at, jd_sent_at)
     WHERE id = @id AND mandate_id = @mandateId
     RETURNING *`,
    { 
      id, 
      mandateId,
      requirement_id: data.requirement_id || null, 
      status: data.status || null, 
      notes: data.notes || null,
      jd_sent: data.jd_sent || null,
      jd_sent_at: data.jd_sent_at || null
    }
  )
  return rows[0] || null
}

async function updateRequirement(id, mandateId, requirementId) {
  const rows = await db.query(
    `UPDATE client_teams
     SET requirement_id = @requirementId
     WHERE id = @id AND mandate_id = @mandateId
     RETURNING *`,
    { id, mandateId, requirementId: requirementId || null }
  )
  return rows[0] || null
}

async function remove(id, mandateId) {
  const rows = await db.query(
    `DELETE FROM client_teams WHERE id = @id AND mandate_id = @mandateId RETURNING *`,
    { id, mandateId }
  )
  return rows[0] || null
}

async function deleteById(id) {
  const rows = await db.query(
    `DELETE FROM client_teams WHERE id = @id RETURNING *`,
    { id }
  )
  return rows[0] || null
}

module.exports = { add, create, getByMandate, getByUser, getByUserAndMandate, getById, getByIdForMandate, markJdSent, updateClientResume, updateStatus, update, updateRequirement, remove, deleteById }
