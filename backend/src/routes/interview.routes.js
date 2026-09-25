// backend/src/routes/interview.routes.js
const express = require('express')
const authMiddleware = require('../middleware/auth')
const { loadAccess, requireModule } = require('../middleware/access')
const { audioUpload } = require('../middleware/upload')
const interviewService = require('../services/interview.service')
const candidateIdentityService = require('../services/candidate-identity.service')

const router = express.Router()

router.use(authMiddleware)

// The start/answer/proctoring/complete routes below are only ever reached with the
// short-lived magic-link session token (signCandidateSession in auth.service.js),
// which carries its own hardcoded role: 'candidate' claim and no user id - it is not
// derived from any DB column, so it doesn't go through loadAccess/access.service.
// (interview.service.js's assertInterviewScope separately requires identity.interviewId,
// which only that token type carries, so a regular dashboard JWT can't reach these anyway.)
function requireCandidateToken(req, res, next) {
  if (req.user?.role !== 'candidate') {
    return res.status(403).json({ success: false, error: 'Not authorized' })
  }
  next()
}

router.post('/:id/start', requireCandidateToken, async (req, res) => {
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

router.post('/:id/answer', requireCandidateToken, audioUpload.single('audio'), async (req, res) => {
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

router.post('/:id/proctoring', requireCandidateToken, async (req, res) => {
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

router.get('/:id/transcript', loadAccess, requireModule('team'), async (req, res) => {
  try {
    const interviewId = parseInt(req.params.id, 10)
    const qa = await interviewService.getManagerTranscript(interviewId, req.user.id)
    if (!qa) return res.status(404).json({ success: false, error: 'Interview not found' })
    res.json({ success: true, data: qa })
  } catch (err) {
    console.error('GET /interviews/:id/transcript failed:', err)
    res.status(500).json({ success: false, error: 'Could not load transcript' })
  }
})

// GET /api/interviews/:id/report - the candidate's own feedback for the interview
// they just finished, read with the same interview-scoped session token as
// start/answer/complete. /api/candidate/report can't serve this: it runs loadAccess,
// which needs a user id that this token type doesn't carry (always 401s).
router.get('/:id/report', requireCandidateToken, async (req, res) => {
  try {
    const interviewId = parseInt(req.params.id, 10)
    const identity = candidateIdentityService.fromUser(req.user)
    // null (not generated / still 'generating') is a normal state while the report job
    // runs, not an error - the client keeps polling until it's 'ready'
    const report = await interviewService.getCandidateReportSummary(interviewId, identity)
    res.json({ success: true, data: report })
  } catch (err) {
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ success: false, error: err.message })
    }
    console.error('GET /interviews/:id/report failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report' })
  }
})

router.post('/:id/complete', requireCandidateToken, async (req, res) => {
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
