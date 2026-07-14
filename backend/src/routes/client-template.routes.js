const crypto = require('crypto')
const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const clientTemplateRepo = require('../repositories/client-template.repository')
const clientTeamRepo = require('../repositories/client-team.repository')
const clientRequirementsRepo = require('../repositories/client-mandate-requirements.repository')
const clientOutcomeRoundsRepo = require('../repositories/client-outcome-rounds.repository')
const userRepository = require('../repositories/user.repository')
const interviewRepository = require('../repositories/interview.repository')
const emailService = require('../services/email.service')
const scheduleService = require('../services/schedule.service')
const googleMeetService = require('../services/google-meet.service')
const llmService = require('../services/llm.service')
const storageService = require('../services/storage.service')
const mandateLifecycleService = require('../services/mandate-lifecycle.service')
const interviewFlowRepository = require('../repositories/interview-flow.repository')
const interviewFlowService = require('../services/interview-flow.service')
const { parseStoredArray } = require('../utils/parse')

const router = express.Router()
router.use(authMiddleware, requireRole('manager'))

const parseTags = parseStoredArray

function hasTags(value) {
  return parseTags(value).some(tag => String(tag || '').trim())
}

function extractExperienceYears(member) {
  const text = [
    member.current_position,
    member.job_title,
    member.resume_text,
    parseTags(member.tags).join(' '),
  ].filter(Boolean).join(' ')
  const matches = [...text.matchAll(/(\d{1,2})\s*\+?\s*(?:years?|yrs?|yoe|experience)/gi)]
    .map(match => Number(match[1]))
    .filter(Number.isFinite)
  return matches.length ? Math.max(...matches) : null
}

function requirementMatchesExperience(requirement, years) {
  const min = requirement.years_min == null ? null : Number(requirement.years_min)
  const max = requirement.years_max == null ? null : Number(requirement.years_max)
  if (min == null && max == null) return true
  if (years == null) return false
  if (min != null && years < min) return false
  if (max != null && years > max) return false
  return true
}

function requirementDisplay(teamMember, fallbackRole) {
  const name = teamMember?.requirement_name || fallbackRole || ''
  const min = teamMember?.requirement_years_min
  const max = teamMember?.requirement_years_max
  if (min == null) return name
  return `${name} (${min}-${max ?? '+'} yrs)`
}

function optionalYear(value) {
  if (value === '' || value === undefined || value === null) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error('Experience years must be a non-negative whole number')
  }
  return parsed
}

function optionalDateTime(value) {
  if (value === '' || value === undefined || value === null) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Resume deadline must be a valid date/time')
  }
  return date.toISOString()
}

function normalizeRequirementPayload(input = {}) {
  const profileName = String(input.profile_name ?? input.profileName ?? '').trim()
  if (!profileName) throw new Error('profile_name is required')
  const yearsMin = optionalYear(input.years_min ?? input.yearsMin)
  const yearsMax = optionalYear(input.years_max ?? input.yearsMax)
  if (yearsMin !== null && yearsMax !== null && yearsMin > yearsMax) {
    throw new Error('Minimum experience cannot be greater than maximum experience')
  }
  const headcount = Number(input.headcount ?? 1)
  if (!Number.isInteger(headcount) || headcount < 1) {
    throw new Error('Headcount must be at least 1')
  }
  return {
    id: input.id ? Number(input.id) : null,
    profile_name: profileName,
    years_min: yearsMin,
    years_max: yearsMax,
    headcount,
    notes: String(input.notes || '').trim() || null,
    jd_text: String(input.jd_text ?? input.jdText ?? '').trim() || null,
    resume_deadline: optionalDateTime(input.resume_deadline ?? input.resumeDeadline),
    tags: input.tags || null,
  }
}

function normalizeRequirementProfiles(input) {
  if (input === undefined) return null
  if (!Array.isArray(input)) throw new Error('requirement_profiles must be an array')
  const profiles = input.map(normalizeRequirementPayload)
  const seen = new Set()
  for (const profile of profiles) {
    const key = profile.profile_name.toLowerCase()
    if (seen.has(key)) throw new Error(`Duplicate requirement profile: ${profile.profile_name}`)
    seen.add(key)
  }
  return profiles
}

function isRequirementValidationError(err) {
  return [
    'requirement_profiles must be an array',
    'profile_name is required',
    'Experience years must be a non-negative whole number',
    'Minimum experience cannot be greater than maximum experience',
    'Headcount must be at least 1',
    'Resume deadline must be a valid date/time',
  ].includes(err.message) || err.message.startsWith('Duplicate requirement profile')
    || err.message.startsWith('Requirement profile "')
}

