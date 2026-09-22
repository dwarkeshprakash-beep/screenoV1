// backend/src/routes/permission.routes.js
// HTTP only - receive, call permissionService, respond. Global catalog (not
// per-company), admin-only, add-only (no update/delete). See docs/rbac-multi-tenant-plan.md.

const express = require('express')
const authMiddleware = require('../middleware/auth')
const { loadAccess, requirePlatformAdmin } = require('../middleware/access')
const permissionService = require('../services/permission.service')

const router = express.Router()
router.use(authMiddleware, loadAccess, requirePlatformAdmin)

const BAD_REQUEST_MESSAGES = [
  'Permission name is required',
  'Permission name is too long',
  'Permission description is too long',
  'A permission with this name already exists',
]

function sendPermissionError(res, err, fallback) {
  if (err.message === 'Permission not found') {
    return res.status(404).json({ success: false, error: err.message })
  }
  if (BAD_REQUEST_MESSAGES.includes(err.message)) {
    return res.status(400).json({ success: false, error: err.message })
  }
  return res.status(500).json({ success: false, error: fallback })
}

router.get('/', async (req, res) => {
  try {
    const data = await permissionService.listPermissions()
    res.json({ success: true, data })
  } catch (err) {
    console.error('GET /permissions failed:', err)
    res.status(500).json({ success: false, error: 'Could not load permissions' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const permission = await permissionService.getPermission(Number(req.params.id))
    res.json({ success: true, data: permission })
  } catch (err) {
    sendPermissionError(res, err, 'Could not load permission')
  }
})

router.get('/:id/roles', async (req, res) => {
  try {
    const data = await permissionService.getPermissionGrants(Number(req.params.id))
    res.json({ success: true, data })
  } catch (err) {
    sendPermissionError(res, err, 'Could not load roles for this permission')
  }
})

router.post('/', async (req, res) => {
  try {
    const permission = await permissionService.createPermission(req.body)
    res.status(201).json({ success: true, data: permission })
  } catch (err) {
    sendPermissionError(res, err, 'Could not create permission')
  }
})

module.exports = router
