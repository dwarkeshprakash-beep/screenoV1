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

router.get('/org-users', async (req, res) => {
  try {
    const users = await scheduleService.getOrgUsers(req.user.companyId)
    res.json({ success: true, data: users })
  } catch (err) {
    console.error('GET /schedule/org-users failed:', err)
    res.status(500).json({ success: false, error: 'Could not load users' })
  }
})

router.get('/email-deliveries/:interviewId', async (req, res) => {
  try {
    const deliveries = await scheduleService.getEmailDeliveries(parseInt(req.params.interviewId, 10), req.user.id)
    res.json({ success: true, data: deliveries })
  } catch (err) {
    console.error('GET /schedule/email-deliveries/:interviewId failed:', err)
    if (err.message === 'Interview not found') return res.status(404).json({ success: false, error: err.message })
    if (err.message === 'Forbidden') return res.status(403).json({ success: false, error: err.message })
    res.status(500).json({ success: false, error: 'Could not load email delivery status' })
  }
})

router.post('/email-deliveries/:interviewId/resend', async (req, res) => {
  try {
    const result = await scheduleService.resendMagicLink(parseInt(req.params.interviewId, 10), req.user.id)
    res.json({ success: result.status === 'sent', data: result, error: result.status === 'failed' ? result.message : undefined })
  } catch (err) {
    console.error('POST /schedule/email-deliveries/:interviewId/resend failed:', err)
    if (['Interview not found', 'Candidate not found'].includes(err.message)) return res.status(404).json({ success: false, error: err.message })
    if (err.message === 'Interview already completed') return res.status(409).json({ success: false, error: err.message })
    if (err.message === 'Forbidden') return res.status(403).json({ success: false, error: err.message })
    res.status(500).json({ success: false, error: 'Could not resend invite. Please contact administration.' })
  }
})

// POST /api/schedule
router.post('/', async (req, res) => {
  try {
    const { userId, teamMemberId, candidateId, type, interviewMode } = req.body

    if (!userId && !teamMemberId && !candidateId) {
      return res.status(400).json({ success: false, error: 'userId or candidateId is required' })
    }
    if (!type) return res.status(400).json({ success: false, error: 'type is required' })
    if (!interviewMode) return res.status(400).json({ success: false, error: 'interviewMode is required' })

    const interview = await scheduleService.createSchedule(req.body, req.user.id, req.user.companyId)
    res.status(201).json({ success: true, data: interview })
  } catch (err) {
    console.error('POST /schedule failed:', err)
    if ([
      'Candidate not found',
      'Team member not found',
      'Organization member not found',
      'Manager not found',
    ].includes(err.message)) {
      return res.status(404).json({ success: false, error: err.message })
    }
    if ([
      'Invalid interview type',
      'Invalid interview mode',
      'Choose either a client template or a monthly assessment',
      'Question count must be an integer between 1 and 50',
      'Some report recipients are not in your organization',
    ].includes(err.message)) {
      return res.status(400).json({ success: false, error: err.message })
    }
    if (['Client template not found', 'Monthly assessment not found'].includes(err.message)) {
      return res.status(404).json({ success: false, error: err.message })
    }
    res.status(500).json({ success: false, error: 'Could not create schedule' })
  }
})

// GET /api/schedule/calendar?week=YYYY-MM-DD
router.get('/calendar', async (req, res) => {
  try {
    const events = await scheduleService.getCalendarEvents(req.user.id, req.query.week)
    res.json({ success: true, data: events })
  } catch (err) {
    console.error('GET /schedule/calendar failed:', err)
    res.status(500).json({ success: false, error: 'Could not load calendar' })
  }
})

module.exports = router