function requirementHeadcount(profiles) {
  return profiles.reduce((sum, profile) => sum + Number(profile.headcount || 0), 0)
}

async function assertUniqueRequirementName(mandateId, profileName, excludeId = null) {
  const existing = await clientRequirementsRepo.getByMandate(mandateId)
  const duplicate = existing.find(item =>
    String(item.profile_name || '').trim().toLowerCase() === profileName.toLowerCase()
    && Number(item.id) !== Number(excludeId)
  )
  if (duplicate) throw new Error(`Requirement profile "${profileName}" already exists`)
}

function checkNotArchived(template, res) {
  if (template.archived_at) {
    res.status(409).json({ success: false, error: 'Mandate is archived and read-only' })
    return false
  }
  return true
}

async function syncMandateHeadcount(mandateId, managerId) {
  const profiles = await clientRequirementsRepo.getByMandate(mandateId)
  if (profiles.length > 0) {
    await clientTemplateRepo.update(mandateId, managerId, {
      headcount: requirementHeadcount(profiles),
      requirements: profiles.map(profile => profile.profile_name).join(', '),
    })
  }
  return profiles
}

async function assertRequirementExists(mandateId, requirementId) {
  if (!requirementId) return
  const requirements = await clientRequirementsRepo.getByMandate(mandateId)
  const requirement = requirements.find(item => Number(item.id) === Number(requirementId))
  if (!requirement) throw new Error('Requirement profile not found on this mandate')
}

async function syncRequirementProfiles(mandateId, managerId, profiles) {
  const existing = await clientRequirementsRepo.getByMandate(mandateId)
  const existingIds = new Set(existing.map(item => Number(item.id)))
  const keptIds = new Set()

  for (const profile of profiles) {
    if (profile.id && existingIds.has(Number(profile.id))) {
      await clientRequirementsRepo.update(profile.id, mandateId, profile)
      keptIds.add(Number(profile.id))
    } else {
      await clientRequirementsRepo.create(mandateId, profile)
    }
  }

  await Promise.all(
    existing
      .filter(item => !keptIds.has(Number(item.id)))
      .map(item => clientRequirementsRepo.deleteReq(item.id, mandateId))
  )

  return syncMandateHeadcount(mandateId, managerId)
}

// ── Mandate CRUD ──────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    const requirementProfiles = normalizeRequirementProfiles(req.body.requirement_profiles ?? req.body.requirementProfiles) || []
    const data = { ...req.body, manager_id: req.user.id }
    delete data.requirement_profiles
    delete data.requirementProfiles
    if (requirementProfiles.length > 0) {
      data.headcount = requirementHeadcount(requirementProfiles)
      if (!String(data.requirements || '').trim()) {
        data.requirements = requirementProfiles.map(profile => profile.profile_name).join(', ')
      }
      
      // Extract tags for each role if not already provided
      for (const profile of requirementProfiles) {
        if (profile.jd_text && (!profile.tags || !hasTags(profile.tags))) {
          profile.tags = await llmService.extractTagsFromText(profile.jd_text)
        }
      }
    }
    
    // Extract global mandate tags if jd_text exists
    if (data.jd_text && (!data.tags || !hasTags(data.tags))) {
      data.tags = await llmService.extractTagsFromText(data.jd_text)
    }
    const template = await clientTemplateRepo.create(data)
    const savedProfiles = requirementProfiles.length > 0
      ? await syncRequirementProfiles(template.id, req.user.id, requirementProfiles)
      : []
    res.status(201).json({ success: true, data: { ...template, requirement_profiles: savedProfiles } })
  } catch (err) {
    console.error('POST /client-templates failed:', err.message)
    if (isRequirementValidationError(err)) return res.status(400).json({ success: false, error: err.message })
    res.status(500).json({ success: false, error: 'Could not create template' })
  }
})

router.get('/', async (req, res) => {
  try {
    const requestedState = String(req.query.state || 'active')
    const state = ['active', 'archived', 'all'].includes(requestedState) ? requestedState : 'active'
    const templates = await clientTemplateRepo.getByManager(req.user.id, state)
    res.json({ success: true, data: templates })
  } catch (err) {
    console.error('GET /client-templates failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not load templates' })
  }
})

router.post('/:id/archive', async (req, res) => {
  try {
    const template = await clientTemplateRepo.archive(parseInt(req.params.id, 10), req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' })
    res.json({ success: true, data: template })
  } catch (err) {
    console.error('POST /client-templates/:id/archive failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not archive template' })
  }
})

