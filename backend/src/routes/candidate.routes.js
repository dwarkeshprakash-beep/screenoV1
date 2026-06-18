const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const interviewRepository = require('../repositories/interview.repository')
const reportRepository = require('../repositories/report.repository')
const candidateIdentityService = require('../services/candidate-identity.service')
const authService = require('../services/auth.service')

const router = express.Router()

router.use(authMiddleware, requireRole('candidate'))

router.get('/interviews', async (req, res) => {
  try {
    const identity = candidateIdentityService.fromUser(req.user)
    const interviews = await interviewRepository.getByCandidateIdentity(identity)
    const safeInterviews = interviews.map(({ token, ...interview }) => interview)
    res.json({ success: true, data: safeInterviews })
  } catch (err) {
    console.error('GET /candidate/interviews failed:', err)
    res.status(500).json({ success: false, error: 'Could not load interviews' })
  }
})

router.post('/interviews/:id/launch', async (req, res) => {
  try {
    const identity = candidateIdentityService.fromUser(req.user)
    const interview = await interviewRepository.getByIdForCandidateIdentity(
      req.params.id,
      identity
    )
    if (!interview) {
      return res.status(404).json({ success: false, error: 'Interview not found' })
    }
    if (!['scheduled', 'in_progress'].includes(interview.status)) {
      return res.status(409).json({
        success: false,
        error: interview.status === 'completed'
          ? 'Interview already completed'
          : 'Interview is not available to start',
      })
    }
    const launch = await authService.createCandidateLaunch(interview)
    res.json({ success: true, data: launch })
  } catch (err) {
    console.error('POST /candidate/interviews/:id/launch failed:', err)
    res.status(500).json({ success: false, error: 'Could not start interview' })
  }
})

router.get('/report', async (req, res) => {
  try {
    const identity = candidateIdentityService.fromUser(req.user)
    const report = await reportRepository.getLatestByCandidateIdentity(
      identity,
      identity.interviewId
    )
    if (!report) return res.status(404).json({ success: false, error: 'No report available yet' })
    res.json({ success: true, data: report })
  } catch (err) {
    console.error('GET /candidate/report failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report' })
  }
})

module.exports = router
