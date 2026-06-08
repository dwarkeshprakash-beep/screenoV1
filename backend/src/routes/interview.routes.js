// backend/src/routes/interview.routes.js
// Interview session endpoints. HTTP only.

const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const upload = require('../middleware/upload')
const interviewService = require('../services/interview.service')
const attemptRepository = require('../repositories/attempt.repository')
const answerRepository = require('../repositories/answer.repository')
const interviewRepository = require('../repositories/interview.repository')

const router = express.Router()

router.use(authMiddleware)

// POST /api/interviews/:id/start
router.post('/:id/start', requireRole('candidate'), async (req, res) => {
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
router.post('/:id/answer', requireRole('candidate'), upload.single('audio'), async (req, res) => {
  try {
    const interviewId = parseInt(req.params.id, 10)
    const { questionId, mode, transcriptionMode, attemptId, developmentFallback, answerText, clientTranscript } = req.body

    if (!questionId) return res.status(400).json({ success: false, error: 'questionId is required' })
    if (!req.file && !answerText?.trim()) {
      return res.status(400).json({ success: false, error: 'audio or answerText is required' })
    }

    const result = await interviewService.saveAnswer({
      interviewId,
      candidateId: req.user.candidateId,
      attemptId: attemptId ? parseInt(attemptId, 10) : null,
      questionId: parseInt(questionId, 10),
      audioBuffer: req.file?.buffer,
      mimeType: req.file?.mimetype,
      mode: mode || 'simple',
      transcriptionMode: transcriptionMode || 'api',
      developmentFallback: developmentFallback === 'true',
      manualText: answerText || null,
      clientTranscript,
    })

    res.json({ success: true, data: result })
  } catch (err) {
    console.error('POST /interviews/:id/answer failed:', err)
    if (['Unauthorized', 'Invalid attempt', 'Invalid question'].includes(err.message)) {
      return res.status(403).json({ success: false, error: 'Not authorized for this interview' })
    }
    if (err.message === 'Transcription failed') {
      return res.status(422).json({ success: false, error: 'Transcription failed. Retry the recording or enter your answer as text.' })
    }
    res.status(500).json({ success: false, error: 'Could not save answer' })
  }
})

// POST /api/interviews/:id/proctoring
router.post('/:id/proctoring', requireRole('candidate'), async (req, res) => {
  try {
    const interviewId = parseInt(req.params.id, 10)
    const { type, severity, occurred, details, attemptId } = req.body

    if (!type) return res.status(400).json({ success: false, error: 'type is required' })

    await interviewService.logProctoringEvent({
      interviewId,
      candidateId: req.user.candidateId,
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
router.get('/:id/transcript', requireRole('manager'), async (req, res) => {
  try {
    const interviewId = parseInt(req.params.id, 10)
    const interview = await interviewRepository.getByIdForCompany(interviewId, req.user.companyId)
    if (!interview || interview.type !== 'ai_voice') {
      return res.status(404).json({ success: false, error: 'Interview not found' })
    }
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
router.post('/:id/complete', requireRole('candidate'), async (req, res) => {
  try {
    const interviewId = parseInt(req.params.id, 10)
    const { attemptId, status } = req.body

    if (!attemptId) return res.status(400).json({ success: false, error: 'attemptId is required' })

    await interviewService.completeInterview(
      interviewId,
      parseInt(attemptId, 10),
      req.user.candidateId,
      status
    )
    res.json({ success: true, data: null })
  } catch (err) {
    console.error('POST /interviews/:id/complete failed:', err)
    res.status(500).json({ success: false, error: 'Could not complete interview' })
  }
})

module.exports = router