router.post('/:id/restore', async (req, res) => {
  try {
    const template = await clientTemplateRepo.restore(parseInt(req.params.id, 10), req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' })
    res.json({ success: true, data: template })
  } catch (err) {
    console.error('POST /client-templates/:id/restore failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not restore template' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const preview = req.query.preview === 'true'

    const impact = await mandateLifecycleService.getDeletionImpact(mandateId, req.user.id)

    if (preview) {
      return res.json({ success: true, data: impact })
    }

    if (!impact.canDelete) {
      return res.status(409).json({ success: false, error: 'Cannot delete mandate while interviews are in_progress' })
    }

    await mandateLifecycleService.permanentlyDeleteMandate(mandateId, req.user.id)
    res.json({ success: true, data: { deleted: true } })
  } catch (err) {
    console.error('DELETE /client-templates/:id failed:', err.message)
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: 'Template not found' })
    }
    res.status(500).json({ success: false, error: 'Could not permanently delete template' })
  }
})

// Returns which video meeting platforms are currently configured on this server.
// Keep this before /:id so Express does not treat "video-platforms" as a mandate id.
router.get('/video-platforms', (req, res) => {
  res.json({
    success: true,
    data: {
      google_meet: googleMeetService.isConfigured(),
      teams: false,
    },
  })
})

router.get('/:id', async (req, res) => {
  try {
    const template = await clientTemplateRepo.getById(parseInt(req.params.id, 10), req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' })
    res.json({ success: true, data: template })
  } catch (err) {
    console.error('GET /client-templates/:id failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not load template' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id, 10)
    const existing = await clientTemplateRepo.getById(templateId, req.user.id)
    if (!existing) return res.status(404).json({ success: false, error: 'Template not found' })
    if (!checkNotArchived(existing, res)) return
    const requirementProfiles = normalizeRequirementProfiles(req.body.requirement_profiles ?? req.body.requirementProfiles)
    const data = { ...req.body }
    delete data.requirement_profiles
    delete data.requirementProfiles
    if (requirementProfiles?.length) {
      data.headcount = requirementHeadcount(requirementProfiles)
      data.requirements = requirementProfiles.map(profile => profile.profile_name).join(', ')
      
      for (const profile of requirementProfiles) {
        // If jd_text exists and tags are not provided or are empty, extract them.
        if (profile.jd_text && (!profile.tags || !hasTags(profile.tags))) {
          profile.tags = await llmService.extractTagsFromText(profile.jd_text)
        }
      }
    }
    const jdChanged = data.jd_text !== undefined
      && String(data.jd_text || '').trim()
      && String(data.jd_text || '') !== String(existing.jd_text || '')
    if (jdChanged && (!data.tags || !hasTags(data.tags))) {
      data.tags = await llmService.extractTagsFromText(data.jd_text)
    }
    const template = await clientTemplateRepo.update(templateId, req.user.id, data)
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' })
    const savedProfiles = requirementProfiles
      ? await syncRequirementProfiles(templateId, req.user.id, requirementProfiles)
      : await clientRequirementsRepo.getByMandate(templateId)
    const updatedTemplate = await clientTemplateRepo.getById(templateId, req.user.id)
    res.json({ success: true, data: { ...(updatedTemplate || template), requirement_profiles: savedProfiles } })
  } catch (err) {
    console.error('PATCH /client-templates/:id failed:', err.message)
    if (isRequirementValidationError(err)) return res.status(400).json({ success: false, error: err.message })
    res.status(500).json({ success: false, error: 'Could not update template' })
  }
})

router.post('/extract-tags', async (req, res) => {
  try {
    const { text } = req.body
    if (!text) return res.status(400).json({ success: false, error: 'Text required' })
    const tags = await llmService.extractTagsFromText(text)
    res.json({ success: true, data: tags })
  } catch (err) {
    console.error('POST /extract-tags failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not extract tags' })
  }
})

// ── Requirement profiles ──────────────────────────────────────────────────────

router.get('/:id/requirements', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })
    const requirements = await clientRequirementsRepo.getByMandate(mandateId)
    res.json({ success: true, data: requirements })
  } catch (err) {
    console.error('GET /requirements failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not load requirements' })
  }
})

router.post('/:id/requirements', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })
    if (!checkNotArchived(template, res)) return
    const payload = normalizeRequirementPayload(req.body)
    await assertUniqueRequirementName(mandateId, payload.profile_name)
    if (payload.jd_text && (!payload.tags || !hasTags(payload.tags))) {
      payload.tags = await llmService.extractTagsFromText(payload.jd_text)
    }
    const req_ = await clientRequirementsRepo.create(mandateId, payload)
    await syncMandateHeadcount(mandateId, req.user.id)
    res.status(201).json({ success: true, data: req_ })
  } catch (err) {
    console.error('POST /requirements failed:', err.message)
    if (isRequirementValidationError(err)) return res.status(400).json({ success: false, error: err.message })
    res.status(500).json({ success: false, error: 'Could not create requirement' })
  }
})

