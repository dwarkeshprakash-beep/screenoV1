// backend/src/repositories/question.repository.js
// SQL queries for the questions table.

const db = require('../db/connection')

/**
 * Insert multiple questions at once.
 * @param {number} interviewId
 * @param {number} attemptId
 * @param {Array<{text, phase, order_num}>} questions
 * @returns {Promise<Array>}
 */
async function createMany(interviewId, attemptId, questions) {
  const saved = []
  for (const q of questions) {
    const rows = await db.query(
      `INSERT INTO questions (interview_id, attempt_id, text, phase, order_num)
       VALUES (@interviewId, @attemptId, @text, @phase, @order_num)
       RETURNING *`,
      {
        interviewId,
        attemptId,
        text: q.text,
        phase: q.phase || 'technical',
        order_num: q.order_num,
      }
    )
    saved.push(rows[0])
  }
  return saved
}

/**
 * Insert a single question.
 * @param {number} interviewId
 * @param {number} attemptId
 * @param {Object} questionData
 * @returns {Promise<Object>}
 */
async function create(interviewId, attemptId, questionData) {
  const rows = await db.query(
    `INSERT INTO questions (interview_id, attempt_id, text, phase, order_num)
     VALUES (@interviewId, @attemptId, @text, @phase, @order_num)
     RETURNING *`,
    {
      interviewId,
      attemptId,
      text: questionData.text,
      phase: questionData.phase || 'technical',
      order_num: questionData.order_num || 1,
    }
  )
  return rows[0]
}

/**
 * Get all questions for an interview ordered by position.
 * @param {number} interviewId
 * @param {number|null} attemptId
 * @returns {Promise<Array>}
 */
async function getByInterview(interviewId, attemptId = null) {
  if (attemptId) {
    return db.query(
      `SELECT * FROM questions
       WHERE interview_id = @interviewId AND attempt_id = @attemptId
       ORDER BY order_num`,
      { interviewId, attemptId }
    )
  }
  return db.query(
    `SELECT * FROM questions
     WHERE interview_id = @interviewId
     ORDER BY order_num`,
    { interviewId }
  )
}

module.exports = { createMany, create, getByInterview }
