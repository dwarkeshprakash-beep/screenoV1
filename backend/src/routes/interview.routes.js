// backend/src/routes/interview.routes.js
// Interview session endpoints. HTTP only.

const express = require('express')
const authMiddleware = require('../middleware/auth')
const upload = require('../middleware/upload')
const interviewService = require('../services/interview.service')
const attemptRepository = require('../repositories/attempt.repository')
const answerRepository = require('../repositories/answer.repository')

const router = express.Router()

router.use(authMiddleware)

// POST /api/interviews/:id/start
router.post('/:id/start', async (req, res) => {
  try {
    const interviewId = parseInt(req.params.id, 10)
    const candidateId = req.user.candidateId || req.user.id

    const result = await interviewService.startInterview(interviewId, candidateId)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('POST /interviews/:id/start failed:', err)
    const knownErrors = ['All attempts used', 'Unauthorized']
    if (knownErrors.some(e => err.message.includes(e))) {
      return res.status(403).json({ success: false, error: err.message })
    }
    if (err.message.startsWith('Please wait')) {
      return res.status(429).json({ success: false, error: err.message })
    }
    res.status(500).json({ success: false, error: 'Could not start interview' })
  }
})

// POST /api/interviews/:id/answer  — multipart/form-data with audio file
router.post('/:id/answer', upload.single('audio'), async (req, res) => {
  try {
    const interviewId = parseInt(req.params.id, 10)
    const { questionId, mode, transcriptionMode, attemptId } = req.body

    if (!questionId) return res.status(400).json({ success: false, error: 'questionId is required' })
    if (!req.file) return res.status(400).json({ success: false, error: 'audio file is required' })

    const result = await interviewService.saveAnswer({
      interviewId,
      attemptId: attemptId ? parseInt(attemptId, 10) : null,
      questionId: parseInt(questionId, 10),
      audioBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
      mode: mode || 'simple',
      transcriptionMode: transcriptionMode || 'api',
    })

    res.json({ success: true, data: result })
  } catch (err) {
    console.error('POST /interviews/:id/answer failed:', err)
    res.status(500).json({ success: false, error: 'Could not save answer' })
  }
})

// POST /api/interviews/:id/proctoring
router.post('/:id/proctoring', async (req, res) => {
  try {
    const interviewId = parseInt(req.params.id, 10)
    const { type, severity, occurred, details, attemptId } = req.body

    if (!type) return res.status(400).json({ success: false, error: 'type is required' })

    await interviewService.logProctoringEvent({
      interviewId,
      attemptId: attemptId || null,
      type,
      severity,
      occurred,
      details,
    })

    res.json({ success: true, data: null })
  } catch (err) {
    console.error('POST /interviews/:id/proctoring failed:', err)
    res.status(500).json({ success: false, error: 'Could not log proctoring event' })
  }
})

// GET /api/interviews/:id/transcript — Q&A for the latest completed attempt
router.get('/:id/transcript', async (req, res) => {
  try {
    const interviewId = parseInt(req.params.id, 10)
    const attempt = await attemptRepository.getLatest(interviewId)
    if (!attempt) return res.json({ success: true, data: [] })
    const qa = await answerRepository.getAllForAttempt(attempt.id)
    res.json({ success: true, data: qa })
  } catch (err) {
    console.error('GET /interviews/:id/transcript failed:', err)
    res.status(500).json({ success: false, error: 'Could not load transcript' })
  }
})

// POST /api/interviews/:id/complete
router.post('/:id/complete', async (req, res) => {
  try {
    const interviewId = parseInt(req.params.id, 10)
    const { attemptId } = req.body

    if (!attemptId) return res.status(400).json({ success: false, error: 'attemptId is required' })

    await interviewService.completeInterview(interviewId, parseInt(attemptId, 10))
    res.json({ success: true, data: null })
  } catch (err) {
    console.error('POST /interviews/:id/complete failed:', err)
    res.status(500).json({ success: false, error: 'Could not complete interview' })
  }
})

module.exports = router
