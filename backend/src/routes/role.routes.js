// backend/src/routes/role.routes.js
// HTTP only - receive, call roleService, respond. Admin manages roles per company
// (the 'admin' role is platform-wide, not scoped to one company - see admin.routes.js).

const express = require('express')
const authMiddleware = require('../middleware/auth')
const { loadAccess, requirePlatformAdmin } = require('../middleware/access')
const roleService = require('../services/role.service')
const { parsePositiveInt } = require('../utils/parse')

const router = express.Router()
router.use(authMiddleware, loadAccess, requirePlatformAdmin)

function sendRoleError(res, err, fallback) {
  if (err.message === 'Role not found') {
    return res.status(404).json({ success: false, error: err.message })
  }
  if (['Role name is required', 'Role name is too long', 'Role description is too long',
    'A role with this name already exists',
    'Cannot delete this role - it is assigned to one or more users',
    'Cannot delete this role - it has permissions granted on one or more ACLs'].includes(err.message)) {
    return res.status(400).json({ success: false, error: err.message })
  }
  return res.status(500).json({ success: false, error: fallback })
}

router.get('/', async (req, res) => {
  const companyId = parsePositiveInt(req.query.companyId)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const { data, pagination } = await roleService.listRoles(companyId, {
      page: req.query.page, pageSize: req.query.pageSize, search: req.query.search,
    })
    res.json({ success: true, data, pagination })
  } catch (err) {
    console.error('GET /roles failed:', err)
    res.status(500).json({ success: false, error: 'Could not load roles' })
  }
})

router.get('/:id', async (req, res) => {
  const companyId = parsePositiveInt(req.query.companyId)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const role = await roleService.getRole(companyId, Number(req.params.id))
    res.json({ success: true, data: role })
  } catch (err) {
    sendRoleError(res, err, 'Could not load role')
  }
})

router.get('/:id/users', async (req, res) => {
  const companyId = parsePositiveInt(req.query.companyId)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const { data, pagination } = await roleService.getRoleUsers(companyId, Number(req.params.id), {
      page: req.query.page, pageSize: req.query.pageSize,
    })
    res.json({ success: true, data, pagination })
  } catch (err) {
    sendRoleError(res, err, 'Could not load users for this role')
  }
})

router.post('/', async (req, res) => {
  const companyId = parsePositiveInt(req.body.companyId)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const role = await roleService.createRole(companyId, req.body)
    res.status(201).json({ success: true, data: role })
  } catch (err) {
    sendRoleError(res, err, 'Could not create role')
  }
})

router.patch('/:id', async (req, res) => {
  const companyId = parsePositiveInt(req.body.companyId)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const role = await roleService.updateRole(companyId, Number(req.params.id), req.body)
    res.json({ success: true, data: role })
  } catch (err) {
    sendRoleError(res, err, 'Could not update role')
  }
})

router.delete('/:id', async (req, res) => {
  const companyId = parsePositiveInt(req.query.companyId)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    await roleService.deleteRole(companyId, Number(req.params.id))
    res.json({ success: true })
  } catch (err) {
    sendRoleError(res, err, 'Could not delete role')
  }
})

module.exports = router
