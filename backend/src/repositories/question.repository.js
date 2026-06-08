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
      `INSERT INTO questions (interview_id, attempt_id, text, phase, order_num, question_type, options, correct_answer, language, starter_code, test_cases)
       VALUES (@interviewId, @attemptId, @text, @phase, @order_num, @question_type, @options, @correct_answer, @language, @starter_code, @test_cases)
       RETURNING *`,
      {
        interviewId,
        attemptId,
        text: q.text,
        phase: q.phase || 'technical',
        order_num: q.order_num,
        question_type: q.question_type || 'open',
        options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: q.correct_answer != null ? q.correct_answer : null,
        language: q.language || null,
        starter_code: q.starter_code || null,
        test_cases: q.test_cases ? JSON.stringify(q.test_cases) : null,
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
    `INSERT INTO questions (interview_id, attempt_id, text, phase, order_num, question_type, options, correct_answer, language, starter_code, test_cases)
     VALUES (@interviewId, @attemptId, @text, @phase, @order_num, @question_type, @options, @correct_answer, @language, @starter_code, @test_cases)
     RETURNING *`,
    {
      interviewId,
      attemptId,
      text: questionData.text,
      phase: questionData.phase || 'technical',
      order_num: questionData.order_num || 1,
      question_type: questionData.question_type || 'open',
      options: questionData.options ? JSON.stringify(questionData.options) : null,
      correct_answer: questionData.correct_answer != null ? questionData.correct_answer : null,
      language: questionData.language || null,
      starter_code: questionData.starter_code || null,
      test_cases: questionData.test_cases ? JSON.stringify(questionData.test_cases) : null,
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

async function getByIdForInterview(id, interviewId, attemptId) {
  const rows = await db.query(
    `SELECT * FROM questions
     WHERE id = @id
       AND interview_id = @interviewId
       AND (attempt_id = @attemptId OR attempt_id IS NULL)`,
    { id, interviewId, attemptId }
  )
  return rows[0] || null
}

async function getCandidateExamQuestions(interviewId) {
  return db.query(
    `SELECT id, text, question_type, options, order_num, phase, language, starter_code, test_cases
     FROM questions
     WHERE interview_id = @interviewId
     ORDER BY order_num`,
    { interviewId }
  )
}

module.exports = { createMany, create, getByInterview, getByIdForInterview, getCandidateExamQuestions }
