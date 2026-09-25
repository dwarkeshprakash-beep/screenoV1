// backend/src/services/client-mandate.service.js
// Client mandates (client_templates): access checks, create/update with owner and
// collaborator (BDE) assignment, listing, archive/restore, delete, and status.
// Expected failures throw with err.httpStatus set and a user-facing message.
//
// `viewer` = { userId, companyId, accessCompanyId, viewAll } - built from the request:
// companyId is the JWT's, accessCompanyId the live RBAC one, viewAll the "View All"
// permission on client_mandates.
const clientTemplateRepo = require('../repositories/client-template.repository')
const clientRequirementsRepo = require('../repositories/client-mandate-requirements.repository')
const userRepository = require('../repositories/user.repository')
const accessService = require('./access.service')
const emailService = require('./email.service')
const llmService = require('./llm.service')
const storageService = require('./storage.service')
const mandateLifecycleService = require('./mandate-lifecycle.service')
const mandateStatusService = require('./mandate-status.service')
const requirementsService = require('./client-mandate-requirements.service')

const MANDATE_STATES = ['active', 'archived', 'all']
// A non-owner collaborator may only change these fields through updateMandate.
const COLLABORATOR_EDITABLE_FIELDS = new Set(['jd_text', 'jd_file_path', 'jd_original_filename', 'tags'])

function httpError(httpStatus, message) {
  const err = new Error(message)
  err.httpStatus = httpStatus
  return err
}

function isProvided(value) {
  return value !== undefined && value !== null && value !== ''
}

function fullName(user) {
  return `${user.first_name} ${user.last_name}`.trim()
}

// ── Access ────────────────────────────────────────────────────────────────────

// View All sees any mandate in the company; plain View is self-scoped (owner, creator,
// assigned collaborator, or a client_teams participant). Downstream repo calls that
// filter by manager_id must use the returned template's manager_id (the real owner),
// never the viewer's id, since the viewer isn't necessarily the owning manager.
async function loadMandateForViewer(mandateId, viewer) {
  return viewer.viewAll
    ? clientTemplateRepo.getByIdForCompany(mandateId, viewer.accessCompanyId)
    : clientTemplateRepo.getByIdVisibleToUser(mandateId, viewer.userId)
}

async function getVisibleMandate(mandateId, viewer, notFoundMessage = 'Mandate not found') {
  const template = await loadMandateForViewer(mandateId, viewer)
  if (!template) throw httpError(404, notFoundMessage)
  return template
}

// Owner-only actions: the mandate must belong to managerId.
async function getOwnedMandate(mandateId, managerId, notFoundMessage = 'Mandate not found') {
  const template = await clientTemplateRepo.getById(mandateId, managerId)
  if (!template) throw httpError(404, notFoundMessage)
  return template
}

function assertNotArchived(template) {
  if (template.archived_at) throw httpError(409, 'Mandate is archived and read-only')
}

// Visible to the viewer and not archived - for edits a collaborator may make.
async function getEditableVisibleMandate(mandateId, viewer, notFoundMessage) {
  const template = await getVisibleMandate(mandateId, viewer, notFoundMessage)
  assertNotArchived(template)
  return template
}

// Owned by managerId and not archived - for owner-only edits.
async function getEditableOwnedMandate(mandateId, managerId, notFoundMessage) {
  const template = await getOwnedMandate(mandateId, managerId, notFoundMessage)
  assertNotArchived(template)
  return template
}

// Looks up the target user's own access fresh (never the caller's) - the target is a
// different user from the one making the request.
async function targetHasMandatePermission(userId, permissionName) {
  const access = await accessService.getUserAccessContext(userId)
  return accessService.hasModulePermission(access, 'client_mandates', permissionName)
}

async function targetCanViewMandates(userId) {
  const access = await accessService.getUserAccessContext(userId)
  return accessService.hasAnyViewPermission(access, 'client_mandates')
}

// A collaborator (BDE) pick: must be a user in the organization who can view mandates.
async function resolveAssignedBde(rawBdeId, companyId) {
  const assignedBdeId = parseInt(rawBdeId, 10)
  if (!Number.isInteger(assignedBdeId)) throw httpError(400, 'Select a valid BDE to assign')
  const targetBde = await userRepository.getByIdForCompany(assignedBdeId, companyId)
  if (!targetBde || !(await targetCanViewMandates(assignedBdeId))) {
    throw httpError(400, 'Select a valid BDE in your organization')
  }
  return { assignedBdeId, targetBde }
}

// ── Notifications (fire-and-forget) ───────────────────────────────────────────

