// backend/src/routes/candidate.routes.js
// Candidate self-service endpoints (auth via session JWT from magic link).

const express = require('express')
const authMiddleware = require('../middleware/auth')
const interviewRepository = require('../repositories/interview.repository')

const router = express.Router()

router.use(authMiddleware)

// GET /api/candidate/interviews  — candidate's own interview list
router.get('/interviews', async (req, res) => {
  try {
    const candidateId = req.user.candidateId || req.user.id
    const interviews = await interviewRepository.getByCompany(0) // placeholder
    // Filter to this candidate's interviews
    const own = interviews.filter(i => i.candidate_id === candidateId)
    res.json({ success: true, data: own })
  } catch (err) {
    console.error('GET /candidate/interviews failed:', err)
    res.status(500).json({ success: false, error: 'Could not load interviews' })
  }
})

module.exports = router