router.patch('/:id/requirements/:rqId', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const rqId = parseInt(req.params.rqId, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })
    if (!checkNotArchived(template, res)) return
    const payload = normalizeRequirementPayload({ ...req.body, id: rqId })
    await assertUniqueRequirementName(mandateId, payload.profile_name, rqId)
    
    // Determine if jd_text changed to trigger tag extraction
    const existingReq = await clientRequirementsRepo.getByIdForMandate(rqId, mandateId)
    const jdChanged = payload.jd_text !== undefined
      && String(payload.jd_text || '').trim()
      && String(payload.jd_text || '') !== String(existingReq.jd_text || '')
      
    if (jdChanged && (!payload.tags || !hasTags(payload.tags))) {
      payload.tags = await llmService.extractTagsFromText(payload.jd_text)
    }
    
    const updated = await clientRequirementsRepo.update(rqId, mandateId, payload)
    if (!updated) return res.status(404).json({ success: false, error: 'Requirement not found' })
    await syncMandateHeadcount(mandateId, req.user.id)
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('PATCH /requirements/:id failed:', err.message)
    if (isRequirementValidationError(err)) return res.status(400).json({ success: false, error: err.message })
    res.status(500).json({ success: false, error: 'Could not update requirement' })
  }
})

router.delete('/:id/requirements/:rqId', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const rqId = parseInt(req.params.rqId, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })
    if (!checkNotArchived(template, res)) return
    const team = await clientTeamRepo.getByMandate(mandateId)
    if (team.some(m => m.requirement_id === rqId)) {
      return res.status(409).json({ success: false, error: 'Cannot delete a requirement profile that is assigned to candidates.' })
    }

    const deleted = await clientRequirementsRepo.deleteReq(rqId, mandateId)
    if (!deleted) return res.status(404).json({ success: false, error: 'Requirement not found' })
    await syncMandateHeadcount(mandateId, req.user.id)
    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /requirements/:id failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not delete requirement' })
  }
})

// ── Candidate matches (for browsing/adding prospects) ────────────────────────
// Returns all org members with tag match score and in_team flag.
// Team members are recommended for AI matching; other members shown on demand.

router.get('/:id/matches', async (req, res) => {
  try {
    const template = await clientTemplateRepo.getById(parseInt(req.params.id, 10), req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' })

    let templateTags = []
    try { templateTags = JSON.parse(template.tags || '[]').map(t => t.toLowerCase()) } catch { templateTags = [] }

    const [allMembers, teamRows, clientTeamRows, requirements] = await Promise.all([
      userRepository.getByCompany(req.user.companyId),
      require('../db/connection').query(
        `SELECT id, user_id FROM team_members WHERE manager_id = @managerId`,
        { managerId: req.user.id }
      ),
      clientTeamRepo.getByMandate(parseInt(req.params.id, 10)),
      clientRequirementsRepo.getByMandate(template.id),
    ])

    const teamUserIds = new Set(teamRows.map(r => r.user_id))
    const teamMemberIdsByUser = new Map(teamRows.map(row => [Number(row.user_id), row.id]))
    const alreadyInClientTeam = new Set(clientTeamRows.map(r => r.user_id))
    const filledByRequirement = clientTeamRows.reduce((counts, row) => {
      if (row.requirement_id) counts.set(row.requirement_id, (counts.get(row.requirement_id) || 0) + 1)
      return counts
    }, new Map())
    const openRequirements = requirements.filter(requirement =>
      Number(filledByRequirement.get(requirement.id) || 0) < Number(requirement.headcount || 1)
    )

    const matches = allMembers
      .filter(member => member.role !== 'manager')
      .filter(member => !alreadyInClientTeam.has(member.id))
      .map(m => {
        let memberTags = []
        try { memberTags = JSON.parse(m.tags || '[]').map(t => t.toLowerCase()) } catch { memberTags = [] }
        
        const experienceYears = extractExperienceYears(m)
        const matchingRequirements = openRequirements.filter(requirement =>
          requirementMatchesExperience(requirement, experienceYears)
        )
        
        // Collect tags from matching requirements and template
        const applicableTags = new Set(templateTags)
        for (const req of matchingRequirements) {
          try {
            const reqTags = JSON.parse(req.tags || '[]').map(t => t.toLowerCase())
            for (const t of reqTags) applicableTags.add(t)
          } catch { /* ignore */ }
        }
        
        const overlap = [...applicableTags].filter(t => memberTags.includes(t))
        const profileScore = requirements.length > 0 ? matchingRequirements.length : 0
        return {
          ...m,
          user_id: m.id,
          match_score: overlap.length + profileScore,
          matched_tags: overlap,
          experience_years: experienceYears,
          matching_requirements: matchingRequirements.map(requirement => ({
            id: requirement.id,
            profile_name: requirement.profile_name,
            years_min: requirement.years_min,
            years_max: requirement.years_max,
            headcount: requirement.headcount,
          })),
          recommended: (overlap.length > 0 || profileScore > 0) && teamUserIds.has(m.id),
          in_team: teamUserIds.has(m.id),
          team_member_id: teamMemberIdsByUser.get(Number(m.id)) || null,
        }
      })
      .sort((a, b) =>
        (b.in_team ? 1 : 0) - (a.in_team ? 1 : 0)
        || b.match_score - a.match_score
        || String(a.first_name || '').localeCompare(String(b.first_name || ''))
      )

    res.json({ success: true, data: matches })
  } catch (err) {
    console.error('GET /client-templates/:id/matches failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not load matches' })
  }
})

