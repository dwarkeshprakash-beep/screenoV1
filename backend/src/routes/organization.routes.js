// backend/src/routes/organization.routes.js
// HTTP only - receive, call organizationService, respond. Admin-only, global
// (organizations/companies are the tenant boundary itself, not scoped under one).

const express = require('express')
const authMiddleware = require('../middleware/auth')
const { loadAccess, requirePlatformAdmin } = require('../middleware/access')
const organizationService = require('../services/organization.service')

const router = express.Router()
router.use(authMiddleware, loadAccess, requirePlatformAdmin)

const BAD_REQUEST_MESSAGES = [
  'Organization name is required',
  'Organization name is too long',
  'Logo URL is too long',
  'An organization with this name already exists',
]

function sendOrganizationError(res, err, fallback) {
  if (err.message === 'Organization not found') {
    return res.status(404).json({ success: false, error: err.message })
  }
  if (err.message === 'Cannot delete this organization - it still has users assigned to it') {
    return res.status(409).json({ success: false, error: err.message })
  }
  if (BAD_REQUEST_MESSAGES.includes(err.message)) {
    return res.status(400).json({ success: false, error: err.message })
  }
  return res.status(500).json({ success: false, error: fallback })
}

router.get('/', async (req, res) => {
  try {
    const { data, pagination } = await organizationService.listOrganizations({
      page: req.query.page, pageSize: req.query.pageSize, search: req.query.search,
    })
    res.json({ success: true, data, pagination })
  } catch (err) {
    console.error('GET /organizations failed:', err)
    res.status(500).json({ success: false, error: 'Could not load organizations' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const organization = await organizationService.getOrganization(Number(req.params.id))
    res.json({ success: true, data: organization })
  } catch (err) {
    sendOrganizationError(res, err, 'Could not load organization')
  }
})

router.get('/:id/summary', async (req, res) => {
  try {
    const summary = await organizationService.getOrganizationSummary(Number(req.params.id))
    res.json({ success: true, data: summary })
  } catch (err) {
    sendOrganizationError(res, err, 'Could not load organization summary')
  }
})

router.post('/', async (req, res) => {
  try {
    const organization = await organizationService.createOrganization(req.body)
    res.status(201).json({ success: true, data: organization })
  } catch (err) {
    sendOrganizationError(res, err, 'Could not create organization')
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const organization = await organizationService.updateOrganization(Number(req.params.id), req.body)
    res.json({ success: true, data: organization })
  } catch (err) {
    sendOrganizationError(res, err, 'Could not update organization')
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await organizationService.deleteOrganization(Number(req.params.id))
    res.json({ success: true })
  } catch (err) {
    sendOrganizationError(res, err, 'Could not delete organization')
  }
})

module.exports = router
