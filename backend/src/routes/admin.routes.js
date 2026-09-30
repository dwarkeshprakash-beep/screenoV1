// backend/src/routes/admin.routes.js
// Admin-only system inspection and emergency controls.

const express = require('express')
const authMiddleware = require('../middleware/auth')
const { loadAccess, requirePlatformAdmin } = require('../middleware/access')
const adminService = require('../services/admin.service')
const userService = require('../services/user.service')

const router = express.Router()
router.use(authMiddleware, loadAccess, requirePlatformAdmin)

// Expected service failures carry httpStatus; anything else is logged and returned as a 500.
function sendAdminError(res, err, logLabel, fallbackMessage) {
  if (err.httpStatus) return res.status(err.httpStatus).json({ success: false, error: err.message })
  console.error(`[Admin] ${logLabel} failed:`, err.message)
  res.status(500).json({ success: false, error: fallbackMessage })
}

// Company picker for admin screens that manage per-company data (e.g. Roles).
router.get('/companies', async (req, res) => {
  try {
    const companies = await adminService.listCompanies()
    res.json({ success: true, data: companies })
  } catch (err) {
    sendAdminError(res, err, 'GET /companies', 'Could not load organizations')
  }
})

router.get('/mandates', async (req, res) => {
  try {
    const mandates = await adminService.listMandates()
    res.json({ success: true, data: mandates })
  } catch (err) {
    sendAdminError(res, err, 'GET /mandates', 'Could not load mandates')
  }
})

router.patch('/mandates/:id/reassign', async (req, res) => {
  try {
    const newManagerId = Number(req.body.newManagerId)
    if (!Number.isInteger(newManagerId)) {
      return res.status(400).json({ success: false, error: 'newManagerId is required' })
    }
    const updated = await adminService.reassignMandate(parseInt(req.params.id, 10), newManagerId)
    res.json({ success: true, data: updated })
  } catch (err) {
    sendAdminError(res, err, 'PATCH /mandates/:id/reassign', 'Could not reassign mandate')
  }
})

const CREATE_USER_ERROR_STATUS = {
  'email is required': 400,
  'Organization not found': 404,
  'Select a valid role for this user': 400,
  'A user with this email already exists in that organization': 409,
  'Could not create user - email may already be in use': 409,
}

// Admin-only bootstrap for a user in another company - the admin explicitly picks
// the role, rather than the system inferring one from a portal.
router.post('/users', async (req, res) => {
  try {
    const companyId = parseInt(req.body.companyId, 10)
    if (!Number.isInteger(companyId)) {
      return res.status(400).json({ success: false, error: 'companyId is required' })
    }
    const roleId = parseInt(req.body.roleId, 10)
    if (!Number.isInteger(roleId)) {
      return res.status(400).json({ success: false, error: 'roleId is required' })
    }

    const created = await userService.createUserWithRole(companyId, {
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      roleId,
    })
    res.status(201).json({ success: true, data: created })
  } catch (err) {
    console.error('[Admin] POST /users failed:', err.message)
    const status = CREATE_USER_ERROR_STATUS[err.message]
    if (status) return res.status(status).json({ success: false, error: err.message })
    res.status(500).json({ success: false, error: 'Could not create user' })
  }
})

router.patch('/mandates/:id/force-status', async (req, res) => {
  try {
    const { archived } = req.body
    if (typeof archived !== 'boolean') {
      return res.status(400).json({ success: false, error: 'archived must be boolean' })
    }
    const updated = await adminService.setMandateArchived(parseInt(req.params.id, 10), archived)
    res.json({ success: true, data: updated })
  } catch (err) {
    sendAdminError(res, err, 'PATCH /mandates/:id/force-status', 'Could not update mandate status')
  }
})

router.delete('/mandates/:id/force-delete', async (req, res) => {
  try {
    const result = await adminService.forceDeleteMandate(parseInt(req.params.id, 10), req.body.confirmText)
    res.json({ success: true, data: result })
  } catch (err) {
    sendAdminError(res, err, 'DELETE /mandates/:id/force-delete', 'Could not force-delete mandate')
  }
})

router.get('/interviews', async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status) : null
    const interviews = await adminService.listRecentInterviews(status)
    res.json({ success: true, data: interviews })
  } catch (err) {
    sendAdminError(res, err, 'GET /interviews', 'Could not load interviews')
  }
})

router.patch('/interviews/:id/force-status', async (req, res) => {
  try {
    const updated = await adminService.setInterviewStatus(parseInt(req.params.id, 10), req.body.status)
    res.json({ success: true, data: updated })
  } catch (err) {
    sendAdminError(res, err, 'PATCH /interviews/:id/force-status', 'Could not update interview status')
  }
})

router.patch('/client-teams/:id/force-status', async (req, res) => {
  try {
    const updated = await adminService.setClientTeamStatus(
      parseInt(req.params.id, 10),
      req.body.status,
      req.body.notes || null
    )
    res.json({ success: true, data: updated })
  } catch (err) {
    sendAdminError(res, err, 'PATCH /client-teams/:id/force-status', 'Could not update client team status')
  }
})

router.post('/client-teams/:id/reassign-requirement', async (req, res) => {
  try {
    const requirementId = req.body.requirementId ? Number(req.body.requirementId) : null
    const updated = await adminService.reassignClientTeamRequirement(parseInt(req.params.id, 10), requirementId)
    res.json({ success: true, data: updated })
  } catch (err) {
    sendAdminError(res, err, 'POST /client-teams/:id/reassign-requirement', 'Could not reassign requirement')
  }
})

router.get('/broken-states', async (req, res) => {
  try {
    const result = await adminService.findBrokenStates()
    res.json({ success: true, data: result })
  } catch (err) {
    sendAdminError(res, err, 'GET /broken-states', 'Could not check for broken states')
  }
})

module.exports = router