// ── Client team (prospects) ───────────────────────────────────────────────────

router.get('/:id/team', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })
    const team = await clientTeamRepo.getByMandate(mandateId)

    // Attach latest scheduled interview for each team member
    const interviewMap = {}
    await Promise.all(team.map(async member => {
      const latestInterview = await interviewFlowRepository.getLatestInterviewFeedback(member.id)
      if (latestInterview?.storage_path) {
        latestInterview.feedback_file_url = await storageService.getSignedUrl(latestInterview.storage_path).catch(() => null)
      }
      if (latestInterview) interviewMap[member.id] = latestInterview
      if (member.client_resume_url && !member.client_resume_url.startsWith('http')) {
        const storagePath = member.client_resume_url
        try {
          member.client_resume_url = await storageService.getSignedUrl(member.client_resume_url)
          member.client_resume_download_url = member.client_resume_url
          member.client_resume_storage_path = storagePath
        } catch (e) {
          console.error('Failed to sign client resume url for team member:', e.message)
          member.client_resume_url = null
          member.client_resume_download_url = null
          member.client_resume_storage_path = storagePath
        }
      } else if (member.client_resume_url) {
        member.client_resume_download_url = member.client_resume_url
      }
    }))

    const result = team.map(m => ({ ...m, latest_interview: interviewMap[m.id] || null }))
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('GET /client-templates/:id/team failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not load client team' })
  }
})

router.post('/:id/team', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })
    if (!checkNotArchived(template, res)) return
    const { userIds } = req.body
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, error: 'userIds array is required' })
    }

    const requirements = await clientRequirementsRepo.getByMandate(mandateId)
    const currentTeam = await clientTeamRepo.getByMandate(mandateId)

    const membersToAdd = []

    const normalizedItems = userIds.map(u => ({
      memberId: Number(typeof u === 'object' ? (u.user_id || u.userId) : u),
      reqId: (() => {
        const raw = typeof u === 'object'
          ? (u.requirement_id || u.requirementId)
          : (req.body.requirement_id || req.body.requirementId)
        return raw == null || raw === '' ? null : Number(raw)
      })(),
    })).filter(item => Number.isInteger(item.memberId))

    if (normalizedItems.length !== userIds.length) {
      return res.status(400).json({ success: false, error: 'Every userIds entry must include a valid user_id' })
    }

    const companyMembers = await userRepository.getByIdsForCompany(
      normalizedItems.map(item => item.memberId),
      req.user.companyId
    )
    const companyMemberIds = new Set(companyMembers.map(member => Number(member.id)))
    if (companyMemberIds.size !== normalizedItems.length) {
      return res.status(404).json({ success: false, error: 'One or more users are not in your organization' })
    }

    for (const { memberId, reqId } of normalizedItems) {
      if (requirements.length > 0 && !reqId) {
        return res.status(400).json({ success: false, error: 'Each user must specify a requirement_id (role)' })
      }

      if (reqId) {
        const reqInfo = requirements.find(r => Number(r.id) === Number(reqId))
        if (!reqInfo) {
          return res.status(404).json({ success: false, error: `Requirement profile ${reqId} not found on this mandate` })
        }
      }

      const existing = await clientTeamRepo.getByUserAndMandate(memberId, mandateId)
      if (!existing) {
        membersToAdd.push({ memberId, reqId })
      }
    }

    const added = []
    for (const item of membersToAdd) {
      const created = await clientTeamRepo.create({
        user_id: item.memberId,
        mandate_id: mandateId,
        requirement_id: item.reqId,
      })
      added.push(created)
    }
    res.status(201).json({ success: true, data: added })
  } catch (err) {
    console.error('POST /team failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not add members to client team' })
  }
})

