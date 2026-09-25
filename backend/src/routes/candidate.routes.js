const express = require('express')
const authMiddleware = require('../middleware/auth')
const { loadAccess, requireModule } = require('../middleware/access')
const { documentUpload } = require('../middleware/upload')
const candidateService = require('../services/candidate.service')

const router = express.Router()

// No single blanket gate any more - this file mixes routes for several different
// modules (interviews, feedback, outcomes, client_mandates, monthly_assessments), each
// gated per-route below. Only auth/access-context loading is common to all of them.
router.use(authMiddleware, loadAccess)

// Expected service failures carry httpStatus (and data for the launch window); anything
// else is a 500 with the fallback message.
function sendCandidateError(res, err, fallbackMessage) {
  if (err.httpStatus) {
    const body = { success: false, error: err.message }
    if (err.data !== undefined) body.data = err.data
    return res.status(err.httpStatus).json(body)
  }
  res.status(500).json({ success: false, error: fallbackMessage })
}

router.get('/interviews', requireModule('interviews'), async (req, res) => {
  try {
    const interviews = await candidateService.listInterviews(req.user)
    res.json({ success: true, data: interviews })
  } catch (err) {
    console.error('GET /candidate/interviews failed:', err)
    res.status(500).json({ success: false, error: 'Could not load interviews' })
  }
})

// Launching/joining is about YOUR OWN interview (already scoped by candidate identity
// in the service), not managing anyone else's - View-level access is enough, not the
// POST default of Save.
router.post('/interviews/:id/launch', requireModule('interviews', { permission: 'View' }), async (req, res) => {
  try {
    const launch = await candidateService.launchInterview(req.user, req.params.id)
    res.json({ success: true, data: launch })
  } catch (err) {
    if (err.httpStatus) return sendCandidateError(res, err)
    console.error('POST /candidate/interviews/:id/launch failed:', err)
    if (['INTERVIEW_NOT_OPEN', 'INTERVIEW_WINDOW_EXPIRED'].includes(err.code)) {
      return res.status(409).json({ success: false, error: err.message, data: err.data || null })
    }
    res.status(500).json({ success: false, error: 'Could not start interview' })
  }
})

router.post('/interviews/:id/join', requireModule('interviews', { permission: 'View' }), async (req, res) => {
  try {
    const data = await candidateService.joinInterview(req.user, req.params.id)
    res.json({ success: true, data })
  } catch (err) {
    if (!err.httpStatus) console.error('POST /candidate/interviews/:id/join failed:', err)
    sendCandidateError(res, err, 'Could not join interview')
  }
})

router.get('/report', requireModule('feedback'), async (req, res) => {
  try {
    const report = await candidateService.getLatestReport(req.user)
    res.json({ success: true, data: report })
  } catch (err) {
    if (!err.httpStatus) console.error('GET /candidate/report failed:', err)
    sendCandidateError(res, err, 'Could not load report')
  }
})

router.get('/reports', requireModule('feedback'), async (req, res) => {
  try {
    const reports = await candidateService.listReports(req.user)
    res.json({ success: true, data: reports })
  } catch (err) {
    console.error('GET /candidate/reports failed:', err)
    res.status(500).json({ success: false, error: 'Could not load reports' })
  }
})

// ── Client mandates the candidate has been added to ───────────────────────────

router.get('/client-mandates', requireModule('client_mandates', { permission: 'View' }), async (req, res) => {
  try {
    const mandates = await candidateService.listClientMandates(req.user.id)
    res.json({ success: true, data: mandates })
  } catch (err) {
    console.error('GET /candidate/client-mandates failed:', err)
    res.status(500).json({ success: false, error: 'Could not load client mandates' })
  }
})

// Submit a resume for a specific client mandate. Three ways to provide one:
// 1. multipart file upload - added to the candidate's resume pool and linked to this mandate
// 2. JSON { resumeAssetId } - link one of the candidate's existing resumes to this mandate
// 3. JSON { useExisting: true } - link the candidate's current default resume (back-compat)
router.post(
  '/client-mandates/:ctId/resume',
  requireModule(['client_mandates', 'outcomes'], { permission: 'View' }),
  documentUpload.single('resume'),
  async (req, res) => {
    try {
      const updated = await candidateService.submitClientMandateResume(req.user.id, parseInt(req.params.ctId, 10), {
        file: req.file,
        resumeAssetId: req.body.resumeAssetId,
        useExisting: req.body.useExisting,
      })
      res.json({ success: true, data: updated })
    } catch (err) {
      if (!err.httpStatus) console.error('POST /candidate/client-mandates/:ctId/resume failed:', err)
      sendCandidateError(res, err, 'Could not update client resume')
    }
  }
)

// Get resume metadata for a specific client mandate
router.get('/client-mandates/:ctId/resume', requireModule(['client_mandates', 'outcomes'], { permission: 'View' }), async (req, res) => {
  try {
    const resumeMetadata = await candidateService.getClientMandateResume(req.user.id, parseInt(req.params.ctId, 10))
    res.json({ success: true, data: resumeMetadata })
  } catch (err) {
    if (!err.httpStatus) console.error('GET /candidate/client-mandates/:ctId/resume failed:', err)
    sendCandidateError(res, err, 'Could not load mandate resume metadata')
  }
})

// ── Candidate: monthly assessment plans ───────────────────────────────────────

router.get('/monthly-assessments', requireModule('monthly_assessments', { permission: 'View' }), async (req, res) => {
  try {
    const plans = await candidateService.listMonthlyPlans(req.user.id)
    res.json({ success: true, data: plans })
  } catch (err) {
    console.error('GET /candidate/monthly-assessments failed:', err)
    res.status(500).json({ success: false, error: 'Could not load monthly assessments' })
  }
})

// ── Candidate: client outcome rounds (published only) ──────────────────────────

router.get('/client-outcomes', requireModule('outcomes'), async (req, res) => {
  try {
    const mandates = await candidateService.listClientOutcomes(req.user.id)
    res.json({ success: true, data: mandates })
  } catch (err) {
    console.error('GET /candidate/client-outcomes failed:', err)
    res.status(500).json({ success: false, error: 'Could not load client outcomes' })
  }
})

module.exports = router