async function notifyAssignedManager(assignedManager, template, viewer) {
  const bde = await userRepository.getByIdForCompany(viewer.userId, viewer.companyId)
  emailService.sendMandateAssigned(assignedManager.email, {
    managerName: fullName(assignedManager),
    bdeName: bde ? fullName(bde) : 'A BDE teammate',
    clientName: template.client_name,
    requirements: template.requirements,
    headcount: template.headcount,
    mandateId: template.id,
  }).catch(err => console.error('sendMandateAssigned failed:', err.message))
}

async function notifyAssignedBde(assignedBde, template, viewer) {
  const manager = await userRepository.getByIdForCompany(viewer.userId, viewer.companyId)
  emailService.sendMandateAssignedToBde(assignedBde.email, {
    bdeName: fullName(assignedBde),
    managerName: manager ? fullName(manager) : 'A manager',
    clientName: template.client_name,
    requirements: template.requirements,
    headcount: template.headcount,
    mandateId: template.id,
  }).catch(err => console.error('sendMandateAssignedToBde failed:', err.message))
}

// ── Mandate CRUD ──────────────────────────────────────────────────────────────

/**
 * Create a mandate. Ownership is symmetric: whoever is named as the mandate's manager
 * (defaults to the caller) needs Save on client_mandates to own it; a second, independent
 * collaborator can optionally be attached via assigned_bde_id and only needs View.
 */
async function createMandate(body, viewer) {
  const requirementProfiles = requirementsService.normalizeRequirementProfiles(
    body.requirement_profiles ?? body.requirementProfiles
  ) || []
  const data = { ...body }
  delete data.requirement_profiles
  delete data.requirementProfiles
  delete data.assigned_manager_id
  delete data.assignedManagerId
  delete data.assigned_bde_id
  delete data.assignedBdeId

  let assignedManager = null
  let assignedBde = null
  const rawManagerId = body.assigned_manager_id ?? body.assignedManagerId
  if (isProvided(rawManagerId)) {
    const assignedManagerId = parseInt(rawManagerId, 10)
    if (!Number.isInteger(assignedManagerId)) {
      throw httpError(400, 'Select a valid manager to assign this mandate to')
    }
    const targetManager = await userRepository.getByIdForCompany(assignedManagerId, viewer.companyId)
    if (!targetManager || !(await targetHasMandatePermission(assignedManagerId, 'Save'))) {
      throw httpError(400, 'Select a valid manager in your organization')
    }
    data.manager_id = assignedManagerId
    assignedManager = targetManager
  } else {
    data.manager_id = viewer.userId
  }
  data.created_by_user_id = viewer.userId

  const rawBdeId = body.assigned_bde_id ?? body.assignedBdeId
  if (isProvided(rawBdeId)) {
    const { assignedBdeId, targetBde } = await resolveAssignedBde(rawBdeId, viewer.companyId)
    data.assigned_bde_id = assignedBdeId
    assignedBde = targetBde
  }

  if (requirementProfiles.length > 0) {
    data.headcount = requirementsService.requirementHeadcount(requirementProfiles)
    if (!String(data.requirements || '').trim()) {
      data.requirements = requirementsService.requirementSummary(requirementProfiles)
    }
    await requirementsService.tagRequirementProfiles(requirementProfiles)
  }
  if (data.jd_text) data.tags = await requirementsService.tagsForJd(data.jd_text, data.tags)

  const template = await clientTemplateRepo.create(data)
  await mandateStatusService.recordCreated(template.id, template.created_by_user_id, template.manager_id)
  const savedProfiles = requirementProfiles.length > 0
    ? await requirementsService.syncRequirementProfiles(template.id, template.manager_id, requirementProfiles)
    : []

  if (assignedManager) await notifyAssignedManager(assignedManager, template, viewer)
  if (assignedBde) await notifyAssignedBde(assignedBde, template, viewer)

  return { ...template, requirement_profiles: savedProfiles }
}

async function listMandates(viewer, requestedState) {
  const state = MANDATE_STATES.includes(requestedState) ? requestedState : 'active'
  return viewer.viewAll
    ? clientTemplateRepo.getByCompany(viewer.accessCompanyId, state)
    : clientTemplateRepo.getVisibleToUser(viewer.userId, state)
}

// Users who can own mandates (Save), for the manager picker.
async function listManagers(companyId) {
  return userRepository.getByModulePermission(companyId, 'client_mandates', 'Save')
}

// Users who can view mandates, for the collaborator (BDE) picker.
async function listBdes(companyId) {
  return userRepository.getByModulePermission(companyId, 'client_mandates', ['View', 'View All'])
}

// Returns null when the manager does not own the mandate.
async function archiveMandate(mandateId, managerId) {
  return clientTemplateRepo.archive(mandateId, managerId)
}

async function restoreMandate(mandateId, managerId) {
  return clientTemplateRepo.restore(mandateId, managerId)
}

