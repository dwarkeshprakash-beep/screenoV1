// backend/src/routes/client-template.routes.js
const crypto = require('crypto')
const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const clientTemplateRepo = require('../repositories/client-template.repository')
const clientTeamRepo = require('../repositories/client-team.repository')
const clientRequirementsRepo = require('../repositories/client-mandate-requirements.repository')
const clientInterviewRecordsRepo = require('../repositories/client-interview-records.repository')
const userRepository = require('../repositories/user.repository')
const interviewRepository = require('../repositories/interview.repository')
const emailService = require('../services/email.service')
const scheduleService = require('../services/schedule.service')
const googleMeetService = require('../services/google-meet.service')
const llmService = require('../services/llm.service')
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
    }
    if (data.jd_text && !hasTags(data.tags)) {
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
    const templates = await clientTemplateRepo.getByManager(req.user.id)
    res.json({ success: true, data: templates })
  } catch (err) {
    console.error('GET /client-templates failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not load templates' })
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
    const requirementProfiles = normalizeRequirementProfiles(req.body.requirement_profiles ?? req.body.requirementProfiles)
    const data = { ...req.body }
    delete data.requirement_profiles
    delete data.requirementProfiles
    if (requirementProfiles?.length) {
      data.headcount = requirementHeadcount(requirementProfiles)
      data.requirements = requirementProfiles.map(profile => profile.profile_name).join(', ')
    }
    const jdChanged = data.jd_text !== undefined
      && String(data.jd_text || '').trim()
      && String(data.jd_text || '') !== String(existing.jd_text || '')
    if (jdChanged && data.tags === undefined) {
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
    const payload = normalizeRequirementPayload(req.body)
    await assertUniqueRequirementName(mandateId, payload.profile_name)
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
    const payload = normalizeRequirementPayload({ ...req.body, id: rqId })
    await assertUniqueRequirementName(mandateId, payload.profile_name, rqId)
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
        const overlap = templateTags.filter(t => memberTags.includes(t))
        const experienceYears = extractExperienceYears(m)
        const matchingRequirements = openRequirements.filter(requirement =>
          requirementMatchesExperience(requirement, experienceYears)
        )
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
      const rows = await require('../db/connection').query(
        `SELECT id, type, status, scheduled_at, duration_minutes, location, created
         FROM interviews
         WHERE client_team_id = @ctId
         ORDER BY created DESC LIMIT 1`,
        { ctId: member.id }
      )
      if (rows[0]) interviewMap[member.id] = rows[0]
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

    const { userIds, requirementId } = req.body
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, error: 'userIds array is required' })
    }

    // Verify all users belong to this company
    const companyMembers = await userRepository.getByIdsForCompany(
      [...new Set(userIds.map(Number).filter(Number.isInteger))],
      req.user.companyId
    )
    const validIds = new Set(companyMembers.map(m => m.id))

    const added = await Promise.all(
      userIds
        .map(Number)
        .filter(id => validIds.has(id))
        .map(uid => clientTeamRepo.add(mandateId, uid, requirementId || null))
    )

    res.status(201).json({ success: true, data: added.filter(Boolean) })
  } catch (err) {
    console.error('POST /client-templates/:id/team failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not add prospects' })
  }
})

router.patch('/:id/team/:ctId', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const ctId = parseInt(req.params.ctId, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })
    const updated = await clientTeamRepo.updateStatus(ctId, req.body.status, req.body.notes)
    if (!updated) return res.status(404).json({ success: false, error: 'Team member not found' })
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('PATCH /team/:ctId failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not update team member' })
  }
})

router.delete('/:id/team/:ctId', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const ctId = parseInt(req.params.ctId, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })
    const removed = await clientTeamRepo.remove(ctId, mandateId)
    if (!removed) return res.status(404).json({ success: false, error: 'Team member not found' })
    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /team/:ctId failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not remove from team' })
  }
})

// ── Send JD with custom message to a specific client team member ──────────────

router.post('/:id/team/:ctId/send-jd', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const ctId = parseInt(req.params.ctId, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })

    const teamMember = await clientTeamRepo.getById(ctId)
    if (!teamMember || teamMember.mandate_id !== mandateId) {
      return res.status(404).json({ success: false, error: 'Team member not found' })
    }

    const { customMessage } = req.body
    const roleLabel = requirementDisplay(teamMember, template.requirements)
    await emailService.sendClientJDWithMessage(teamMember.email, {
      candidateName: `${teamMember.first_name} ${teamMember.last_name}`.trim(),
      clientName:    template.client_name,
      role:          roleLabel,
      jdText:        template.jd_text || template.requirements,
      customMessage: customMessage || '',
      frontendUrl:   process.env.FRONTEND_URL,
    })
    await clientTeamRepo.markJdSent(ctId)
    res.json({ success: true })
  } catch (err) {
    console.error('POST /team/:ctId/send-jd failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not send JD' })
  }
})

// ── Schedule an interview for a client team member ───────────────────────────