router.patch('/:id/team/:ctId', async (req, res) => {
  try {
    const ctId = parseInt(req.params.ctId, 10)
    const mandateId = parseInt(req.params.id, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })
    if (!checkNotArchived(template, res)) return
    // Check that the ctId belongs to the mandate
    const teamMember = await clientTeamRepo.getByIdForMandate(ctId, mandateId)
    if (!teamMember) {
      return res.status(404).json({ success: false, error: 'Client team member not found' })
    }
    const requirementId = req.body.requirement_id || req.body.requirementId || null
    await assertRequirementExists(mandateId, requirementId)
    const updated = await clientTeamRepo.update(ctId, mandateId, { 
      requirement_id: requirementId,
    })
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('PATCH /team/:ctId failed:', err.message)
    if (err.message === 'Requirement profile not found on this mandate') {
      return res.status(404).json({ success: false, error: err.message })
    }
    res.status(500).json({ success: false, error: 'Could not update client team member' })
  }
})

// Move role endpoint (as mentioned in audit)
router.patch('/:id/team/:ctId/requirement', async (req, res) => {
  try {
    const ctId = parseInt(req.params.ctId, 10)
    const mandateId = parseInt(req.params.id, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })
    if (!checkNotArchived(template, res)) return
    const requirementId = req.body.requirement_id || req.body.requirementId || null
    await assertRequirementExists(mandateId, requirementId)
    const updated = await clientTeamRepo.updateRequirement(ctId, mandateId, requirementId)
    if (!updated) return res.status(404).json({ success: false, error: 'Client team member not found' })
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('PATCH /team/:ctId/requirement failed:', err.message)
    if (err.message === 'Requirement profile not found on this mandate') {
      return res.status(404).json({ success: false, error: err.message })
    }
    res.status(500).json({ success: false, error: 'Could not update requirement for client team member' })
  }
})

router.delete('/:id/team/:ctId', async (req, res) => {
  try {
    const ctId = parseInt(req.params.ctId, 10)
    const mandateId = parseInt(req.params.id, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })
    if (!checkNotArchived(template, res)) return
    const member = await clientTeamRepo.getByIdForMandate(ctId, mandateId)
    if (!member) {
      return res.status(404).json({ success: false, error: 'Client team member not found' })
    }
    const interviews = await interviewRepository.getByClientTeamId(ctId)
    if (interviews.some(i => i.status !== 'completed' && i.status !== 'cancelled')) {
      return res.status(409).json({ success: false, error: 'Cannot remove member with active scheduled interviews' })
    }
    await clientTeamRepo.remove(ctId, mandateId)
    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /team/:ctId failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not remove member from client team' })
  }
})

// ── Actions ───────────────────────────────────────────────────────────────────

router.post('/:id/team/:ctId/send-jd', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const ctId = parseInt(req.params.ctId, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })
    if (!checkNotArchived(template, res)) return
    const member = await clientTeamRepo.getByIdForMandate(ctId, mandateId)
    if (!member) {
      return res.status(404).json({ success: false, error: 'Team member not found' })
    }
    const [user] = await userRepository.getByIdsForCompany([member.user_id], req.user.companyId)
    if (!user) return res.status(404).json({ success: false, error: 'User not found' })
    const roleName = requirementDisplay(member, template.requirements)
    const jdText = member.requirement_jd_text || template.jd_text || template.requirements || ''
    const deadline = req.body.deadline 

    await emailService.sendClientJDWithMessage(user.email, {
      candidateName: `${user.first_name} ${user.last_name}`,
      clientName: template.client_name,
      role: roleName,
      jdText,
      customMessage: String(req.body.customMessage || '').trim(),
      deadline,
      frontendUrl: process.env.FRONTEND_URL,
    })
    
    const updated = await clientTeamRepo.update(ctId, mandateId, {
      jd_sent: true,
      jd_sent_at: new Date().toISOString()
    })
    
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('POST /team/:ctId/send-jd failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not send JD' })
  }
})

