// backend/src/routes/exam.routes.js
// Exam endpoints — no auth middleware, candidates use the magic link token.

const express = require('express')
const db = require('../db/connection')
const questionRepository = require('../repositories/question.repository')
const reportJobRepository = require('../repositories/report-job.repository')
const judgeService = require('../services/judge.service')

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

    // Parse options JSON string → array; for coding questions, hide expected_output on hidden test cases
    const parsed = questions.map(q => {
      let testCases = []
      try { testCases = q.test_cases ? JSON.parse(q.test_cases) : [] } catch { testCases = [] }
      return {
        ...q,
        options: (() => {
          try { return q.options ? JSON.parse(q.options) : [] } catch { return [] }
        })(),
        test_cases: testCases.map(tc => tc.hidden
          ? { input: tc.input, hidden: true }
          : { input: tc.input, expected_output: tc.expected_output, hidden: false }),
      }
    })

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

    const safeQuestions = await questionRepository.getByInterview(interview.id)
    const questionMap = new Map(safeQuestions.map(q => [q.id, q]))
    const submittedIds = new Set()
    for (const answer of answers) {
      if (!questionMap.has(answer.questionId)) {
        return res.status(400).json({ success: false, error: 'Invalid question submitted' })
      }
      submittedIds.add(answer.questionId)
    }
    if (submittedIds.size !== questionMap.size) {
      return res.status(400).json({ success: false, error: 'Please answer every question before submitting' })
    }

    // Run coding submissions through the judge BEFORE opening the DB transaction —
    // these are slow network calls and must not hold a DB connection open.
    const codingAnswerText = new Map()
    for (const a of answers) {
      const question = questionMap.get(a.questionId)
      if (question.question_type === 'coding') {
        codingAnswerText.set(a.questionId, await buildCodingAnswerText(question, a))
      }
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
        const answerText = codingAnswerText.has(a.questionId)
          ? codingAnswerText.get(a.questionId)
          : (a.selectedOption !== undefined ? String(a.selectedOption) : (a.answerText || ''))
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

// Run a candidate's submitted code against the question's test cases and build a
// readable summary that feeds into the LLM report prompt — same scoring path as
// every other answer type, just with judge-verified pass/fail evidence attached.
async function buildCodingAnswerText(question, answer) {
  const code = (answer.code || '').toString()
  const language = question.language || 'javascript'

  let testCases = []
  try { testCases = question.test_cases ? JSON.parse(question.test_cases) : [] } catch { testCases = [] }

  if (!code.trim()) {
    return `Language: ${language}\n\nNo code submitted.`
  }
  if (testCases.length === 0) {
    return `Language: ${language}\n\nSubmitted code:\n${code}\n\nTest results: not evaluated (no test cases configured)`
  }

  const results = await judgeService.runTestCases(language, code, testCases)
  const passed = results.filter(r => r.passed).length
  const pct = Math.round((passed / results.length) * 100)
  const lines = results.map((r, i) =>
    `Test ${i + 1}: ${r.passed ? 'PASS' : 'FAIL'}${r.error ? ` — ${r.error.slice(0, 200)}` : ''}`
  )

  return `Language: ${language}\n\nSubmitted code:\n${code}\n\nTest results: ${passed}/${results.length} passed (${pct}%)\n${lines.join('\n')}`
}

module.exports = router
