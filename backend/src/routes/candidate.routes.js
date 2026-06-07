// backend/src/routes/candidate.routes.js
// Candidate self-service endpoints (auth via session JWT from magic link).

const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const interviewRepository = require('../repositories/interview.repository')
const reportRepository = require('../repositories/report.repository')

const router = express.Router()

router.use(authMiddleware, requireRole('candidate'))

// GET /api/candidate/interviews  — candidate's own interview list (via magic link JWT)
router.get('/interviews', async (req, res) => {
  try {
    const candidateId = req.user.candidateId || req.user.id
    const interviews = await interviewRepository.getByCandidate(candidateId)
    res.json({ success: true, data: interviews })
  } catch (err) {
    console.error('GET /candidate/interviews failed:', err)
    res.status(500).json({ success: false, error: 'Could not load interviews' })
  }
})

// GET /api/candidate/report — latest report for the authenticated candidate (used by DonePage)
router.get('/report', async (req, res) => {
  try {
    const candidateId = req.user.candidateId || req.user.id
    const report = await reportRepository.getLatestByCandidate(candidateId)
    res.json({ success: true, data: report || null })
  } catch (err) {
    console.error('GET /candidate/report failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report' })
  }
})

router.post('/livekit-token', async (req, res) => {
  try {
    const interview = await interviewRepository.getByIdForCandidate(req.user.interviewId, req.user.candidateId)
    if (!interview || interview.type !== 'human') {
      return res.status(404).json({ success: false, error: 'Interview not found' })
    }
    const { AccessToken } = require('livekit-server-sdk')
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY?.trim(),
      process.env.LIVEKIT_API_SECRET?.trim(),
      { identity: `candidate-${req.user.candidateId}`, ttl: '2h' }
    )
    at.addGrant({ roomJoin: true, room: `interview-${interview.id}`, canPublish: true, canSubscribe: true })
    const rawToken = at.toJwt()
    const token = rawToken && typeof rawToken.then === 'function' ? await rawToken : rawToken
    res.json({ success: true, data: { token, wsUrl: process.env.LIVEKIT_URL, roomName: `interview-${interview.id}` } })
  } catch (err) {
    console.error('POST /candidate/livekit-token failed:', err)
    res.status(500).json({ success: false, error: 'Could not generate LiveKit token' })
  }
})

module.exports = router
