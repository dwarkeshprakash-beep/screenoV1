// backend/src/routes/interviewer.routes.js
// Interviewer endpoints — schedule, scorecards.

const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const interviewRepository = require('../repositories/interview.repository')
const scorecardRepository = require('../repositories/scorecard.repository')
const interviewNoteRepository = require('../repositories/interview-note.repository')
const db = require('../db/connection')

const router = express.Router()

router.use(authMiddleware, requireRole('interviewer'))

// GET /api/interviewer/schedule?date=today
router.get('/schedule', async (req, res) => {
  try {
    const interviews = await interviewRepository.getByCompany(req.user.companyId)
    const human = interviews.filter(i => i.type === 'human' && i.interviewer_id === req.user.id)
    res.json({ success: true, data: human })
  } catch (err) {
    console.error('GET /interviewer/schedule failed:', err)
    res.status(500).json({ success: false, error: 'Could not load schedule' })
  }
})

// GET /api/interviewer/scorecards?status=pending
router.get('/scorecards', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT i.id, i.candidate_id, i.created,
              cu.first_name, cu.last_name
       FROM interviews i
       LEFT JOIN candidates c  ON c.id    = i.candidate_id AND c.deleted IS NULL
       LEFT JOIN users      cu ON cu.id   = c.user_id      AND cu.deleted IS NULL
       WHERE i.type = 'human'
         AND i.interviewer_id = @interviewerId
         AND i.status = 'completed'
         AND NOT EXISTS (
           SELECT 1 FROM reports r WHERE r.interview_id = i.id
         )
       ORDER BY i.created DESC`,
      { interviewerId: req.user.id }
    )
    res.json({ success: true, data: rows })
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
    if (!reason) return res.status(400).json({ success: false, error: 'reason is required' })

    const s = scores || {}
    const evidence = req.body.evidence ? JSON.stringify(req.body.evidence) : null
    await scorecardRepository.upsert({
      interviewId,
      candidateId: interview.candidate_id,
      interviewerId: req.user.id,
      overall: s.overall || null,
      confidence: s.confidence || null,
      techKnowledge: s.techKnowledge || null,
      communication: s.communication || null,
      problemSolving: s.problemSolving || null,
      evidence,
      decision,
      reason,
    })

    await db.query(
      `INSERT INTO reports (interview_id, candidate_id, overall_score, confidence, tech_knowledge, communication, summary, status)
       SELECT @interviewId, candidate_id,
               @overall, @confidence, @tech, @communication,
               @reason, 'ready'
        FROM interviews
        WHERE id = @interviewId AND interviewer_id = @interviewerId
          AND NOT EXISTS (
            SELECT 1 FROM reports r WHERE r.interview_id = @interviewId AND r.attempt_id IS NULL
          )`,
      {
        interviewId,
        interviewerId: req.user.id,
        overall: s.overall || null,
        confidence: s.confidence || null,
        tech: s.techKnowledge || null,
        communication: s.communication || null,
        reason,
      }
    )

    res.json({ success: true, data: null })
  } catch (err) {
    console.error('POST /interviewer/scorecard failed:', err)
    res.status(500).json({ success: false, error: 'Could not submit scorecard' })
  }
})

// GET /api/interviews/:id/scorecard (AI pre-filled draft for interviewer)
router.get('/scorecard-data/:interviewId', async (req, res) => {
  try {
    const interviewId = parseInt(req.params.interviewId, 10)
    const interview = await interviewRepository.getAssignedHuman(interviewId, req.user.id)
    if (!interview) return res.status(404).json({ success: false, error: 'Interview not found' })
    const scorecard = await scorecardRepository.getByInterviewForInterviewer(interviewId, req.user.id)
    if (scorecard) return res.json({ success: true, data: scorecard })
    const rows = await db.query(
      `SELECT r.* FROM reports r
       JOIN interviews i ON i.id = r.interview_id
       WHERE r.interview_id = @interviewId AND i.interviewer_id = @interviewerId
       ORDER BY r.created DESC LIMIT 1`,
      { interviewId, interviewerId: req.user.id }
    )
    res.json({ success: true, data: rows[0] || null })
  } catch (err) {
    console.error('GET /interviewer/scorecard-data failed:', err)
    res.status(500).json({ success: false, error: 'Could not load scorecard data' })
  }
})

router.get('/live-room/:interviewId', async (req, res) => {
  try {
    const interviewId = parseInt(req.params.interviewId, 10)
    const interview = await interviewRepository.getAssignedHuman(interviewId, req.user.id)
    if (!interview) return res.status(404).json({ success: false, error: 'Interview not found' })
    const notes = await interviewNoteRepository.getForInterviewer(interviewId, req.user.id)
    res.json({ success: true, data: { interview, notes } })
  } catch (err) {
    console.error('GET /interviewer/live-room failed:', err)
    res.status(500).json({ success: false, error: 'Could not load room' })
  }
})

router.patch('/live-room/:interviewId/notes', async (req, res) => {
  try {
    const interviewId = parseInt(req.params.interviewId, 10)
    const interview = await interviewRepository.getAssignedHuman(interviewId, req.user.id)
    if (!interview) return res.status(404).json({ success: false, error: 'Interview not found' })
    const saved = await interviewNoteRepository.save({
      interviewId,
      interviewerId: req.user.id,
      notes: req.body.notes || '',
      askedQuestions: JSON.stringify(req.body.askedQuestions || []),
    })
    res.json({ success: true, data: saved })
  } catch (err) {
    console.error('PATCH /interviewer/live-room notes failed:', err)
    res.status(500).json({ success: false, error: 'Could not save notes' })
  }
})

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
    // toJwt() is async in livekit-server-sdk v2+, sync in v1.x
    const rawToken = at.toJwt()
    const token = rawToken && typeof rawToken.then === 'function' ? await rawToken : rawToken
    res.json({ success: true, data: { token, wsUrl: process.env.LIVEKIT_URL } })
  } catch (err) {
    console.error('POST /interviewer/livekit-token failed:', err)
    res.status(500).json({ success: false, error: 'Could not generate LiveKit token' })
  }
})

module.exports = router