// preview=true returns the deletion impact only. Refuses while interviews are in progress.
async function deleteMandate(mandateId, managerId, preview) {
  const impact = await mandateLifecycleService.getDeletionImpact(mandateId, managerId)
  if (preview) return impact
  if (!impact.canDelete) throw httpError(409, 'Cannot delete mandate while interviews are in_progress')
  await mandateLifecycleService.permanentlyDeleteMandate(mandateId, managerId)
  return { deleted: true }
}

async function getMandate(mandateId, viewer) {
  const template = await getVisibleMandate(mandateId, viewer, 'Template not found')
  if (template.jd_file_path) {
    template.jd_file_url = await storageService.getSignedUrl(template.jd_file_path).catch(() => null)
  }
  return template
}

async function getMandateStatus(mandateId, viewer) {
  await getVisibleMandate(mandateId, viewer)
  return mandateStatusService.getSummary(mandateId)
}

// Manual override for mandates the auto-complete check won't catch (e.g. cancelled,
// or the position was filled without every candidate reaching a final client outcome).
// Owning-manager only - a collaborator cannot change mandate state.
async function completeMandate(mandateId, managerId) {
  await getOwnedMandate(mandateId, managerId)
  await mandateStatusService.recordCompleted(mandateId, managerId)
  return mandateStatusService.getSummary(mandateId)
}

/**
 * Update a mandate. The owner may change everything, including a bulk replace of the
 * requirement profiles; a non-owner collaborator may only change the JD fields (they
 * edit profiles one at a time through the requirements endpoints instead).
 */
async function updateMandate(mandateId, body, viewer) {
  const existing = await getVisibleMandate(mandateId, viewer, 'Template not found')
  assertNotArchived(existing)
  // The real owning manager - every downstream call scoped by manager_id must use this.
  const ownerManagerId = existing.manager_id
  const isOwner = existing.manager_id === viewer.userId

  const requirementProfiles = isOwner
    ? requirementsService.normalizeRequirementProfiles(body.requirement_profiles ?? body.requirementProfiles)
    : null
  const data = { ...body }
  delete data.requirement_profiles
  delete data.requirementProfiles
  if (!isOwner) {
    for (const key of Object.keys(data)) {
      if (!COLLABORATOR_EDITABLE_FIELDS.has(key)) delete data[key]
    }
  }
  if (requirementProfiles?.length) {
    data.headcount = requirementsService.requirementHeadcount(requirementProfiles)
    data.requirements = requirementsService.requirementSummary(requirementProfiles)
    await requirementsService.tagRequirementProfiles(requirementProfiles)
  }
  const jdChanged = data.jd_text !== undefined
    && String(data.jd_text || '').trim()
    && String(data.jd_text || '') !== String(existing.jd_text || '')
  if (jdChanged) data.tags = await requirementsService.tagsForJd(data.jd_text, data.tags)

  let assignedBde = null
  if (isOwner) {
    const rawBdeId = body.assigned_bde_id ?? body.assignedBdeId
    if (isProvided(rawBdeId)) {
      const { assignedBdeId, targetBde } = await resolveAssignedBde(rawBdeId, viewer.companyId)
      data.assigned_bde_id = assignedBdeId
      if (Number(existing.assigned_bde_id) !== assignedBdeId) assignedBde = targetBde
    } else {
      delete data.assigned_bde_id
    }
  }

  const template = await clientTemplateRepo.update(mandateId, ownerManagerId, data)
  if (!template) throw httpError(404, 'Template not found')

  if (assignedBde) await notifyAssignedBde(assignedBde, template, viewer)
  // client_templates.update() COALESCEs jd_file_path, so it only ever really changes
  // when the new value is truthy - a null/empty value here is a no-op in the DB.
  if (data.jd_file_path) requirementsService.cleanupReplacedJdFile(existing.jd_file_path, data.jd_file_path)
  const savedProfiles = requirementProfiles
    ? await requirementsService.syncRequirementProfiles(mandateId, ownerManagerId, requirementProfiles)
    : await clientRequirementsRepo.getByMandate(mandateId)
  const updatedTemplate = await clientTemplateRepo.getById(mandateId, ownerManagerId)
  return { ...(updatedTemplate || template), requirement_profiles: savedProfiles }
}

async function extractTags(text) {
  return llmService.extractTagsFromText(text)
}

module.exports = {
  getVisibleMandate,
  getOwnedMandate,
  getEditableVisibleMandate,
  getEditableOwnedMandate,
  createMandate,
  listMandates,
  listManagers,
  listBdes,
  archiveMandate,
  restoreMandate,
  deleteMandate,
  getMandate,
  getMandateStatus,
  completeMandate,
  updateMandate,
  extractTags,
}
