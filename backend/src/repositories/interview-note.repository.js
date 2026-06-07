const db = require('../db/connection')

async function getForInterviewer(interviewId, interviewerId) {
  const rows = await db.query(
    `SELECT * FROM interview_notes
     WHERE interview_id = @interviewId AND interviewer_id = @interviewerId`,
    { interviewId, interviewerId }
  )
  return rows[0] || null
}

async function save(data) {
  const rows = await db.query(
    `INSERT INTO interview_notes (interview_id, interviewer_id, notes, asked_questions)
     VALUES (@interviewId, @interviewerId, @notes, @askedQuestions)
     ON CONFLICT (interview_id, interviewer_id)
     DO UPDATE SET notes = EXCLUDED.notes,
                   asked_questions = EXCLUDED.asked_questions,
                   updated = NOW()
     RETURNING *`,
    data
  )
  return rows[0]
}

module.exports = { getForInterviewer, save }
