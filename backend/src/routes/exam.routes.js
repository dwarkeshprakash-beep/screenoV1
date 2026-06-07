// backend/src/routes/exam.routes.js
// Exam endpoints — no auth middleware, candidates use the magic link token.

const express = require('express')
const db = require('../db/connection')
const questionRepository = require('../repositories/question.repository')
const reportJobRepository = require('../repositories/report-job.repository')

const router = express.Router()

// ── GET /api/exam/:token ──────────────────────────────────────
// Returns exam data (interview + questions) for the given magic link token.
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params

    // Look up interview by token, validate expiry window
    const rows = await db.query(
      `SELECT id, type, mode, difficulty, window_closes, status
       FROM interviews
       WHERE token = @token`,
      { token }
    )

    const interview = rows[0] || null

    if (!interview || interview.type !== 'exam' || new Date(interview.window_closes) < new Date()) {
      return res.status(404).json({ success: false, error: 'Invalid or expired link' })
    }

    const questions = await questionRepository.getCandidateExamQuestions(interview.id)

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
      `SELECT id, candidate_id, type, mode, difficulty, window_closes,
              max_attempts, cooldown_hours, status
       FROM interviews
       WHERE token = @token`,
      { token }
    )

    const interview = rows[0] || null

    if (!interview || interview.type !== 'exam' || new Date(interview.window_closes) < new Date()) {
      return res.status(404).json({ success: false, error: 'Invalid or expired link' })
    }
    if (interview.status === 'completed') {
      return res.status(409).json({ success: false, error: 'Exam already completed' })
    }
    if (answers.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one answer is required' })
    }

    const safeQuestions = await questionRepository.getCandidateExamQuestions(interview.id)
    const questionIds = new Set(safeQuestions.map(q => q.id))
    const submittedIds = new Set()
    for (const answer of answers) {
      if (!questionIds.has(answer.questionId)) {
        return res.status(400).json({ success: false, error: 'Invalid question submitted' })
      }
      submittedIds.add(answer.questionId)
    }
    if (submittedIds.size !== questionIds.size) {
      return res.status(400).json({ success: false, error: 'Please answer every question before submitting' })
    }

    const attempt = await db.transaction(async tx => {
      const countRows = await tx.query(
        `SELECT COUNT(*) AS count, MAX(ended) AS last_ended
         FROM attempts WHERE interview_id = @interview_id`,
        { interview_id: interview.id }
      )
      const attemptCount = parseInt(countRows[0].count, 10)
      if (interview.max_attempts !== -1 && attemptCount >= interview.max_attempts) {
        throw new Error('All attempts used')
      }
      if (countRows[0].last_ended) {
        const hoursSince = (Date.now() - new Date(countRows[0].last_ended).getTime()) / 3600000
        if (hoursSince < interview.cooldown_hours) throw new Error('Cooldown active')
      }

      const attemptRows = await tx.query(
        `INSERT INTO attempts (interview_id, attempt_num, started, ended, status)
         VALUES (@interview_id, @attempt_num, NOW(), NOW(), 'completed')
         RETURNING *`,
        { interview_id: interview.id, attempt_num: attemptCount + 1 }
      )
      const createdAttempt = attemptRows[0]

      for (const a of answers) {
        const answerText = a.selectedOption !== undefined
          ? String(a.selectedOption)
          : (a.answerText || '')
        await tx.query(
          `INSERT INTO answers (interview_id, attempt_id, question_id, answer_text)
           VALUES (@interview_id, @attempt_id, @question_id, @answer_text)`,
          {
            interview_id: interview.id,
            attempt_id: createdAttempt.id,
            question_id: a.questionId,
            answer_text: answerText,
          }
        )
      }

      await tx.query(
        `UPDATE interviews SET status = 'completed' WHERE id = @interview_id`,
        { interview_id: interview.id }
      )
      return createdAttempt
    })

    await reportJobRepository.enqueue(interview.id, attempt.id)

    return res.json({ success: true, data: { attemptId: attempt.id } })
  } catch (err) {
    console.error('POST /exam/:token/submit failed:', err)
    if (['All attempts used', 'Cooldown active'].includes(err.message)) {
      return res.status(429).json({ success: false, error: err.message })
    }
    res.status(500).json({ success: false, error: 'Could not submit exam' })
  }
})

module.exports = router
