const db = require('../db/connection')

function parseQuestion(value) {
  if (typeof value !== 'string') return { text: '' }
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ...parsed, text: String(parsed.text || '').trim() }
    }
  } catch {
    // Legacy rows stored only the question text.
  }
  return { text: value }
}

function hydrate(row) {
  const payload = parseQuestion(row.question)
  return {
    ...payload,
    id: row.id,
    interview_id: row.interview_id,
    question: payload.text,
    text: payload.text,
    answer: row.answer,
    created: row.created,
  }
}

async function createQuestion(interviewId, question) {
  const rows = await db.query(
    `INSERT INTO transcripts (interview_id, question, answer)
     VALUES (@interviewId, @question, '')
     RETURNING *`,
    {
      interviewId,
      question: JSON.stringify(question),
    }
  )
  return hydrate(rows[0])
}

async function createQuestionRecords(interviewId, questions) {
  return db.transaction(async (tx) => {
    const created = []
    for (const question of questions) {
      const rows = await tx.query(
        `INSERT INTO transcripts (interview_id, question, answer)
         VALUES (@interviewId, @question, '')
         RETURNING *`,
        {
          interviewId,
          question: JSON.stringify(question),
        }
      )
      created.push(hydrate(rows[0]))
    }
    return created
  })
}

async function getQuestionRecords(interviewId) {
  const rows = await db.query(
    `SELECT *
     FROM transcripts
     WHERE interview_id = @interviewId
     ORDER BY created, id`,
    { interviewId }
  )
  return rows.map(hydrate)
}

async function getQuestionRecord(id, interviewId) {
  const rows = await db.query(
    `SELECT *
     FROM transcripts
     WHERE id = @id AND interview_id = @interviewId`,
    { id, interviewId }
  )
  return rows[0] ? hydrate(rows[0]) : null
}

async function answerQuestion(id, interviewId, answer) {
  const rows = await db.query(
    `UPDATE transcripts
     SET answer = @answer
     WHERE id = @id
       AND interview_id = @interviewId
       AND COALESCE(TRIM(answer), '') = ''
     RETURNING *`,
    { id, interviewId, answer }
  )
  return rows[0] ? hydrate(rows[0]) : null
}

async function getByInterview(interviewId) {
  const rows = await db.query(
    `SELECT *
     FROM transcripts
     WHERE interview_id = @interviewId
       AND COALESCE(TRIM(answer), '') <> ''
     ORDER BY created, id`,
    { interviewId }
  )
  return rows.map(hydrate)
}

module.exports = {
  createQuestion,
  createQuestionRecords,
  getQuestionRecords,
  getQuestionRecord,
  answerQuestion,
  getByInterview,
}
