// backend/src/repositories/answer.repository.js
// SQL queries for the answers table.

const db = require('../db/connection')

/**
 * Save a transcribed answer.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
async function create(data) {
  const rows = await db.query(
    `INSERT INTO answers (interview_id, attempt_id, question_id, answer_text)
     VALUES (@interviewId, @attemptId, @questionId, @answerText)
     RETURNING *`,
    {
      interviewId: data.interviewId,
      attemptId: data.attemptId,
      questionId: data.questionId,
      answerText: data.answerText,
    }
  )
  return rows[0]
}

/**
 * Get Q&A history for an attempt (for adaptive follow-ups).
 * @param {number} interviewId
 * @param {number} attemptId
 * @returns {Promise<Array>}
 */
async function getHistory(interviewId, attemptId) {
  return db.query(
    `SELECT q.text AS question, a.answer_text AS answer
     FROM answers a
     JOIN questions q ON q.id = a.question_id
     WHERE a.interview_id = @interviewId AND a.attempt_id = @attemptId
     ORDER BY a.created`,
    { interviewId, attemptId }
  )
}

/**
 * Get all answers for an attempt with question text (for report generation).
 * @param {number} attemptId
 * @returns {Promise<Array>}
 */
async function getAllForAttempt(attemptId) {
  return db.query(
    `SELECT a.id, a.answer_text, q.text AS question, q.phase, q.order_num
     FROM answers a
     JOIN questions q ON q.id = a.question_id
     WHERE a.attempt_id = @attemptId
     ORDER BY q.order_num`,
    { attemptId }
  )
}

module.exports = { create, getHistory, getAllForAttempt }
