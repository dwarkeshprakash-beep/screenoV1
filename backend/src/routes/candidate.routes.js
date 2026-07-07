const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const { documentUpload } = require('../middleware/upload')
const interviewRepository = require('../repositories/interview.repository')
const reportRepository = require('../repositories/report.repository')
const clientTeamRepo = require('../repositories/client-team.repository')
const userRepository = require('../repositories/user.repository')
const storageService = require('../services/storage.service')
const candidateIdentityService = require('../services/candidate-identity.service')
const authService = require('../services/auth.service')

const router = express.Router()
router.use(authMiddleware, requireRole('candidate'))

router.get('/interviews', async (req, res) => {
  try {
    const identity = candidateIdentityService.fromUser(req.user)
    const interviews = await interviewRepository.getByCandidateIdentity(identity)
    const safeInterviews = interviews.map(({
      token,
      overall_score,
      ...interview
    }) => interview)
    res.json({ success: true, data: safeInterviews })
  } catch (err) {
    console.error('GET /candidate/interviews failed:', err)
    res.status(500).json({ success: false, error: 'Could not load interviews' })
  }
})

router.post('/interviews/:id/launch', async (req, res) => {
  try {
    const identity = candidateIdentityService.fromUser(req.user)
    const interview = await interviewRepository.getByIdForCandidateIdentity(req.params.id, identity)
    if (!interview) return res.status(404).json({ success: false, error: 'Interview not found' })
    if (!['scheduled', 'in_progress'].includes(interview.status)) {
      return res.status(409).json({
        success: false,
        error: interview.status === 'completed' ? 'Interview already completed' : 'Interview is not available to start',
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
    const report = await reportRepository.getLatestByCandidateIdentity(identity, identity.interviewId)
    if (!report) return res.status(404).json({ success: false, error: 'No report available yet' })
    res.json({
      success: true,
      data: {
        id: report.id,
        interview_id: report.interview_id,
        status: report.status,
        strengths: report.strengths,
        created: report.created,
      },
    })
  } catch (err) {
    console.error('GET /candidate/report failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report' })
  }
})

// ── Client mandates the candidate has been added to ───────────────────────────

router.get('/client-mandates', async (req, res) => {
  try {
    const rows = await clientTeamRepo.getByUser(req.user.id)

    // Attach any scheduled interviews and client interview records for each mandate
    const enriched = await Promise.all(rows.map(async row => {
      const db = require('../db/connection')
      const [interviews, clientRecord] = await Promise.all([
        db.query(
          `SELECT id, type, status, scheduled_at, location, created
           FROM interviews
           WHERE client_team_id = @ctId
           ORDER BY created DESC LIMIT 5`,
          { ctId: row.id }
        ),
        db.query(
          `SELECT * FROM client_interview_records WHERE client_team_id = @ctId ORDER BY created DESC LIMIT 1`,
          { ctId: row.id }
        ),
      ])
      return {
        ...row,
        interviews,
        client_interview_record: clientRecord[0] || null,
      }
    }))

    res.json({ success: true, data: enriched })
  } catch (err) {
    console.error('GET /candidate/client-mandates failed:', err)
    res.status(500).json({ success: false, error: 'Could not load client mandates' })
  }
})

// Submit resume for a specific client mandate.
// Option 1 (JSON): { useExisting: true } — copies current profile resume URL
// Option 2 (multipart): upload a client-specific resume file
router.post(
  '/client-mandates/:ctId/resume',
  documentUpload.single('resume'),
  async (req, res) => {
    try {
      const ctId = parseInt(req.params.ctId, 10)
      const entry = await clientTeamRepo.getById(ctId)
      if (!entry || entry.user_id !== req.user.id) {
        return res.status(404).json({ success: false, error: 'Client mandate entry not found' })
      }

      let resumeUrl

      if (req.body.useExisting === 'true' || req.body.useExisting === true) {
        // Use the candidate's existing profile resume
        const profile = await userRepository.getById(req.user.id)
        if (!profile?.resume_url) {
          return res.status(400).json({ success: false, error: 'No existing resume on your profile' })
        }
        resumeUrl = profile.resume_url
      } else if (req.file) {
        // Upload a new client-specific resume
        const uploaded = await storageService.uploadClientResume(
          req.file.buffer,
          req.user.id,
          ctId,
          req.file
        )
        resumeUrl = uploaded.url
      } else {
        return res.status(400).json({ success: false, error: 'Provide either useExisting=true or a resume file' })
      }

      const updated = await clientTeamRepo.updateClientResume(ctId, resumeUrl)
      res.json({ success: true, data: updated })
    } catch (err) {
      console.error('POST /candidate/client-mandates/:ctId/resume failed:', err)
      res.status(500).json({ success: false, error: 'Could not update client resume' })
    }
  }
)

module.exports = router
