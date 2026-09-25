// backend/src/services/admin.service.js
// Platform-admin inspection and emergency repair controls (see admin.routes.js).
// Expected failures throw with err.httpStatus set and a user-facing message.
const accessService = require('./access.service')
const mandateLifecycleService = require('./mandate-lifecycle.service')
const companyRepository = require('../repositories/company.repository')
const clientTemplateRepository = require('../repositories/client-template.repository')
const userRepository = require('../repositories/user.repository')
const adminRepository = require('../repositories/admin.repository')

const INTERVIEW_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled', 'expired']
const CLIENT_TEAM_STATUSES = ['prospect', 'shortlisted', 'interviewing', 'hired', 'rejected', 'withdrawn']

function adminError(httpStatus, message) {
  const err = new Error(message)
  err.httpStatus = httpStatus
  return err
}

function assertValidStatus(status, validStatuses) {
  if (!validStatuses.includes(status)) {
    throw adminError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`)
  }
}

async function listCompanies() {
  return companyRepository.getAll()
}

async function listMandates() {
  return clientTemplateRepository.getAllForAdmin()
}

// Move a mandate to another user in the same organization who can own client mandates.
async function reassignMandate(mandateId, newManagerId) {
  const newManager = await userRepository.getById(newManagerId)
  if (!newManager) throw adminError(404, 'Manager not found')

  const targetAccess = await accessService.getUserAccessContext(newManagerId)
  if (!accessService.hasModulePermission(targetAccess, 'client_mandates', 'Save')) {
    throw adminError(400, 'Target user cannot own client mandates')
  }

  const mandate = await clientTemplateRepository.getById(mandateId, newManager.company_id)
  if (!mandate) throw adminError(404, 'Mandate not found or not in same organization')

  return clientTemplateRepository.update(mandateId, newManagerId, { manager_id: newManagerId })
}

async function setMandateArchived(mandateId, archived) {
  const updated = await adminRepository.setMandateArchived(mandateId, archived)
  if (!updated) throw adminError(404, 'Mandate not found')
  return updated
}

// Permanent delete, guarded by typing the mandate's client name. Returns what was removed.
async function forceDeleteMandate(mandateId, confirmText) {
  const mandate = await adminRepository.getMandateSummary(mandateId)
  if (!mandate) throw adminError(404, 'Mandate not found')
  if (confirmText !== mandate.client_name) {
    throw adminError(400, 'Confirmation text does not match mandate client name')
  }

  const impact = await mandateLifecycleService.getDeletionImpact(mandateId, mandate.manager_id)
  await mandateLifecycleService.permanentlyDeleteMandate(mandateId, mandate.manager_id)
  return { deleted: true, impact }
}

async function listRecentInterviews(status) {
  return adminRepository.getRecentInterviews(status)
}

async function setInterviewStatus(interviewId, status) {
  assertValidStatus(status, INTERVIEW_STATUSES)
  const updated = await adminRepository.setInterviewStatus(interviewId, status)
  if (!updated) throw adminError(404, 'Interview not found')
  return updated
}

async function setClientTeamStatus(clientTeamId, status, notes) {
  assertValidStatus(status, CLIENT_TEAM_STATUSES)
  const updated = await adminRepository.setClientTeamStatus(clientTeamId, status, notes)
  if (!updated) throw adminError(404, 'Client team member not found')
  return updated
}

// requirementId null clears the link; otherwise it must belong to the member's mandate.
async function reassignClientTeamRequirement(clientTeamId, requirementId) {
  const current = await adminRepository.getClientTeamMandate(clientTeamId)
  if (!current) throw adminError(404, 'Client team member not found')

  if (requirementId) {
    const belongs = await adminRepository.requirementBelongsToMandate(requirementId, current.mandate_id)
    if (!belongs) throw adminError(400, 'Requirement does not belong to this mandate')
  }

  return adminRepository.setClientTeamRequirement(clientTeamId, requirementId)
}

// Data-integrity checks. Only checks that found something are included.
async function findBrokenStates() {
  const checks = [
    {
      type: 'orphaned_mandates',
      load: adminRepository.getOrphanedMandates,
      description: 'Mandates with deleted or missing managers',
    },
    {
      type: 'invalid_requirements',
      load: adminRepository.getInvalidRequirementLinks,
      description: 'Client team members with invalid requirement references',
    },
    {
      type: 'stuck_interviews',
      load: adminRepository.getStuckInterviews,
      description: 'Interviews stuck in progress for over 7 days',
    },
  ]

  const issues = []
  for (const check of checks) {
    const items = await check.load()
    if (items.length > 0) {
      issues.push({ type: check.type, count: items.length, items, description: check.description })
    }
  }
  return { issueCount: issues.length, issues }
}

module.exports = {
  listCompanies,
  listMandates,
  reassignMandate,
  setMandateArchived,
  forceDeleteMandate,
  listRecentInterviews,
  setInterviewStatus,
  setClientTeamStatus,
  reassignClientTeamRequirement,
  findBrokenStates,
}
