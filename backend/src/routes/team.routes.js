const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const teamService = require('../services/team.service')

const router = express.Router()

router.use(authMiddleware, requireRole('manager'))

function sendTeamError(res, err, fallback) {
  if (err.message === 'Member not found') {
    return res.status(404).json({ success: false, error: err.message })
  }
  if ([
    'Email is required',
    'CSV content is required',
    'CSV must include a header and at least one row',
    'CSV headers must include firstName and email',
    'First name and email are required',
    'A valid email is required',
  ].includes(err.message)) {
    return res.status(400).json({ success: false, error: err.message })
  }
  return res.status(500).json({ success: false, error: fallback })
}

router.get('/', async (req, res) => {
  try {
    const members = await teamService.getTeam(req.user.id, req.query.filter || 'all')
    res.json({ success: true, data: members })
  } catch (err) {
    console.error('GET /team failed:', err)
    res.status(500).json({ success: false, error: 'Could not load team' })
  }
})

router.get('/not-in-team', async (req, res) => {
  try {
    const users = await teamService.getOrgUsersNotInTeam(req.user.companyId, req.user.id)
    res.json({ success: true, data: users })
  } catch (err) {
    console.error('GET /team/not-in-team failed:', err)
    res.status(500).json({ success: false, error: 'Could not load users' })
  }
})

router.get('/stats', async (req, res) => {
  try {
    const stats = await teamService.getStats(req.user.id)
    res.json({ success: true, data: stats })
  } catch (err) {
    console.error('GET /team/stats failed:', err)
    res.status(500).json({ success: false, error: 'Could not load stats' })
  }
})

router.get('/activity', async (req, res) => {
  try {
    const activity = await teamService.getActivity(req.user.id)
    res.json({ success: true, data: activity })
  } catch (err) {
    console.error('GET /team/activity failed:', err)
    res.status(500).json({ success: false, error: 'Could not load activity' })
  }
})

router.get('/member/:id', async (req, res) => {
  try {
    const member = await teamService.getMember(parseInt(req.params.id, 10), req.user.id)
    res.json({ success: true, data: member })
  } catch (err) {
    console.error('GET /team/member/:id failed:', err)
    sendTeamError(res, err, 'Could not load member')
  }
})

router.post('/member', async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone, type, existingId,
      employeeId, department, position, location,
    } = req.body
    const member = await teamService.addMember(
      {
        firstName, lastName, email, phone, type, userId: existingId,
        employeeId, department, position, location,
      },
      req.user.companyId,
      req.user.id
    )
    res.status(201).json({ success: true, data: member })
  } catch (err) {
    console.error('POST /team/member failed:', err)
    sendTeamError(res, err, 'Could not add member')
  }
})

router.patch('/member/:id', async (req, res) => {
  try {
    const member = await teamService.updateMember(parseInt(req.params.id, 10), req.body, req.user.id)
    res.json({ success: true, data: member })
  } catch (err) {
    console.error('PATCH /team/member/:id failed:', err)
    sendTeamError(res, err, 'Could not update member')
  }
})

router.delete('/member/:id', async (req, res) => {
  try {
    await teamService.removeMember(parseInt(req.params.id, 10), req.user.id)
    res.json({ success: true, data: null })
  } catch (err) {
    console.error('DELETE /team/member/:id failed:', err)
    sendTeamError(res, err, 'Could not remove member')
  }
})

router.get('/member/:id/interviews', async (req, res) => {
  try {
    const interviews = await teamService.getMemberInterviews(parseInt(req.params.id, 10), req.user.id)
    res.json({ success: true, data: interviews })
  } catch (err) {
    console.error('GET /team/member/:id/interviews failed:', err)
    sendTeamError(res, err, 'Could not load interviews')
  }
})

router.post('/import', async (req, res) => {
  try {
    const result = await teamService.importFromCSV(
      req.body.csv,
      req.user.companyId,
      req.user.id
    )
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('POST /team/import failed:', err)
    sendTeamError(res, err, 'Could not import CSV')
  }
})

router.get('/external', async (req, res) => {
  try {
    const candidates = await teamService.getExternalCandidates(req.user.companyId)
    res.json({ success: true, data: candidates })
  } catch (err) {
    console.error('GET /team/external failed:', err)
    res.status(500).json({ success: false, error: 'Could not load external candidates' })
  }
})

router.post('/external', async (req, res) => {
  try {
    const candidate = await teamService.addExternalCandidate(req.body, req.user.companyId)
    res.status(201).json({ success: true, data: candidate })
  } catch (err) {
    console.error('POST /team/external failed:', err)
    sendTeamError(res, err, 'Could not add external candidate')
  }
})

module.exports = router
