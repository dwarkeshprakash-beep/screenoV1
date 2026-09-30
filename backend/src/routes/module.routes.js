// backend/src/routes/module.routes.js
// HTTP only - receive, call moduleService, respond. Modules are seeded by migration and
// mostly fixed - the key can never change, but the display name can be renamed here.
// Admin-only. This is also where an ACL gets linked to the module it gates - see
// moduleService.assignAcl.

const express = require('express')
const authMiddleware = require('../middleware/auth')
const { loadAccess, requirePlatformAdmin } = require('../middleware/access')
const moduleService = require('../services/module.service')
const { parsePositiveInt } = require('../utils/parse')

const router = express.Router()
router.use(authMiddleware, loadAccess, requirePlatformAdmin)

const BAD_REQUEST_MESSAGES = [
  'Module name is required',
  'Module name is too long',
  'companyId is required',
  'aclId is required',
  'This module already has an ACL assigned',
  'Selected ACL is invalid',
  'This ACL is already associated with a module',
]

function sendModuleError(res, err, fallback) {
  if (err.message === 'Module not found') {
    return res.status(404).json({ success: false, error: err.message })
  }
  if (BAD_REQUEST_MESSAGES.includes(err.message)) {
    return res.status(400).json({ success: false, error: err.message })
  }
  return res.status(500).json({ success: false, error: fallback })
}

router.get('/', async (req, res) => {
  try {
    const modules = await moduleService.listModules(parsePositiveInt(req.query.companyId))
    res.json({ success: true, data: modules })
  } catch (err) {
    console.error('GET /modules failed:', err)
    res.status(500).json({ success: false, error: 'Could not load modules' })
  }
})

router.get('/unassigned-acls', async (req, res) => {
  const companyId = parsePositiveInt(req.query.companyId)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const acls = await moduleService.listUnassignedAcls(companyId)
    res.json({ success: true, data: acls })
  } catch (err) {
    console.error('GET /modules/unassigned-acls failed:', err)
    res.status(500).json({ success: false, error: 'Could not load unassigned ACLs' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const module_ = await moduleService.updateModule(Number(req.params.id), req.body)
    res.json({ success: true, data: module_ })
  } catch (err) {
    sendModuleError(res, err, 'Could not update module')
  }
})

router.post('/:id/assign-acl', async (req, res) => {
  const companyId = parsePositiveInt(req.body.companyId)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })
  const aclId = Number(req.body.aclId)
  if (!Number.isInteger(aclId) || aclId <= 0) return res.status(400).json({ success: false, error: 'aclId is required' })

  try {
    const acl = await moduleService.assignAcl(Number(req.params.id), companyId, aclId)
    res.json({ success: true, data: acl })
  } catch (err) {
    sendModuleError(res, err, 'Could not assign ACL to module')
  }
})

module.exports = router