router.post('/:id/team/:ctId/schedule', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const ctId = parseInt(req.params.ctId, 10)
    const { type, mode, difficulty, questionCount, scheduledAt, location, videoPlatform, durationMinutes, notes, reportUserIds, interviewerUserId } = req.body

    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })
    if (!checkNotArchived(template, res)) return
    
    const teamMember = await clientTeamRepo.getByIdForMandate(ctId, mandateId)
    if (!teamMember) {
      return res.status(404).json({ success: false, error: 'Team member not found' })
    }

    let interviewer = null
    if (type === 'human' || type === 'offline') {
      if (!interviewerUserId) return res.status(400).json({ success: false, error: 'Select an interviewer' })
      interviewer = await userRepository.getByIdForCompany(Number(interviewerUserId), req.user.companyId)
      if (!interviewer) return res.status(404).json({ success: false, error: 'Interviewer not found in your organization' })
      if (Number(interviewer.id) === Number(teamMember.user_id)) {
        return res.status(400).json({ success: false, error: 'Candidate and interviewer must be different people' })
      }
    }

    if (type === 'human' && scheduledAt) {
      if (videoPlatform === 'teams') {
        return res.status(400).json({
          success: false,
          error: 'Microsoft Teams scheduling needs organization setup before it can be used.',
        })
      }
      if (!googleMeetService.isConfigured()) {
        return res.status(400).json({
          success: false,
          error: 'Google Meet is not configured yet. Add the Google Calendar service-account settings first.',
        })
      }
    }

    let videoLink = null
    if (type === 'human' && scheduledAt && videoPlatform) {
      const meetingMinutes = Number(durationMinutes) || 60
      const endAt = new Date(new Date(scheduledAt).getTime() + meetingMinutes * 60 * 1000).toISOString()
      const meetingTopic = `Interview - ${requirementDisplay(teamMember, template.requirements)} @ ${template.client_name}`

      if (videoPlatform === 'google_meet' && googleMeetService.isConfigured()) {
        const meeting = await googleMeetService.createMeeting({
          summary: meetingTopic,
          startAt: scheduledAt,
          endAt,
          attendeeEmails: [req.user.email, interviewer?.email].filter(Boolean),
        })
        if (meeting) videoLink = meeting.joinUrl
      }
      // 'teams' is disabled, skip
    }

    if (type === 'human' && !videoLink) {
      return res.status(502).json({
        success: false,
        error: 'Could not create the Google Meet link. Check the Google Calendar setup.',
      })
    }

    const interview = await scheduleService.createSchedule(
      {
        userId:           teamMember.user_id,
        type,
        interviewMode:    mode || 'simple',
        difficulty:       difficulty || 'medium',
        questionCount:    questionCount || 10,
        durationMinutes:  durationMinutes || null,
        clientTemplateId: mandateId,
        clientTeamId:     ctId,
        scheduledAt,
        assessmentDate:   scheduledAt,
        scheduleTimezone: req.body.scheduleTimezone || null,
        companyName:      template.client_name,
        jobTitle:         requirementDisplay(teamMember, template.requirements),
        location:         location || null,
        meetingUrl:       videoLink || null,
        details:          notes || null,
        reportUserIds:    Array.isArray(reportUserIds) ? reportUserIds : [],
      },
      req.user.id,
      req.user.companyId
    )

    // Link interview back to the client team row and store scheduled time + video link
    if (interview?.id) {
      await require('../db/connection').query(
        `UPDATE interviews SET client_team_id = @ctId, scheduled_at = @scheduledAt, location = @location, meeting_url = @meetingUrl WHERE id = @id`,
        { id: interview.id, ctId, scheduledAt, location: location || null, meetingUrl: videoLink || null }
      )
      if (interviewer) {
        await interviewFlowRepository.createAssignment({
          stageRunId: null,
          interviewId: interview.id,
          interviewerUserId: interviewer.id,
        })
        interviewFlowService.notifyInterviewer(interview.id, interviewer, {
          interviewerName: `${interviewer.first_name} ${interviewer.last_name}`.trim(),
          candidateName: `${teamMember.first_name} ${teamMember.last_name}`.trim(),
          clientName: template.client_name,
          stageName: requirementDisplay(teamMember, template.requirements),
          scheduledAt,
          scheduleTimezone: req.body.scheduleTimezone || null,
          location: location || null,
          meetingUrl: videoLink || null,
        }).catch(error => console.error('Interviewer notification failed:', error.message))
      }
    }

    res.status(201).json({ success: true, data: interview, videoLink })
  } catch (err) {
    console.error('POST /team/:ctId/schedule failed:', err.message)
    res.status(500).json({ success: false, error: err.message || 'Could not schedule interview' })
  }
})

// Legacy: send JD to multiple org members

router.post('/:id/send-jd', async (req, res) => {
  try {
    const template = await clientTemplateRepo.getById(parseInt(req.params.id, 10), req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' })
    if (!checkNotArchived(template, res)) return
    const { userIds, deadline } = req.body
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, error: 'userIds array is required' })
    }
    
    const companyMembers = await userRepository.getByIdsForCompany(
      [...new Set(userIds.map(Number).filter(Number.isInteger))],
      req.user.companyId
    )
    const companyMembersById = new Map(companyMembers.map(member => [Number(member.id), member]))
    const results = await Promise.all(
      userIds.map(async uid => {
        const user = companyMembersById.get(Number(uid))
        if (!user) return { uid, ok: false }
        try {
          await emailService.sendJDForResumeUpdate(user.email, {
            candidateName: `${user.first_name} ${user.last_name}`,
            clientName: template.client_name,
            role: template.requirements || 'the requirement',
            jdText: template.jd_text || template.requirements || '',
            deadline: deadline,
          })
          return { uid, ok: true }
        } catch { return { uid, ok: false } }
      })
    )
    res.json({ success: true, data: { sent: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length } })
  } catch (err) {
    console.error('POST /send-jd failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not send JD emails' })
  }
})