router.post('/:id/team/:ctId/schedule', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const ctId = parseInt(req.params.ctId, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })

    const teamMember = await clientTeamRepo.getById(ctId)
    if (!teamMember || teamMember.mandate_id !== mandateId) {
      return res.status(404).json({ success: false, error: 'Team member not found' })
    }

    const { type, videoPlatform, scheduledAt, location, notes, mode, difficulty, questionCount, durationMinutes } = req.body
    const validTypes = ['ai_voice', 'exam', 'human', 'offline']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid interview type' })
    }
    if (!scheduledAt) {
      return res.status(400).json({ success: false, error: 'scheduledAt is required' })
    }
    const scheduledDate = new Date(scheduledAt)
    if (Number.isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid scheduled date and time' })
    }

    // "offline" type → interview row + email (no magic link needed)
    if (type === 'offline') {
      const rawToken = crypto.randomBytes(32).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
      const tokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      const interview = await require('../db/connection').query(
        `INSERT INTO interviews
           (manager_id, internal_user_id, type, interview_mode, difficulty, question_count,
            token, token_expires, client_template_id, client_team_id, scheduled_at, location, status)
         VALUES
           (@managerId, @userId, 'offline', 'simple', 'medium', 1,
            @token, @tokenExpires, @mandateId, @ctId, @scheduledAt, @location, 'scheduled')
         RETURNING *`,
        { managerId: req.user.id, userId: teamMember.user_id, token: tokenHash, tokenExpires, mandateId, ctId, scheduledAt, location: location || null }
      )

      emailService.sendOfflineInterviewInvite(teamMember.email, {
        candidateName: `${teamMember.first_name} ${teamMember.last_name}`.trim(),
        clientName: template.client_name,
        role: requirementDisplay(teamMember, template.requirements),
        scheduledAt, location, notes,
      }).catch(err => console.error('[email] offline invite failed:', err.message))

      return res.status(201).json({ success: true, data: interview[0] })
    }

    // ai_voice / exam / human → use schedule service
    // For human interviews, optionally create a video meeting link
    if (type === 'human') {
      if (!['google_meet', 'teams'].includes(videoPlatform)) {
        return res.status(400).json({ success: false, error: 'Choose Google Meet or Microsoft Teams for human interviews' })
      }
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
          attendeeEmails: [teamMember.email],
        })
        if (meeting) videoLink = meeting.joinUrl
      }
      // 'teams' → disabled, skip
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
        durationMinutes:   durationMinutes || null,
        clientTemplateId: mandateId,
        scheduledAt,
        assessmentDate:   scheduledAt,
        details:          videoLink ? `Google Meet: ${videoLink}` : notes || null,
      },
      req.user.id,
      req.user.companyId
    )

    // Link interview back to the client team row and store scheduled time + video link
    if (interview?.id) {
      await require('../db/connection').query(
        `UPDATE interviews SET client_team_id = @ctId, scheduled_at = @scheduledAt, location = @location WHERE id = @id`,
        { id: interview.id, ctId, scheduledAt, location: videoLink || location || null }
      )
    }

    res.status(201).json({ success: true, data: interview, videoLink })
  } catch (err) {
    console.error('POST /team/:ctId/schedule failed:', err.message)
    res.status(500).json({ success: false, error: err.message || 'Could not schedule interview' })
  }
})

// ── Client interview records (real client-side interview outcome) ──────────────

router.get('/:id/team/:ctId/client-interview', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const ctId = parseInt(req.params.ctId, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })
    const record = await clientInterviewRecordsRepo.getByClientTeamId(ctId)
    res.json({ success: true, data: record || null })
  } catch (err) {
    console.error('GET /team/:ctId/client-interview failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not load client interview record' })
  }
})

router.post('/:id/team/:ctId/client-interview', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const ctId = parseInt(req.params.ctId, 10)
    const template = await clientTemplateRepo.getById(mandateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Mandate not found' })

    const existing = await clientInterviewRecordsRepo.getByClientTeamId(ctId)
    let record
    if (existing) {
      record = await clientInterviewRecordsRepo.update(existing.id, req.body)
    } else {
      record = await clientInterviewRecordsRepo.create({
        mandate_id:     mandateId,
        client_team_id: ctId,
        ...req.body,
      })
    }
    res.json({ success: true, data: record })
  } catch (err) {
    console.error('POST /team/:ctId/client-interview failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not save client interview record' })
  }
})

// ── Legacy: send JD to multiple org members ───────────────────────────────────

router.post('/:id/send-jd', async (req, res) => {
  try {
    const template = await clientTemplateRepo.getById(parseInt(req.params.id, 10), req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' })
    const { userIds, deadline } = req.body
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, error: 'userIds array is required' })
    }
    if (deadline) await clientTemplateRepo.update(template.id, req.user.id, { resume_deadline: deadline })
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
            jdText: template.jd_text || template.requirements || '',
            deadline: deadline || template.resume_deadline,
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

// ── Assignments (legacy schedule view) ────────────────────────────────────────

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
    const cancelled = await interviewRepository.cancelScheduledClientInterview(interviewId, templateId, req.user.id)
    if (!cancelled) return res.status(409).json({ success: false, error: 'Only scheduled client interviews can be cancelled' })
    res.json({ success: true, data: cancelled })
  } catch (err) {
    console.error('DELETE /assignments/:interviewId failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not cancel client assignment' })
  }
})

module.exports = router
