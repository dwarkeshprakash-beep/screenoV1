// backend/src/routes/interview.routes.js
const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const { audioUpload } = require('../middleware/upload')
const interviewService = require('../services/interview.service')
const transcriptRepository = require('../repositories/transcript.repository')
const interviewRepository = require('../repositories/interview.repository')
const candidateIdentityService = require('../services/candidate-identity.service')

const router = express.Router()

router.use(authMiddleware)

router.post('/:id/start', requireRole('candidate'), async (req, res) => {
  try {
    const interviewId = parseInt(req.params.id, 10)
    const identity = candidateIdentityService.fromUser(req.user)
    const result = await interviewService.startInterview(interviewId, identity)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('POST /interviews/:id/start failed:', err)
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ success: false, error: err.message })
    }
    res.status(500).json({ success: false, error: 'Could not start interview' })
  }
})

router.post('/:id/answer', requireRole('candidate'), audioUpload.single('audio'), async (req, res) => {
  try {
    const interviewId = parseInt(req.params.id, 10)
    const {
      questionId,
      questionText,
      mode,
      transcriptionMode,
      developmentFallback,
      answerText,
      clientTranscript,
    } = req.body

    if (!req.file && !answerText?.trim()) {
      return res.status(400).json({ success: false, error: 'audio or answerText is required' })
    }

    if (!questionId && !questionText?.trim()) {
      return res.status(400).json({ success: false, error: 'questionId is required' })
    }
    const identity = candidateIdentityService.fromUser(req.user)

    const result = await interviewService.saveAnswer({
      interviewId,
      identity,
      questionId,
      questionText,
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
    if (['Unauthorized', 'Interview already completed'].includes(err.message)) {
      return res.status(403).json({ success: false, error: err.message })
    }
    if (['Invalid question', 'Question already answered'].includes(err.message)) {
      return res.status(409).json({ success: false, error: err.message })
    }
    if (err.message === 'Transcription failed') {
      return res.status(422).json({ success: false, error: 'Transcription failed. Retry the recording or enter your answer as text.' })
    }
    res.status(500).json({ success: false, error: 'Could not save answer' })
  }
})

router.post('/:id/proctoring', requireRole('candidate'), async (req, res) => {
  try {
    const interviewId = parseInt(req.params.id, 10)
    const { type, severity, occurred, details } = req.body

    if (!type) return res.status(400).json({ success: false, error: 'type is required' })

    const identity = candidateIdentityService.fromUser(req.user)

    const result = await interviewService.logProctoringEvent({
      interviewId,
      identity,
      type,
      severity,
      occurred,
      details,
    })

    res.json({ success: true, data: result })
  } catch (err) {
    console.error('POST /interviews/:id/proctoring failed:', err)
    res.status(500).json({ success: false, error: 'Could not log proctoring event' })
  }
})

router.get('/:id/transcript', requireRole('manager'), async (req, res) => {
  try {
    const interviewId = parseInt(req.params.id, 10)
    const interview = await interviewRepository.getById(interviewId)
    if (!interview || interview.manager_id !== req.user.id || interview.type !== 'ai_voice') {
      return res.status(404).json({ success: false, error: 'Interview not found' })
    }
    const qa = await transcriptRepository.getByInterview(interviewId)
    res.json({ success: true, data: qa })
  } catch (err) {
    console.error('GET /interviews/:id/transcript failed:', err)
    res.status(500).json({ success: false, error: 'Could not load transcript' })
  }
})

router.post('/:id/complete', requireRole('candidate'), async (req, res) => {
  try {
    const interviewId = parseInt(req.params.id, 10)
    const { status } = req.body

    const identity = candidateIdentityService.fromUser(req.user)

    await interviewService.completeInterview(
      interviewId,
      identity,
      status
    )
    res.json({ success: true, data: null })
  } catch (err) {
    console.error('POST /interviews/:id/complete failed:', err)
    if (err.message === 'Unauthorized') {
      return res.status(403).json({ success: false, error: err.message })
    }
    res.status(500).json({ success: false, error: 'Could not complete interview' })
  }
})

module.exports = router
