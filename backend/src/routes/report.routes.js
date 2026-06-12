// backend/src/routes/report.routes.js
const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const reportRepository = require('../repositories/report.repository')
const interviewRepository = require('../repositories/interview.repository')

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

// GET /api/reports/interview/:id — report by interview ID
router.get('/interview/:id', async (req, res) => {
  try {
    const interviewId = parseInt(req.params.id, 10)
    const interview = await interviewRepository.getById(interviewId)
    if (!interview || interview.manager_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' })
    }
    const report = await reportRepository.getByInterview(interviewId)
    res.json({ success: true, data: report })
  } catch (err) {
    console.error('GET /reports/interview/:id failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report' })
  }
})

// GET /api/reports/candidate/:userId — latest report for a user (by internal_user_id)
router.get('/candidate/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10)
    const report = await reportRepository.getLatestByCandidate(userId)
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
    const reports = await reportRepository.getHistoryByUser(userId)
    res.json({ success: true, data: reports })
  } catch (err) {
    console.error('GET /reports/candidate/:userId/history failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report history' })
  }
})

module.exports = router
