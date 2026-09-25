// backend/src/services/client-mandate-requirements.service.js
// Requirement profiles (roles) on a client mandate: payload validation, per-profile CRUD,
// bulk sync from the mandate form, and keeping the mandate's headcount/requirements
// summary in step with its profiles.
// Expected failures throw with err.httpStatus set and a user-facing message.
const clientTemplateRepo = require('../repositories/client-template.repository')
const clientRequirementsRepo = require('../repositories/client-mandate-requirements.repository')
const clientTeamRepo = require('../repositories/client-team.repository')
const llmService = require('./llm.service')
const storageService = require('./storage.service')
const { parseStoredArray } = require('../utils/parse')

function httpError(httpStatus, message) {
  const err = new Error(message)
  err.httpStatus = httpStatus
  return err
}

function hasTags(value) {
  return parseStoredArray(value).some(tag => String(tag || '').trim())
}

// AI tags for a JD, unless usable tags were supplied with it.
async function tagsForJd(jdText, tags) {
  if (!jdText || (tags && hasTags(tags))) return tags
  return llmService.extractTagsFromText(jdText)
}

function optionalYear(value) {
  if (value === '' || value === undefined || value === null) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw httpError(400, 'Experience years must be a non-negative whole number')
  }
  return parsed
}

function optionalDateTime(value) {
  if (value === '' || value === undefined || value === null) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw httpError(400, 'Resume deadline must be a valid date/time')
  }
  return date.toISOString()
}

// Validate one requirement profile from the client (snake_case or camelCase keys).
function normalizeRequirementPayload(input = {}) {
  const profileName = String(input.profile_name ?? input.profileName ?? '').trim()
  if (!profileName) throw httpError(400, 'profile_name is required')
  const yearsMin = optionalYear(input.years_min ?? input.yearsMin)
  const yearsMax = optionalYear(input.years_max ?? input.yearsMax)
  if (yearsMin !== null && yearsMax !== null && yearsMin > yearsMax) {
    throw httpError(400, 'Minimum experience cannot be greater than maximum experience')
  }
  const headcount = Number(input.headcount ?? 1)
  if (!Number.isInteger(headcount) || headcount < 1) {
    throw httpError(400, 'Headcount must be at least 1')
  }
  return {
    id: input.id ? Number(input.id) : null,
    profile_name: profileName,
    years_min: yearsMin,
    years_max: yearsMax,
    headcount,
    notes: String(input.notes || '').trim() || null,
    jd_text: String(input.jd_text ?? input.jdText ?? '').trim() || null,
    jd_file_path: String(input.jd_file_path ?? input.jdFilePath ?? '').trim() || null,
    jd_original_filename: String(input.jd_original_filename ?? input.jdOriginalFilename ?? '').trim() || null,
    resume_deadline: optionalDateTime(input.resume_deadline ?? input.resumeDeadline),
    tags: input.tags || null,
  }
}

// Validate the full profile list from the mandate form. undefined means "not sent" (null).
function normalizeRequirementProfiles(input) {
  if (input === undefined) return null
  if (!Array.isArray(input)) throw httpError(400, 'requirement_profiles must be an array')
  const profiles = input.map(normalizeRequirementPayload)
  const seen = new Set()
  for (const profile of profiles) {
    const key = profile.profile_name.toLowerCase()
    if (seen.has(key)) throw httpError(400, `Duplicate requirement profile: ${profile.profile_name}`)
    seen.add(key)
  }
  return profiles
}

function requirementHeadcount(profiles) {
  return profiles.reduce((sum, profile) => sum + Number(profile.headcount || 0), 0)
}

function requirementSummary(profiles) {
  return profiles.map(profile => profile.profile_name).join(', ')
}

// Fill in AI tags for every profile that has a JD but no usable tags (mutates the profiles).
async function tagRequirementProfiles(profiles) {
  for (const profile of profiles) {
    profile.tags = await tagsForJd(profile.jd_text, profile.tags)
  }
}

async function assertUniqueRequirementName(mandateId, profileName, excludeId = null) {
  const existing = await clientRequirementsRepo.getByMandate(mandateId)
  const duplicate = existing.find(item =>
    String(item.profile_name || '').trim().toLowerCase() === profileName.toLowerCase()
    && Number(item.id) !== Number(excludeId)
  )
  if (duplicate) throw httpError(400, `Requirement profile "${profileName}" already exists`)
}

async function assertRequirementExists(mandateId, requirementId) {
  if (!requirementId) return
  const requirements = await clientRequirementsRepo.getByMandate(mandateId)
  const requirement = requirements.find(item => Number(item.id) === Number(requirementId))
  if (!requirement) throw httpError(404, 'Requirement profile not found on this mandate')
}

