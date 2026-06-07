// backend/src/routes/team.routes.js
// Team management endpoints. HTTP only — no SQL, no business logic.

const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const teamService = require('../services/team.service')
const interviewRepository = require('../repositories/interview.repository')

const router = express.Router()

router.use(authMiddleware, requireRole('manager'))

// GET /api/team?filter=all|overdue|never
router.get('/', async (req, res) => {
  try {
    const { filter = 'all' } = req.query
    const members = await teamService.getTeam(req.user.companyId, filter)
    res.json({ success: true, data: members })
  } catch (err) {
    console.error('GET /team failed:', err)
    res.status(500).json({ success: false, error: 'Could not load team' })
  }
})

// GET /api/team/not-in-team — org users not yet in this company's candidates table
router.get('/not-in-team', async (req, res) => {
  try {
    const users = await teamService.getOrgUsersNotInTeam(req.user.companyId)
    res.json({ success: true, data: users })
  } catch (err) {
    console.error('GET /team/not-in-team failed:', err)
    res.status(500).json({ success: false, error: 'Could not load users' })
  }
})

// GET /api/team/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await teamService.getStats(req.user.companyId)
    res.json({ success: true, data: stats })
  } catch (err) {
    console.error('GET /team/stats failed:', err)
    res.status(500).json({ success: false, error: 'Could not load stats' })
  }
})

// GET /api/team/activity
router.get('/activity', async (req, res) => {
  try {
    const activity = await teamService.getActivity(req.user.companyId)
    res.json({ success: true, data: activity })
  } catch (err) {
    console.error('GET /team/activity failed:', err)
    res.status(500).json({ success: false, error: 'Could not load activity' })
  }
})

// GET /api/team/member/:id
router.get('/member/:id', async (req, res) => {
  try {
    const member = await teamService.getMember(parseInt(req.params.id, 10), req.user.companyId)
    res.json({ success: true, data: member })
  } catch (err) {
    console.error('GET /team/member/:id failed:', err)
    if (err.message === 'Member not found') {
      return res.status(404).json({ success: false, error: 'Member not found' })
    }
    res.status(500).json({ success: false, error: 'Could not load member' })
  }
})

// POST /api/team/member
router.post('/member', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, type } = req.body
    if (!firstName) return res.status(400).json({ success: false, error: 'First name is required' })
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' })

    const member = await teamService.addMember(
      { firstName, lastName, email, phone, type },
      req.user.companyId,
      req.user.id
    )
    res.status(201).json({ success: true, data: member })
  } catch (err) {
    console.error('POST /team/member failed:', err)
    res.status(500).json({ success: false, error: 'Could not add member' })
  }
})

// PATCH /api/team/member/:id
router.patch('/member/:id', async (req, res) => {
  try {
    const member = await teamService.updateMember(parseInt(req.params.id, 10), req.body, req.user.companyId)
    res.json({ success: true, data: member })
  } catch (err) {
    console.error('PATCH /team/member/:id failed:', err)
    res.status(500).json({ success: false, error: 'Could not update member' })
  }
})

// DELETE /api/team/member/:id
router.delete('/member/:id', async (req, res) => {
  try {
    await teamService.removeMember(parseInt(req.params.id, 10), req.user.companyId)
    res.json({ success: true, data: null })
  } catch (err) {
    console.error('DELETE /team/member/:id failed:', err)
    res.status(500).json({ success: false, error: 'Could not remove member' })
  }
})

// GET /api/team/member/:id/interviews — all interviews for a candidate
router.get('/member/:id/interviews', async (req, res) => {
  try {
    await teamService.getMember(parseInt(req.params.id, 10), req.user.companyId)
    const interviews = await interviewRepository.getByCandidate(parseInt(req.params.id, 10))
    res.json({ success: true, data: interviews })
  } catch (err) {
    console.error('GET /team/member/:id/interviews failed:', err)
    res.status(500).json({ success: false, error: 'Could not load interviews' })
  }
})

// GET /api/team/member/:id/notes
router.get('/member/:id/notes', async (req, res) => {
  try {
    const notes = await teamService.getNotes(parseInt(req.params.id, 10), req.user.companyId)
    res.json({ success: true, data: notes })
  } catch (err) {
    console.error('GET /team/member/:id/notes failed:', err)
    res.status(500).json({ success: false, error: 'Could not load notes' })
  }
})

// POST /api/team/member/:id/notes
router.post('/member/:id/notes', async (req, res) => {
  try {
    const { note } = req.body
    if (!note) return res.status(400).json({ success: false, error: 'Note is required' })
    const created = await teamService.addNote(parseInt(req.params.id, 10), req.user.id, req.user.companyId, note)
    res.status(201).json({ success: true, data: created })
  } catch (err) {
    console.error('POST /team/member/:id/notes failed:', err)
    res.status(500).json({ success: false, error: 'Could not save note' })
  }
})

// POST /api/team/import
router.post('/import', async (req, res) => {
  try {
    const { csv } = req.body
    if (!csv) return res.status(400).json({ success: false, error: 'csv is required' })
    const result = await teamService.importFromCSV(csv, req.user.companyId, req.user.id)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('POST /team/import failed:', err)
    res.status(500).json({ success: false, error: err.message || 'Import failed' })
  }
})

module.exports = router
