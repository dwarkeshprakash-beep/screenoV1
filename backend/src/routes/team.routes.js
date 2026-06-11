// backend/src/routes/team.routes.js
const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const teamService = require('../services/team.service')
const interviewRepository = require('../repositories/interview.repository')

const router = express.Router()

router.use(authMiddleware, requireRole('manager'))

router.get('/', async (req, res) => {
  try {
    const { filter = 'all' } = req.query
    const members = await teamService.getTeam(req.user.id, filter)
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
    res.status(500).json({ success: false, error: 'Could not load member' })
  }
})

router.post('/member', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, type, existingId } = req.body
    const member = await teamService.addMember(
      { firstName, lastName, email, phone, type, userId: existingId },
      req.user.companyId,
      req.user.id
    )
    res.status(201).json({ success: true, data: member })
  } catch (err) {
    console.error('POST /team/member failed:', err)
    res.status(500).json({ success: false, error: 'Could not add member' })
  }
})

router.patch('/member/:id', async (req, res) => {
  try {
    const member = await teamService.updateMember(parseInt(req.params.id, 10), req.body, req.user.id)
    res.json({ success: true, data: member })
  } catch (err) {
    console.error('PATCH /team/member/:id failed:', err)
    res.status(500).json({ success: false, error: 'Could not update member' })
  }
})

router.delete('/member/:id', async (req, res) => {
  try {
    await teamService.removeMember(parseInt(req.params.id, 10), req.user.id)
    res.json({ success: true, data: null })
  } catch (err) {
    console.error('DELETE /team/member/:id failed:', err)
    res.status(500).json({ success: false, error: 'Could not remove member' })
  }
})

router.get('/member/:id/interviews', async (req, res) => {
  try {
    const member = await teamService.getMember(parseInt(req.params.id, 10), req.user.id)
    const interviews = await interviewRepository.getByInternalUser(member.user_id)
    res.json({ success: true, data: interviews })
  } catch (err) {
    console.error('GET /team/member/:id/interviews failed:', err)
    res.status(500).json({ success: false, error: 'Could not load interviews' })
  }
})

// Notes stubs — no dedicated table currently; return empty list
router.get('/member/:id/notes', async (req, res) => {
  res.json({ success: true, data: [] })
})

router.post('/member/:id/notes', async (req, res) => {
  res.status(201).json({ success: true, data: null })
})

// CSV import
router.post('/import', async (req, res) => {
  try {
    const result = await teamService.importFromCSV(req.body.csv, req.user.companyId)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('POST /team/import failed:', err)
    res.status(500).json({ success: false, error: 'Could not import CSV' })
  }
})

module.exports = router
