// backend/src/routes/organization.routes.js
// HTTP only - receive, call organizationService, respond. Listing every tenant,
// creating one, and deleting one stay platform-admin-only (a brand-new/removed
// company isn't "scoped" to anyone yet). Viewing/editing a single organization is
// delegable via the 'organizations' module - a company-scoped sub-admin can reach
// it, but only for their own company (organizationService enforces that - see
// assertOwnCompany).

const express = require('express')
const authMiddleware = require('../middleware/auth')
const { loadAccess, requirePlatformAdmin, requireModule } = require('../middleware/access')
const organizationService = require('../services/organization.service')

const router = express.Router()
router.use(authMiddleware, loadAccess)

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

router.get('/', requirePlatformAdmin, async (req, res) => {
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

router.get('/:id', requireModule('organizations'), async (req, res) => {
  try {
    const organization = await organizationService.getOrganization(Number(req.params.id), req.access)
    res.json({ success: true, data: organization })
  } catch (err) {
    sendOrganizationError(res, err, 'Could not load organization')
  }
})

router.get('/:id/summary', requireModule('organizations'), async (req, res) => {
  try {
    const summary = await organizationService.getOrganizationSummary(Number(req.params.id), req.access)
    res.json({ success: true, data: summary })
  } catch (err) {
    sendOrganizationError(res, err, 'Could not load organization summary')
  }
})

router.post('/', requirePlatformAdmin, async (req, res) => {
  try {
    const organization = await organizationService.createOrganization(req.body)
    res.status(201).json({ success: true, data: organization })
  } catch (err) {
    sendOrganizationError(res, err, 'Could not create organization')
  }
})

router.patch('/:id', requireModule('organizations'), async (req, res) => {
  try {
    const organization = await organizationService.updateOrganization(Number(req.params.id), req.body, req.access)
    res.json({ success: true, data: organization })
  } catch (err) {
    sendOrganizationError(res, err, 'Could not update organization')
  }
})

router.delete('/:id', requirePlatformAdmin, async (req, res) => {
  try {
    await organizationService.deleteOrganization(Number(req.params.id))
    res.json({ success: true })
  } catch (err) {
    sendOrganizationError(res, err, 'Could not delete organization')
  }
})

module.exports = router
