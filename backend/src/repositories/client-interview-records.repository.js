// backend/src/repositories/client-interview-records.repository.js
const db = require('../db/connection')

async function create(data) {
  const rows = await db.query(
    `INSERT INTO client_interview_records
       (mandate_id, client_team_id, interview_date, notes)
     VALUES (@mandateId, @clientTeamId, @interviewDate, @notes)
     RETURNING *`,
    {
      mandateId:     data.mandate_id,
      clientTeamId:  data.client_team_id,
      interviewDate: data.interview_date || null,
      notes:         data.notes         || null,
    }
  )
  return rows[0]
}

async function getByMandate(mandateId) {
  return db.query(
    `SELECT cir.*, u.first_name, u.last_name, u.email
     FROM client_interview_records cir
     JOIN client_teams ct ON ct.id = cir.client_team_id
     JOIN users u ON u.id = ct.user_id
     WHERE cir.mandate_id = @mandateId
     ORDER BY cir.interview_date DESC NULLS LAST, cir.created DESC`,
    { mandateId }
  )
}

async function getByClientTeamId(clientTeamId) {
  const rows = await db.query(
    `SELECT * FROM client_interview_records
     WHERE client_team_id = @clientTeamId
     ORDER BY created DESC`,
    { clientTeamId }
  )
  return rows[0] || null
}

async function update(id, data) {
  const rows = await db.query(
    `UPDATE client_interview_records
     SET outcome        = COALESCE(@outcome,       outcome),
         feedback       = COALESCE(@feedback,      feedback),
         interview_date = COALESCE(@interviewDate, interview_date),
         notes          = COALESCE(@notes,         notes),
         updated        = NOW()
     WHERE id = @id
     RETURNING *`,
    {
      id,
      outcome:       data.outcome        || null,
      feedback:      data.feedback       !== undefined ? (data.feedback || null) : null,
      interviewDate: data.interview_date || null,
      notes:         data.notes          !== undefined ? (data.notes    || null) : null,
    }
  )
  return rows[0] || null
}

module.exports = { create, getByMandate, getByClientTeamId, update }
