// backend/src/routes/report.routes.js
const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const reportRepository = require('../repositories/report.repository')
const reportJobRepository = require('../repositories/report-job.repository')

const router = express.Router()

router.use(authMiddleware, requireRole('manager'))

// GET /api/reports/team — all reports for the manager's team
router.get('/team', async (req, res) => {
  try {
    const source = ['client', 'monthly'].includes(req.query.source) ? req.query.source : null
    const [reports, stats] = await Promise.all([
      reportRepository.getReportsByManager(req.user.id, source),
      reportRepository.getStatsByManager(req.user.id),
    ])
    res.json({ success: true, data: { reports, stats } })
  } catch (err) {
    console.error('GET /reports/team failed:', err)
    res.status(500).json({ success: false, error: 'Could not load team reports' })
  }
})

router.get('/jobs', async (req, res) => {
  try {
    const jobs = await reportJobRepository.getByManager(req.user.id)
    res.json({ success: true, data: jobs })
  } catch (err) {
    console.error('GET /reports/jobs failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report jobs' })
  }
})

router.post('/jobs/:id/retry', async (req, res) => {
  try {
    const job = await reportJobRepository.retryForManager(parseInt(req.params.id, 10), req.user.id)
    if (!job) return res.status(404).json({ success: false, error: 'Failed report job not found' })
    res.json({ success: true, data: job })
  } catch (err) {
    console.error('POST /reports/jobs/:id/retry failed:', err)
    res.status(500).json({ success: false, error: 'Could not retry report job' })
  }
})

// GET /api/reports/interview/:id — report by interview ID
router.get('/interview/:id', async (req, res) => {
  try {
    const interviewId = parseInt(req.params.id, 10)
    const report = await reportRepository.getDetailByInterviewForManager(interviewId, req.user.id)
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' })
    res.json({ success: true, data: report })
  } catch (err) {
    console.error('GET /reports/interview/:id failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report' })
  }
})

// GET /api/reports/detail/:id — full report detail by report ID
router.get('/detail/:id', async (req, res) => {
  try {
    const reportId = parseInt(req.params.id, 10)
    const report = await reportRepository.getDetailByIdForManager(reportId, req.user.id)
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' })
    res.json({ success: true, data: report })
  } catch (err) {
    console.error('GET /reports/detail/:id failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report' })
  }
})

// GET /api/reports/candidate/:userId — latest report for a user (by internal_user_id)
router.get('/candidate/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10)
    const report = await reportRepository.getLatestByInternalUserForManager(userId, req.user.id)
    res.json({ success: true, data: report || null })
  } catch (err) {
    console.error('GET /reports/candidate/:userId failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report' })
  }
})

// GET /api/reports/candidate/:userId/history — all reports for a user
router.get('/candidate/:userId/history', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10)
    const reports = await reportRepository.getHistoryByUserForManager(userId, req.user.id)
    res.json({ success: true, data: reports })
  } catch (err) {
    console.error('GET /reports/candidate/:userId/history failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report history' })
  }
})

module.exports = router
