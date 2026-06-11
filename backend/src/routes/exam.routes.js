// backend/src/routes/exam.routes.js
const express = require('express')
const db = require('../db/connection')
const transcriptRepository = require('../repositories/transcript.repository')
const reportJobRepository = require('../repositories/report-job.repository')
const interviewRepository = require('../repositories/interview.repository')
const llmService = require('../services/llm.service')

const router = express.Router()

router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params

    const interview = await interviewRepository.getByToken(token)

    if (!interview || interview.type !== 'exam' || new Date(interview.token_expires) < new Date()) {
      return res.status(404).json({ success: false, error: 'Invalid or expired link' })
    }

    // Since we don't store questions anymore, we generate them dynamically for an exam
    const generatedQuestions = await llmService.generateExamQuestions({
      resume: null,
      jd: null,
      focusAreas: null,
      difficulty: interview.difficulty,
      count: interview.question_count || 5,
    })

    return res.json({
      success: true,
      data: {
        interview: {
          id: interview.id,
          type: interview.type,
          interviewMode: interview.interview_mode,
          difficulty: interview.difficulty,
        },
        questions: generatedQuestions,
      },
    })
  } catch (err) {
    console.error('GET /exam/:token failed:', err)
    res.status(500).json({ success: false, error: 'Could not load exam' })
  }
})

router.post('/:token/submit', async (req, res) => {
  try {
    const { token } = req.params
    const { answers } = req.body

    if (!Array.isArray(answers)) {
      return res.status(400).json({ success: false, error: 'answers must be an array' })
    }

    const interview = await interviewRepository.getByToken(token)

    if (!interview || interview.type !== 'exam' || new Date(interview.token_expires) < new Date()) {
      return res.status(404).json({ success: false, error: 'Invalid or expired link' })
    }
    if (interview.status === 'completed') {
      return res.status(409).json({ success: false, error: 'Exam already completed' })
    }
    if (answers.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one answer is required' })
    }

    await db.transaction(async tx => {
      for (const a of answers) {
        const answerText = a.answerText || String(a.selectedOption || '')
        await tx.query(
          `INSERT INTO transcripts (interview_id, question, answer)
           VALUES (@interview_id, @question, @answer)`,
          {
            interview_id: interview.id,
            question: a.questionText || 'Exam Question',
            answer: answerText,
          }
        )
      }

      await tx.query(
        `UPDATE interviews SET status = 'completed', ended_at = NOW() WHERE id = @interview_id`,
        { interview_id: interview.id }
      )
    })

    await reportJobRepository.create(interview.id)

    return res.json({ success: true, data: { completed: true } })
  } catch (err) {
    console.error('POST /exam/:token/submit failed:', err)
    res.status(500).json({ success: false, error: 'Could not submit exam' })
  }
})

module.exports = router
