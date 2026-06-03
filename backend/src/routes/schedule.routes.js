// backend/src/routes/schedule.routes.js
// Schedule endpoints. Manager only.

const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const scheduleService = require('../services/schedule.service')

const router = express.Router()

// GET /api/schedule/slots/:token — public route, no auth needed
router.get('/slots/:token', async (req, res) => {
  try {
    const slots = await scheduleService.getAvailableSlots(req.params.token)
    res.json({ success: true, data: slots })
  } catch (err) {
    console.error('GET /schedule/slots/:token failed:', err)
    res.status(500).json({ success: false, error: 'Could not load slots' })
  }
})

router.use(authMiddleware, requireRole('manager'))

// POST /api/schedule
router.post('/', async (req, res) => {
  try {
    const { candidateId, type, interviewMode } = req.body

    if (!candidateId) return res.status(400).json({ success: false, error: 'candidateId is required' })
    if (!type) return res.status(400).json({ success: false, error: 'type is required' })
    if (!interviewMode) return res.status(400).json({ success: false, error: 'interviewMode is required' })

    const interview = await scheduleService.createSchedule(req.body, req.user.id, req.user.companyId)
    res.status(201).json({ success: true, data: interview })
  } catch (err) {
    console.error('POST /schedule failed:', err)
    if (err.message === 'Candidate not found') {
      return res.status(404).json({ success: false, error: 'Candidate not found' })
    }
    res.status(500).json({ success: false, error: 'Could not create schedule' })
  }
})

// GET /api/schedule/calendar?week=YYYY-MM-DD
router.get('/calendar', async (req, res) => {
  try {
    const events = await scheduleService.getCalendarEvents(req.user.companyId, req.query.week)
    res.json({ success: true, data: events })
  } catch (err) {
    console.error('GET /schedule/calendar failed:', err)
    res.status(500).json({ success: false, error: 'Could not load calendar' })
  }
})

module.exports = router
