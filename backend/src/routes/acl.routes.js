// backend/src/routes/acl.routes.js
// HTTP only - receive, call aclService, respond. Delegable per company via the
// 'acls' module (a platform admin acts on any company via ?companyId=, a
// company-scoped sub-admin is always forced to their own - see scopedCompanyId).

const express = require('express')
const authMiddleware = require('../middleware/auth')
const { loadAccess, requireModule, scopedCompanyId } = require('../middleware/access')
const aclService = require('../services/acl.service')

const router = express.Router()
router.use(authMiddleware, loadAccess, requireModule('acls'))

const BAD_REQUEST_MESSAGES = [
  'ACL name is required',
  'ACL name is too long',
  'ACL description is too long',
  'An ACL with this name already exists',
  'One or more roles are invalid for this organization',
  'One or more permissions are invalid',
]

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
  const companyId = scopedCompanyId(req)
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

router.get('/:id', async (req, res) => {
  const companyId = scopedCompanyId(req)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const acl = await aclService.getAcl(companyId, Number(req.params.id))
    res.json({ success: true, data: acl })
  } catch (err) {
    sendAclError(res, err, 'Could not load ACL')
  }
})

router.post('/', async (req, res) => {
  const companyId = scopedCompanyId(req)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const acl = await aclService.createAcl(companyId, req.body)
    res.status(201).json({ success: true, data: acl })
  } catch (err) {
    sendAclError(res, err, 'Could not create ACL')
  }
})

router.patch('/:id', async (req, res) => {
  const companyId = scopedCompanyId(req)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const acl = await aclService.updateAcl(companyId, Number(req.params.id), req.body)
    res.json({ success: true, data: acl })
  } catch (err) {
    sendAclError(res, err, 'Could not update ACL')
  }
})

router.get('/:id/permissions', async (req, res) => {
  const companyId = scopedCompanyId(req)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const data = await aclService.getAclPermissions(companyId, Number(req.params.id))
    res.json({ success: true, data })
  } catch (err) {
    sendAclError(res, err, 'Could not load ACL permissions')
  }
})

router.put('/:id/permissions', async (req, res) => {
  const companyId = scopedCompanyId(req)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    const data = await aclService.updateAclPermissions(companyId, Number(req.params.id), req.body.grants)
    res.json({ success: true, data })
  } catch (err) {
    sendAclError(res, err, 'Could not update ACL permissions')
  }
})

router.delete('/:id', async (req, res) => {
  const companyId = scopedCompanyId(req)
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' })

  try {
    await aclService.deleteAcl(companyId, Number(req.params.id))
    res.json({ success: true })
  } catch (err) {
    sendAclError(res, err, 'Could not delete ACL')
  }
})

module.exports = router
