// backend/src/routes/exam.routes.js
// Exam endpoints — no auth middleware, candidates use the magic link token.

const express = require('express')
const db = require('../db/connection')
const interviewService = require('../services/interview.service')

const router = express.Router()

// ── GET /api/exam/:token ──────────────────────────────────────
// Returns exam data (interview + questions) for the given magic link token.
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params

    // Look up interview by token, validate expiry window
    const rows = await db.query(
      `SELECT id, type, mode, difficulty, window_closes
       FROM interviews
       WHERE token = @token`,
      { token }
    )

    const interview = rows[0] || null

    if (!interview || new Date(interview.window_closes) < new Date()) {
      return res.status(404).json({ success: false, error: 'Invalid or expired link' })
    }

    // Load questions for this interview
    const questions = await db.query(
      `SELECT id, text, question_type, options, correct_answer, order_num, phase
       FROM questions
       WHERE interview_id = @interview_id
       ORDER BY order_num`,
      { interview_id: interview.id }
    )

    // Parse options JSON string → array
    const parsed = questions.map(q => ({
      ...q,
      options: (() => {
        try { return q.options ? JSON.parse(q.options) : [] } catch { return [] }
      })(),
    }))

    return res.json({
      success: true,
      data: {
        interview: {
          id: interview.id,
          type: interview.type,
          mode: interview.mode,
          difficulty: interview.difficulty,
        },
        questions: parsed,
      },
    })
  } catch (err) {
    console.error('GET /exam/:token failed:', err)
    res.status(500).json({ success: false, error: 'Could not load exam' })
  }
})

// ── POST /api/exam/:token/submit ──────────────────────────────
// Receives all answers at once, creates attempt + answers, completes interview.
router.post('/:token/submit', async (req, res) => {
  try {
    const { token } = req.params
    const { answers } = req.body

    if (!Array.isArray(answers)) {
      return res.status(400).json({ success: false, error: 'answers must be an array' })
    }

    // Validate token and window
    const rows = await db.query(
      `SELECT id, type, mode, difficulty, window_closes
       FROM interviews
       WHERE token = @token`,
      { token }
    )

    const interview = rows[0] || null

    if (!interview || new Date(interview.window_closes) < new Date()) {
      return res.status(404).json({ success: false, error: 'Invalid or expired link' })
    }

    // Count existing attempts to set attempt_num
    const countRows = await db.query(
      `SELECT COUNT(*) AS count FROM attempts WHERE interview_id = @interview_id`,
      { interview_id: interview.id }
    )
    const attemptNum = parseInt(countRows[0].count, 10) + 1

    // Create attempt record
    const attemptRows = await db.query(
      `INSERT INTO attempts (interview_id, attempt_num, started, status)
       VALUES (@interview_id, @attempt_num, NOW(), 'in_progress')
       RETURNING *`,
      { interview_id: interview.id, attempt_num: attemptNum }
    )
    const attempt = attemptRows[0]

    // Save each answer individually
    for (const a of answers) {
      const answerText = a.selectedOption !== undefined
        ? String(a.selectedOption)
        : (a.answerText || '')

      await db.query(
        `INSERT INTO answers (interview_id, attempt_id, question_id, answer_text)
         VALUES (@interview_id, @attempt_id, @question_id, @answer_text)`,
        {
          interview_id: interview.id,
          attempt_id: attempt.id,
          question_id: a.questionId,
          answer_text: answerText,
        }
      )
    }

    // Mark interview + attempt as completed, trigger async report
    await interviewService.completeInterview(interview.id, attempt.id)

    return res.json({ success: true, data: { attemptId: attempt.id } })
  } catch (err) {
    console.error('POST /exam/:token/submit failed:', err)
    res.status(500).json({ success: false, error: 'Could not submit exam' })
  }
})

module.exports = router
