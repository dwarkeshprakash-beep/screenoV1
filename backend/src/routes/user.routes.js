// backend/src/routes/user.routes.js
// HTTP only — receive, call userService, respond. Admin manages users per company
// (the 'admin' role is platform-wide — see admin.routes.js / role.routes.js for the same pattern).
// This is the ONLY place user accounts are created — Team management just links existing
// accounts to a manager's team (see team.service.js addMember).

const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const userService = require('../services/user.service')

const router = express.Router()
router.use(authMiddleware, requireRole('admin'))

const BAD_REQUEST_MESSAGES = [
  'First name is required',
  'A valid email is required',
  'One or more roles are invalid for this company',
  'A user with this email already exists',
  'Email is already in use',
]

function parseCompanyId(rawValue) {
  const companyId = Number(rawValue)
  return Number.isInteger(companyId) && companyId > 0 ? companyId : null
}

function sendUserError(res, err, fallback) {
  if (err.message === 'User not found') {
    return res.status(404).json({ success: false, error: err.message })
  }
  if (err.message === 'Cannot delete this user — they are associated with a mandate or interview') {
    return res.status(409).json({ success: false, error: err.message })
  }
  if (BAD_REQUEST_MESSAGES.includes(err.message)) {
    return res.status(400).json({ success: false, error: err.message })
  }
  return res.status(500).json({ success: false, error: fallback })
}

router.get('/', async (req, res) => {
  const companyId = parseCompanyId(req.query.companyId)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const { data, pagination } = await userService.listUsers(companyId, {
      page: req.query.page, pageSize: req.query.pageSize, search: req.query.search,
    })
    res.json({ success: true, data, pagination })
  } catch (err) {
    console.error('GET /users failed:', err)
    res.status(500).json({ success: false, error: 'Could not load users' })
  }
})

router.post('/', async (req, res) => {
  const companyId = parseCompanyId(req.body.companyId)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const user = await userService.createUser(companyId, req.body)
    res.status(201).json({ success: true, data: user })
  } catch (err) {
    sendUserError(res, err, 'Could not create user')
  }
})

router.patch('/:id', async (req, res) => {
  const companyId = parseCompanyId(req.body.companyId)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const user = await userService.updateUser(companyId, Number(req.params.id), req.body)
    res.json({ success: true, data: user })
  } catch (err) {
    sendUserError(res, err, 'Could not update user')
  }
})

router.delete('/:id', async (req, res) => {
  const companyId = parseCompanyId(req.query.companyId)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    await userService.deleteUser(companyId, Number(req.params.id))
    res.json({ success: true })
  } catch (err) {
    sendUserError(res, err, 'Could not delete user')
  }
})

module.exports = router
