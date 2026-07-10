// backend/src/repositories/client-mandate-requirements.repository.js
const db = require('../db/connection')

async function create(mandateId, data) {
  const rows = await db.query(
    `INSERT INTO client_mandate_requirements
       (mandate_id, profile_name, years_min, years_max, headcount, notes, jd_text, tags, resume_deadline)
     VALUES (@mandateId, @profileName, @yearsMin, @yearsMax, @headcount, @notes, @jdText, @tags, @resumeDeadline)
     RETURNING *`,
    {
      mandateId,
      profileName: data.profile_name,
      yearsMin:    data.years_min    != null ? Number(data.years_min)   : null,
      yearsMax:    data.years_max    != null ? Number(data.years_max)   : null,
      headcount:   data.headcount    != null ? Number(data.headcount)   : 1,
      notes:       data.notes        || null,
      jdText:      data.jd_text      || null,
      tags:        data.tags ? (typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags)) : null,
      resumeDeadline: data.resume_deadline || null,
    }
  )
  return rows[0]
}

async function getByMandate(mandateId) {
  return db.query(
    `SELECT * FROM client_mandate_requirements
     WHERE mandate_id = @mandateId
     ORDER BY created ASC`,
    { mandateId }
  )
}

async function update(id, mandateId, data) {
  const rows = await db.query(
    `UPDATE client_mandate_requirements
     SET profile_name = @profileName,
         years_min    = @yearsMin,
         years_max    = @yearsMax,
         headcount    = @headcount,
         notes        = @notes,
         jd_text      = @jdText,
         tags         = @tags,
         resume_deadline = @resumeDeadline
     WHERE id = @id AND mandate_id = @mandateId
     RETURNING *`,
    {
      id,
      mandateId,
      profileName: data.profile_name,
      yearsMin:    data.years_min    != null ? Number(data.years_min)  : null,
      yearsMax:    data.years_max    != null ? Number(data.years_max)  : null,
      headcount:   data.headcount    != null ? Number(data.headcount)  : 1,
      notes:       data.notes        || null,
      jdText:      data.jd_text      || null,
      tags:        data.tags ? (typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags)) : null,
      resumeDeadline: data.resume_deadline || null,
    }
  )
  return rows[0] || null
}

async function deleteReq(id, mandateId) {
  const rows = await db.query(
    `DELETE FROM client_mandate_requirements WHERE id = @id AND mandate_id = @mandateId RETURNING *`,
    { id, mandateId }
  )
  return rows[0] || null
}

async function getByIdForMandate(id, mandateId) {
  const rows = await db.query(
    `SELECT * FROM client_mandate_requirements WHERE id = @id AND mandate_id = @mandateId`,
    { id, mandateId }
  )
  return rows[0] || null
}

module.exports = { create, getByMandate, getByIdForMandate, update, deleteReq }
