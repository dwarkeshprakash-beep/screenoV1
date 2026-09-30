// backend/src/routes/report.routes.js
const express = require('express')
const authMiddleware = require('../middleware/auth')
const { loadAccess, requireModule } = require('../middleware/access')
const accessService = require('../services/access.service')
const reportService = require('../services/report.service')

const router = express.Router()

router.use(authMiddleware, loadAccess, requireModule('reports'))

// Reports are about mandates/interviews owned via the client_mandates ownership chain -
// View All sees every report in the company, plain View is limited to reports for
// interviews the caller owns, created, collaborates on, or participates in.
function reportScope(req) {
  return {
    viewAll: accessService.hasModulePermission(req.access, 'client_mandates', 'View All'),
    companyId: req.access.companyId,
  }
}

// GET /api/reports/team - all reports for the manager's team
router.get('/team', async (req, res) => {
  try {
    const source = ['client', 'monthly', 'general'].includes(req.query.source) ? req.query.source : null
    const data = await reportService.getTeamReports(req.user.id, reportScope(req), source)
    res.json({ success: true, data })
  } catch (err) {
    console.error('GET /reports/team failed:', err)
    res.status(500).json({ success: false, error: 'Could not load team reports' })
  }
})

router.get('/jobs', async (req, res) => {
  try {
    const jobs = await reportService.getReportJobs(req.user.id)
    res.json({ success: true, data: jobs })
  } catch (err) {
    console.error('GET /reports/jobs failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report jobs' })
  }
})

router.post('/jobs/:id/retry', async (req, res) => {
  try {
    const job = await reportService.retryReportJob(parseInt(req.params.id, 10), req.user.id)
    if (!job) return res.status(404).json({ success: false, error: 'Failed report job not found' })
    res.json({ success: true, data: job })
  } catch (err) {
    console.error('POST /reports/jobs/:id/retry failed:', err)
    res.status(500).json({ success: false, error: 'Could not retry report job' })
  }
})

// GET /api/reports/interview/:id - report by interview ID
router.get('/interview/:id', async (req, res) => {
  try {
    const report = await reportService.getReportByInterview(parseInt(req.params.id, 10), req.user.id, reportScope(req))
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' })
    res.json({ success: true, data: report })
  } catch (err) {
    console.error('GET /reports/interview/:id failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report' })
  }
})

// GET /api/reports/detail/:id - full report detail by report ID
router.get('/detail/:id', async (req, res) => {
  try {
    const report = await reportService.getReportById(parseInt(req.params.id, 10), req.user.id, reportScope(req))
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' })
    res.json({ success: true, data: report })
  } catch (err) {
    console.error('GET /reports/detail/:id failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report' })
  }
})

// GET /api/reports/candidate/:userId - latest report for a user (by internal_user_id)
router.get('/candidate/:userId', async (req, res) => {
  try {
    const report = await reportService.getLatestReportForUser(parseInt(req.params.userId, 10), req.user.id, reportScope(req))
    res.json({ success: true, data: report })
  } catch (err) {
    console.error('GET /reports/candidate/:userId failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report' })
  }
})

// GET /api/reports/candidate/:userId/history - all reports for a user
router.get('/candidate/:userId/history', async (req, res) => {
  try {
    const reports = await reportService.getReportHistoryForUser(parseInt(req.params.userId, 10), req.user.id, reportScope(req))
    res.json({ success: true, data: reports })
  } catch (err) {
    console.error('GET /reports/candidate/:userId/history failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report history' })
  }
})

module.exports = router
