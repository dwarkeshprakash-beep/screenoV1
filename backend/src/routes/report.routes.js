// backend/src/routes/report.routes.js
// Report endpoints. Manager only.

const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const reportRepository = require('../repositories/report.repository')

const router = express.Router()

router.use(authMiddleware, requireRole('manager'))

// GET /api/reports/team
router.get('/team', async (req, res) => {
  try {
    const [reports, stats] = await Promise.all([
      reportRepository.getTeamReports(req.user.companyId),
      reportRepository.getTeamReportStats(req.user.companyId),
    ])
    res.json({ success: true, data: { reports, stats } })
  } catch (err) {
    console.error('GET /reports/team failed:', err)
    res.status(500).json({ success: false, error: 'Could not load team reports' })
  }
})

// GET /api/reports/candidate/:id
router.get('/candidate/:id', async (req, res) => {
  try {
    const report = await reportRepository.getLatestByCandidate(parseInt(req.params.id, 10), req.user.companyId)
    if (!report) {
      return res.json({ success: true, data: null })
    }
    res.json({ success: true, data: report })
  } catch (err) {
    console.error('GET /reports/candidate/:id failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report' })
  }
})

// GET /api/reports/candidate/:id/history — every past report session, newest first
router.get('/candidate/:id/history', async (req, res) => {
  try {
    const reports = await reportRepository.getHistoryByCandidate(parseInt(req.params.id, 10), req.user.companyId)
    res.json({ success: true, data: reports })
  } catch (err) {
    console.error('GET /reports/candidate/:id/history failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report history' })
  }
})

module.exports = router