// Deletes the previous JD file from storage once it's been replaced by a new upload
// (or removed). Fire-and-forget - never blocks the request on a storage hiccup.
function cleanupReplacedJdFile(oldPath, newPath) {
  if (!oldPath || oldPath === newPath) return
  storageService.deleteFile(oldPath).catch(err => console.error('Failed to clean up replaced JD file:', err.message))
}

// Recompute the mandate's headcount + requirements text from its profiles (when it has any).
async function syncMandateHeadcount(mandateId, managerId) {
  const profiles = await clientRequirementsRepo.getByMandate(mandateId)
  if (profiles.length > 0) {
    await clientTemplateRepo.update(mandateId, managerId, {
      headcount: requirementHeadcount(profiles),
      requirements: requirementSummary(profiles),
    })
  }
  return profiles
}

// Replace the mandate's profiles with the given list: update by id, create new, delete the rest.
async function syncRequirementProfiles(mandateId, managerId, profiles) {
  const existing = await clientRequirementsRepo.getByMandate(mandateId)
  const existingById = new Map(existing.map(item => [Number(item.id), item]))
  const keptIds = new Set()

  for (const profile of profiles) {
    if (profile.id && existingById.has(Number(profile.id))) {
      const previous = existingById.get(Number(profile.id))
      await clientRequirementsRepo.update(profile.id, mandateId, profile)
      cleanupReplacedJdFile(previous.jd_file_path, profile.jd_file_path)
      keptIds.add(Number(profile.id))
    } else {
      await clientRequirementsRepo.create(mandateId, profile)
    }
  }

  await Promise.all(
    existing
      .filter(item => !keptIds.has(Number(item.id)))
      .map(async item => {
        await clientRequirementsRepo.deleteReq(item.id, mandateId)
        cleanupReplacedJdFile(item.jd_file_path, null)
      })
  )

  return syncMandateHeadcount(mandateId, managerId)
}

// ── Per-profile CRUD (mandate access is checked by the caller) ─────────────────

async function listRequirements(mandateId) {
  const requirements = await clientRequirementsRepo.getByMandate(mandateId)
  await Promise.all(requirements.map(async requirement => {
    if (!requirement.jd_file_path) return
    requirement.jd_file_url = await storageService.getSignedUrl(requirement.jd_file_path).catch(() => null)
  }))
  return requirements
}

async function createRequirement(template, input) {
  const payload = normalizeRequirementPayload(input)
  await assertUniqueRequirementName(template.id, payload.profile_name)
  payload.tags = await tagsForJd(payload.jd_text, payload.tags)
  const created = await clientRequirementsRepo.create(template.id, payload)
  await syncMandateHeadcount(template.id, template.manager_id)
  return created
}

async function updateRequirement(template, requirementId, input) {
  const mandateId = template.id
  const payload = normalizeRequirementPayload({ ...input, id: requirementId })
  await assertUniqueRequirementName(mandateId, payload.profile_name, requirementId)

  // Only re-tag when the JD text actually changed.
  const existingReq = await clientRequirementsRepo.getByIdForMandate(requirementId, mandateId)
  const jdChanged = payload.jd_text !== undefined
    && String(payload.jd_text || '').trim()
    && String(payload.jd_text || '') !== String(existingReq.jd_text || '')
  if (jdChanged) payload.tags = await tagsForJd(payload.jd_text, payload.tags)

  const updated = await clientRequirementsRepo.update(requirementId, mandateId, payload)
  if (!updated) throw httpError(404, 'Requirement not found')
  cleanupReplacedJdFile(existingReq.jd_file_path, payload.jd_file_path)
  await syncMandateHeadcount(mandateId, template.manager_id)
  return updated
}

// Profiles still assigned to candidates cannot be deleted.
async function deleteRequirement(template, requirementId) {
  const mandateId = template.id
  const team = await clientTeamRepo.getByMandate(mandateId)
  if (team.some(m => m.requirement_id === requirementId)) {
    throw httpError(409, 'Cannot delete a requirement profile that is assigned to candidates.')
  }

  const deleted = await clientRequirementsRepo.deleteReq(requirementId, mandateId)
  if (!deleted) throw httpError(404, 'Requirement not found')
  cleanupReplacedJdFile(deleted.jd_file_path, null)
  await syncMandateHeadcount(mandateId, template.manager_id)
}

module.exports = {
  hasTags,
  tagsForJd,
  normalizeRequirementProfiles,
  requirementHeadcount,
  requirementSummary,
  tagRequirementProfiles,
  assertRequirementExists,
  cleanupReplacedJdFile,
  syncRequirementProfiles,
  listRequirements,
  createRequirement,
  updateRequirement,
  deleteRequirement,
}
