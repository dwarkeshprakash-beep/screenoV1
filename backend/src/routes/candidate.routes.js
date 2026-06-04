// backend/src/routes/candidate.routes.js
// Candidate self-service endpoints (auth via session JWT from magic link).

const express = require('express')
const authMiddleware = require('../middleware/auth')
const interviewRepository = require('../repositories/interview.repository')
const reportRepository = require('../repositories/report.repository')

const router = express.Router()

router.use(authMiddleware)

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

module.exports = router
