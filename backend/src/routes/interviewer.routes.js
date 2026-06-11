// backend/src/routes/interviewer.routes.js
// Interviewer endpoints — schedule, scorecards, live room.

const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const interviewRepository = require('../repositories/interview.repository')
const scorecardRepository = require('../repositories/scorecard.repository')

const router = express.Router()

router.use(authMiddleware, requireRole('interviewer'))

// GET /api/interviewer/schedule
router.get('/schedule', async (req, res) => {
  try {
    const interviews = await interviewRepository.getByCompany(req.user.companyId)
    const human = interviews.filter(i => i.type === 'human')
    res.json({ success: true, data: human })
  } catch (err) {
    console.error('GET /interviewer/schedule failed:', err)
    res.status(500).json({ success: false, error: 'Could not load schedule' })
  }
})

// GET /api/interviewer/scorecards
router.get('/scorecards', async (req, res) => {
  try {
    const interviews = await interviewRepository.getByCompany(req.user.companyId)
    const pending = interviews.filter(i =>
      i.type === 'human' && i.status === 'completed'
    )
    res.json({ success: true, data: pending })
  } catch (err) {
    console.error('GET /interviewer/scorecards failed:', err)
    res.status(500).json({ success: false, error: 'Could not load scorecards' })
  }
})

// POST /api/interviewer/scorecard/:interviewId
router.post('/scorecard/:interviewId', async (req, res) => {
  try {
    const { scores, decision, reason } = req.body
    const interviewId = parseInt(req.params.interviewId, 10)
    const interview = await interviewRepository.getAssignedHuman(interviewId, req.user.id)
    if (!interview) return res.status(404).json({ success: false, error: 'Interview not found' })

    if (!decision) return res.status(400).json({ success: false, error: 'decision is required' })
    if (!reason)   return res.status(400).json({ success: false, error: 'reason is required' })

    const s = scores || {}
    await scorecardRepository.upsert({
      interviewId,
      overall:         s.overall         || null,
      confidence:      s.confidence      || null,
      techKnowledge:   s.techKnowledge   || null,
      communication:   s.communication   || null,
      problemSolving:  s.problemSolving  || null,
      decision,
      reason,
    })

    res.json({ success: true, data: null })
  } catch (err) {
    console.error('POST /interviewer/scorecard failed:', err)
    res.status(500).json({ success: false, error: 'Could not submit scorecard' })
  }
})

// GET /api/interviewer/scorecard-data/:interviewId
router.get('/scorecard-data/:interviewId', async (req, res) => {
  try {
    const interviewId = parseInt(req.params.interviewId, 10)
    const interview = await interviewRepository.getAssignedHuman(interviewId, req.user.id)
    if (!interview) return res.status(404).json({ success: false, error: 'Interview not found' })
    const scorecard = await scorecardRepository.getByInterviewForInterviewer(interviewId, req.user.id)
    res.json({ success: true, data: scorecard || null })
  } catch (err) {
    console.error('GET /interviewer/scorecard-data failed:', err)
    res.status(500).json({ success: false, error: 'Could not load scorecard data' })
  }
})

// GET /api/interviewer/live-room/:interviewId
router.get('/live-room/:interviewId', async (req, res) => {
  try {
    const interviewId = parseInt(req.params.interviewId, 10)
    const interview = await interviewRepository.getAssignedHuman(interviewId, req.user.id)
    if (!interview) return res.status(404).json({ success: false, error: 'Interview not found' })
    res.json({ success: true, data: { interview, notes: { notes: '', askedQuestions: '[]' } } })
  } catch (err) {
    console.error('GET /interviewer/live-room failed:', err)
    res.status(500).json({ success: false, error: 'Could not load room' })
  }
})

// PATCH /api/interviewer/live-room/:interviewId/notes
router.patch('/live-room/:interviewId/notes', async (req, res) => {
  try {
    const interviewId = parseInt(req.params.interviewId, 10)
    const interview = await interviewRepository.getAssignedHuman(interviewId, req.user.id)
    if (!interview) return res.status(404).json({ success: false, error: 'Interview not found' })
    res.json({ success: true, data: {
      interviewId,
      notes: req.body.notes || '',
      askedQuestions: JSON.stringify(req.body.askedQuestions || []),
    }})
  } catch (err) {
    console.error('PATCH /interviewer/live-room notes failed:', err)
    res.status(500).json({ success: false, error: 'Could not save notes' })
  }
})

// POST /api/interviewer/live-room/:interviewId/end
router.post('/live-room/:interviewId/end', async (req, res) => {
  try {
    const interviewId = parseInt(req.params.interviewId, 10)
    const interview = await interviewRepository.getAssignedHuman(interviewId, req.user.id)
    if (!interview) return res.status(404).json({ success: false, error: 'Interview not found' })
    await interviewRepository.updateStatus(interviewId, 'completed')
    res.json({ success: true, data: null })
  } catch (err) {
    console.error('POST /interviewer/live-room end failed:', err)
    res.status(500).json({ success: false, error: 'Could not end interview' })
  }
})

// POST /api/interviewer/livekit-token
router.post('/livekit-token', async (req, res) => {
  try {
    const { AccessToken } = require('livekit-server-sdk')
    const { roomName, participantName, interviewId } = req.body
    if (!roomName || !participantName) {
      return res.status(400).json({ success: false, error: 'roomName and participantName required' })
    }
    const requestedId = interviewId || String(roomName).replace('interview-', '')
    const interview = await interviewRepository.getAssignedHuman(parseInt(requestedId, 10), req.user.id)
    if (!interview) return res.status(404).json({ success: false, error: 'Interview not found' })
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY?.trim(),
      process.env.LIVEKIT_API_SECRET?.trim(),
      { identity: participantName, ttl: '2h' }
    )
    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true })
    const rawToken = at.toJwt()
    const token = rawToken && typeof rawToken.then === 'function' ? await rawToken : rawToken
    res.json({ success: true, data: { token, wsUrl: process.env.LIVEKIT_URL } })
  } catch (err) {
    console.error('POST /interviewer/livekit-token failed:', err)
    res.status(500).json({ success: false, error: 'Could not generate LiveKit token' })
  }
})

module.exports = router
