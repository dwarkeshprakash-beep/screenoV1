// backend/src/routes/acl.routes.js
// HTTP only - receive, call aclService, respond. Admin manages ACLs per company
// (the 'admin' role is platform-wide - see admin.routes.js / role.routes.js for the same pattern).

const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const aclService = require('../services/acl.service')

const router = express.Router()
router.use(authMiddleware, requireRole('admin'))

const BAD_REQUEST_MESSAGES = [
  'ACL name is required',
  'ACL name is too long',
  'ACL description is too long',
  'A module is required',
  'Selected module does not exist',
  'This module already has an ACL for this company',
  'An ACL with this name already exists',
  'One or more roles are invalid for this company',
  'One or more permissions are invalid',
]

function parseCompanyId(rawValue) {
  const companyId = Number(rawValue)
  return Number.isInteger(companyId) && companyId > 0 ? companyId : null
}

function sendAclError(res, err, fallback) {
  if (err.message === 'ACL not found') {
    return res.status(404).json({ success: false, error: err.message })
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
    const { data, pagination } = await aclService.listAcls(companyId, {
      page: req.query.page, pageSize: req.query.pageSize, search: req.query.search,
    })
    res.json({ success: true, data, pagination })
  } catch (err) {
    console.error('GET /acls failed:', err)
    res.status(500).json({ success: false, error: 'Could not load ACLs' })
  }
})

// Static path - must come before GET /:id so "modules" isn't parsed as an ACL id.
router.get('/modules', async (req, res) => {
  const companyId = parseCompanyId(req.query.companyId)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const modules = await aclService.listModuleOptions(companyId)
    res.json({ success: true, data: modules })
  } catch (err) {
    console.error('GET /acls/modules failed:', err)
    res.status(500).json({ success: false, error: 'Could not load modules' })
  }
})

router.get('/:id', async (req, res) => {
  const companyId = parseCompanyId(req.query.companyId)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const acl = await aclService.getAcl(companyId, Number(req.params.id))
    res.json({ success: true, data: acl })
  } catch (err) {
    sendAclError(res, err, 'Could not load ACL')
  }
})

router.post('/', async (req, res) => {
  const companyId = parseCompanyId(req.body.companyId)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const acl = await aclService.createAcl(companyId, req.body)
    res.status(201).json({ success: true, data: acl })
  } catch (err) {
    sendAclError(res, err, 'Could not create ACL')
  }
})

router.patch('/:id', async (req, res) => {
  const companyId = parseCompanyId(req.body.companyId)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const acl = await aclService.updateAcl(companyId, Number(req.params.id), req.body)
    res.json({ success: true, data: acl })
  } catch (err) {
    sendAclError(res, err, 'Could not update ACL')
  }
})

router.get('/:id/permissions', async (req, res) => {
  const companyId = parseCompanyId(req.query.companyId)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const data = await aclService.getAclPermissions(companyId, Number(req.params.id))
    res.json({ success: true, data })
  } catch (err) {
    sendAclError(res, err, 'Could not load ACL permissions')
  }
})

router.put('/:id/permissions', async (req, res) => {
  const companyId = parseCompanyId(req.body.companyId)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const data = await aclService.updateAclPermissions(companyId, Number(req.params.id), req.body.grants)
    res.json({ success: true, data })
  } catch (err) {
    sendAclError(res, err, 'Could not update ACL permissions')
  }
})

router.delete('/:id', async (req, res) => {
  const companyId = parseCompanyId(req.query.companyId)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    await aclService.deleteAcl(companyId, Number(req.params.id))
    res.json({ success: true })
  } catch (err) {
    sendAclError(res, err, 'Could not delete ACL')
  }
})

module.exports = router