// ── Assignments (legacy schedule view) ───────────────────────────────────────

router.get('/:id/assignments', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id, 10)
    const template = await clientTemplateRepo.getById(templateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' })
    const assignments = await interviewRepository.getByClientTemplateForManager(templateId, req.user.id)
    res.json({ success: true, data: assignments })
  } catch (err) {
    console.error('GET /assignments failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not load client assignments' })
  }
})

router.delete('/:id/assignments/:interviewId', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id, 10)
    const interviewId = parseInt(req.params.interviewId, 10)
    const template = await clientTemplateRepo.getById(templateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' })
    if (!checkNotArchived(template, res)) return
    const cancelled = await interviewRepository.cancelScheduledClientInterview(interviewId, templateId, req.user.id)
    if (!cancelled) return res.status(409).json({ success: false, error: 'Only scheduled client interviews can be cancelled' })
    res.json({ success: true, data: cancelled })
  } catch (err) {
    console.error('DELETE /assignments/:interviewId failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not cancel client assignment' })
  }
})

// ── Client outcome rounds (replaces single-record model) ────────────────────────────
// Access pattern: /:id/team/:ctId/rounds/*
// Only the owning manager may access these routes (enforced via template lookup).

router.get('/:id/team/:ctId/rounds', async (req, res) => {
  try {
    const template = await clientTemplateRepo.getById(parseInt(req.params.id, 10), req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })
    const rounds = await clientOutcomeRoundsRepo.listByClientTeamId(
      parseInt(req.params.ctId, 10),
      parseInt(req.params.id, 10)
    )
    res.json({ success: true, data: rounds })
  } catch (err) {
    console.error('GET /:id/team/:ctId/rounds failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not load outcome rounds' })
  }
})

router.post('/:id/team/:ctId/rounds', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const ctId = parseInt(req.params.ctId, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })
    if (template.archived_at) return res.status(409).json({ success: false, error: 'Mandate is archived' })
    const round = await clientOutcomeRoundsRepo.create(ctId, mandateId, req.user.id, req.body)
    res.status(201).json({ success: true, data: round })
  } catch (err) {
    console.error('POST /:id/team/:ctId/rounds failed:', err.message)
    const status = err.message.includes('Invalid outcome') ? 400 : 500
    res.status(status).json({ success: false, error: err.message || 'Could not create round' })
  }
})

router.patch('/:id/team/:ctId/rounds/:roundId', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const ctId = parseInt(req.params.ctId, 10)
    const roundId = parseInt(req.params.roundId, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })
    const round = await clientOutcomeRoundsRepo.update(roundId, ctId, mandateId, req.user.id, req.body)
    res.json({ success: true, data: round })
  } catch (err) {
    console.error('PATCH /:id/team/:ctId/rounds/:roundId failed:', err.message)
    const status = err.message.includes('published') ? 409 : err.message.includes('Invalid') ? 400 : 500
    res.status(status).json({ success: false, error: err.message || 'Could not update round' })
  }
})

router.post('/:id/team/:ctId/rounds/:roundId/publish', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const ctId = parseInt(req.params.ctId, 10)
    const roundId = parseInt(req.params.roundId, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })
    const round = await clientOutcomeRoundsRepo.publish(roundId, ctId, mandateId)
    res.json({ success: true, data: round })
  } catch (err) {
    console.error('POST /:id/team/:ctId/rounds/:roundId/publish failed:', err.message)
    res.status(err.message === 'Round not found' ? 404 : 500).json({ success: false, error: err.message })
  }
})

router.post('/:id/team/:ctId/rounds/:roundId/unpublish', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const ctId = parseInt(req.params.ctId, 10)
    const roundId = parseInt(req.params.roundId, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })
    const round = await clientOutcomeRoundsRepo.unpublish(roundId, ctId, mandateId)
    res.json({ success: true, data: round })
  } catch (err) {
    console.error('POST /:id/team/:ctId/rounds/:roundId/unpublish failed:', err.message)
    res.status(err.message === 'Round not found' ? 404 : 500).json({ success: false, error: err.message })
  }
})

module.exports = router
