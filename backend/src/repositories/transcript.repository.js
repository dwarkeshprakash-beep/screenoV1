const db = require('../db/connection')

async function create(data) {
  const rows = await db.query(
    `INSERT INTO transcripts (interview_id, question, answer)
     VALUES (@interview_id, @question, @answer)
     RETURNING *`,
    data
  )
  return rows[0]
}

async function getByInterview(interviewId) {
  const rows = await db.query(
    `SELECT * FROM transcripts WHERE interview_id = @interviewId ORDER BY created`,
    { interviewId }
  )
  return rows
}

module.exports = { create, getByInterview }
