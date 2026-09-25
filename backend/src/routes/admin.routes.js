// backend/src/routes/admin.routes.js
// Admin-only system inspection and emergency controls.

const express = require('express')
const authMiddleware = require('../middleware/auth')
const { loadAccess, requirePlatformAdmin } = require('../middleware/access')
const accessService = require('../services/access.service')
const mandateLifecycleService = require('../services/mandate-lifecycle.service')
const userService = require('../services/user.service')
const companyRepository = require('../repositories/company.repository')
const clientTemplateRepository = require('../repositories/client-template.repository')
const userRepository = require('../repositories/user.repository')
const adminRepository = require('../repositories/admin.repository')

const router = express.Router()
router.use(authMiddleware, loadAccess, requirePlatformAdmin)

// Company picker for admin screens that manage per-company data (e.g. Roles).
router.get('/companies', async (req, res) => {
  try {
    const companies = await companyRepository.getAll()
    res.json({ success: true, data: companies })
  } catch (err) {
    console.error('[Admin] GET /companies failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not load organizations' })
  }
})

router.get('/mandates', async (req, res) => {
  try {
    const mandates = await clientTemplateRepository.getAllForAdmin()
    res.json({ success: true, data: mandates })
  } catch (err) {
    console.error('[Admin] GET /mandates failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not load mandates' })
  }
})

router.patch('/mandates/:id/reassign', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const newManagerId = Number(req.body.newManagerId)
    if (!Number.isInteger(newManagerId)) {
      return res.status(400).json({ success: false, error: 'newManagerId is required' })
    }

    const newManager = await userRepository.getById(newManagerId)
    if (!newManager) {
      return res.status(404).json({ success: false, error: 'Manager not found' })
    }

    const targetAccess = await accessService.getUserAccessContext(newManagerId)
    if (!accessService.hasModulePermission(targetAccess, 'client_mandates', 'Save')) {
      return res.status(400).json({ success: false, error: 'Target user cannot own client mandates' })
    }

    const mandate = await clientTemplateRepository.getById(mandateId, newManager.company_id)
    if (!mandate) {
      return res.status(404).json({ success: false, error: 'Mandate not found or not in same organization' })
    }

    const updated = await clientTemplateRepository.update(mandateId, newManagerId, { manager_id: newManagerId })
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[Admin] PATCH /mandates/:id/reassign failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not reassign mandate' })
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
    const mandateId = parseInt(req.params.id, 10)
    const { archived } = req.body
    if (typeof archived !== 'boolean') {
      return res.status(400).json({ success: false, error: 'archived must be boolean' })
    }

    const updated = await adminRepository.setMandateArchived(mandateId, archived)
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Mandate not found' })
    }
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[Admin] PATCH /mandates/:id/force-status failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not update mandate status' })
  }
})

router.delete('/mandates/:id/force-delete', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const mandate = await adminRepository.getMandateSummary(mandateId)
    if (!mandate) {
      return res.status(404).json({ success: false, error: 'Mandate not found' })
    }
    if (req.body.confirmText !== mandate.client_name) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation text does not match mandate client name',
      })
    }

    const impact = await mandateLifecycleService.getDeletionImpact(mandateId, mandate.manager_id)
    await mandateLifecycleService.permanentlyDeleteMandate(mandateId, mandate.manager_id)
    res.json({ success: true, data: { deleted: true, impact } })
  } catch (err) {
    console.error('[Admin] DELETE /mandates/:id/force-delete failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not force-delete mandate' })
  }
})

router.get('/interviews', async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status) : null
    const interviews = await adminRepository.getRecentInterviews(status)
    res.json({ success: true, data: interviews })
  } catch (err) {
    console.error('[Admin] GET /interviews failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not load interviews' })
  }
})

router.patch('/interviews/:id/force-status', async (req, res) => {
  try {
    const interviewId = parseInt(req.params.id, 10)
    const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled', 'expired']
    if (!validStatuses.includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      })
    }

    const updated = await adminRepository.setInterviewStatus(interviewId, req.body.status)
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Interview not found' })
    }
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[Admin] PATCH /interviews/:id/force-status failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not update interview status' })
  }
})

router.patch('/client-teams/:id/force-status', async (req, res) => {
  try {
    const clientTeamId = parseInt(req.params.id, 10)
    const validStatuses = ['prospect', 'shortlisted', 'interviewing', 'hired', 'rejected', 'withdrawn']
    if (!validStatuses.includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      })
    }

    const updated = await adminRepository.setClientTeamStatus(clientTeamId, req.body.status, req.body.notes || null)
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Client team member not found' })
    }
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[Admin] PATCH /client-teams/:id/force-status failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not update client team status' })
  }
})

router.post('/client-teams/:id/reassign-requirement', async (req, res) => {
  try {
    const clientTeamId = parseInt(req.params.id, 10)
    const requirementId = req.body.requirementId ? Number(req.body.requirementId) : null
    const current = await adminRepository.getClientTeamMandate(clientTeamId)
    if (!current) {
      return res.status(404).json({ success: false, error: 'Client team member not found' })
    }

    if (requirementId) {
      const belongs = await adminRepository.requirementBelongsToMandate(requirementId, current.mandate_id)
      if (!belongs) {
        return res.status(400).json({ success: false, error: 'Requirement does not belong to this mandate' })
      }
    }

    const updated = await adminRepository.setClientTeamRequirement(clientTeamId, requirementId)
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[Admin] POST /client-teams/:id/reassign-requirement failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not reassign requirement' })
  }
})

router.get('/broken-states', async (req, res) => {
  try {
    const issues = []

    const orphanedMandates = await adminRepository.getOrphanedMandates()
    if (orphanedMandates.length > 0) {
      issues.push({
        type: 'orphaned_mandates',
        count: orphanedMandates.length,
        items: orphanedMandates,
        description: 'Mandates with deleted or missing managers',
      })
    }

    const invalidRequirements = await adminRepository.getInvalidRequirementLinks()
    if (invalidRequirements.length > 0) {
      issues.push({
        type: 'invalid_requirements',
        count: invalidRequirements.length,
        items: invalidRequirements,
        description: 'Client team members with invalid requirement references',
      })
    }

    const stuckInterviews = await adminRepository.getStuckInterviews()
    if (stuckInterviews.length > 0) {
      issues.push({
        type: 'stuck_interviews',
        count: stuckInterviews.length,
        items: stuckInterviews,
        description: 'Interviews stuck in progress for over 7 days',
      })
    }

    res.json({ success: true, data: { issueCount: issues.length, issues } })
  } catch (err) {
    console.error('[Admin] GET /broken-states failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not check for broken states' })
  }
})

module.exports = router
