// backend/src/services/client-mandate-team.service.js
// The candidates on a client mandate (client_teams): match suggestions, adding/moving/
// removing members, sending the JD, scheduling interviews, legacy assignments, and
// client outcome rounds. Mandate access is checked by the caller, which passes in the
// loaded template.
// Expected failures throw with err.httpStatus set and a user-facing message.
const clientTeamRepo = require('../repositories/client-team.repository')
const clientRequirementsRepo = require('../repositories/client-mandate-requirements.repository')
const clientOutcomeRoundsRepo = require('../repositories/client-outcome-rounds.repository')
const teamMemberRepository = require('../repositories/team-member.repository')
const userRepository = require('../repositories/user.repository')
const interviewRepository = require('../repositories/interview.repository')
const interviewFlowRepository = require('../repositories/interview-flow.repository')
const emailService = require('./email.service')
const scheduleService = require('./schedule.service')
const storageService = require('./storage.service')
const mandateStatusService = require('./mandate-status.service')
const interviewFlowService = require('./interview-flow.service')
const requirementsService = require('./client-mandate-requirements.service')
const { parseStoredArray } = require('../utils/parse')

function httpError(httpStatus, message) {
  const err = new Error(message)
  err.httpStatus = httpStatus
  return err
}

function fullName(user) {
  return `${user.first_name} ${user.last_name}`.trim()
}

// Lower-cased tags from a stored JSON array; malformed values count as no tags.
function parseLowerTags(value) {
  try {
    return JSON.parse(value || '[]').map(tag => tag.toLowerCase())
  } catch {
    return []
  }
}

async function getMemberForMandate(ctId, mandateId, notFoundMessage) {
  const member = await clientTeamRepo.getByIdForMandate(ctId, mandateId)
  if (!member) throw httpError(404, notFoundMessage)
  return member
}

// ── Matching ──────────────────────────────────────────────────────────────────

// Largest "N years" figure found in the member's position, title, resume text, or tags.
function extractExperienceYears(member) {
  const text = [
    member.current_position,
    member.job_title,
    member.resume_text,
    parseStoredArray(member.tags).join(' '),
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

// Role label for emails and interviews, e.g. "React Developer (3-5 yrs)".
function requirementDisplay(teamMember, fallbackRole) {
  const name = teamMember?.requirement_name || fallbackRole || ''
  const min = teamMember?.requirement_years_min
  const max = teamMember?.requirement_years_max
  if (min == null) return name
  return `${name} (${min}-${max ?? '+'} yrs)`
}

/**
 * Every organization member not already on the mandate (and not a mandate owner),
 * scored by tag overlap with the mandate/open roles plus how many open roles their
 * experience fits. The manager's own team members are listed first and recommended.
 */
async function getMatches(template, mandateId, companyId) {
  const templateTags = parseLowerTags(template.tags)

  const [allMembers, mandateOwnerUsers, teamRows, clientTeamRows, requirements] = await Promise.all([
    userRepository.getByCompany(companyId),
    userRepository.getByModulePermission(companyId, 'client_mandates', 'Save'),
    teamMemberRepository.getIdsAndUserIdsByManager(template.manager_id),
    clientTeamRepo.getByMandate(mandateId),
    clientRequirementsRepo.getByMandate(template.id),
  ])
  const managerPortalUserIds = new Set(mandateOwnerUsers.map(u => u.id))

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

  return allMembers
    .filter(member => !managerPortalUserIds.has(member.id))
    .filter(member => !alreadyInClientTeam.has(member.id))
    .map(m => {
      const memberTags = parseLowerTags(m.tags)
      const experienceYears = extractExperienceYears(m)
      const matchingRequirements = openRequirements.filter(requirement =>
        requirementMatchesExperience(requirement, experienceYears)
      )

      // Tags from the mandate plus every role the member's experience fits.
      const applicableTags = new Set(templateTags)
      for (const requirement of matchingRequirements) {
        for (const tag of parseLowerTags(requirement.tags)) applicableTags.add(tag)
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
}

// ── Client team ───────────────────────────────────────────────────────────────

// Sign a member's stored client resume path in place. Full URLs pass through.
async function signMemberResume(member) {
  if (member.client_resume_url && !member.client_resume_url.startsWith('http')) {
    const storagePath = member.client_resume_url
    try {
      member.client_resume_url = await storageService.getSignedUrl(member.client_resume_url)
      member.client_resume_download_url = member.client_resume_url
    } catch (e) {
      console.error('Failed to sign client resume url for team member:', e.message)
      member.client_resume_url = null
      member.client_resume_download_url = null
    }
    member.client_resume_storage_path = storagePath
  } else if (member.client_resume_url) {
    member.client_resume_download_url = member.client_resume_url
  }
}

// Every member with a signed resume link and their latest scheduled interview.
async function listTeam(mandateId) {
  const team = await clientTeamRepo.getByMandate(mandateId)

  const interviewMap = {}
  await Promise.all(team.map(async member => {
    const latestInterview = await interviewFlowRepository.getLatestInterviewFeedback(member.id)
    if (latestInterview?.storage_path) {
      latestInterview.feedback_file_url = await storageService.getSignedUrl(latestInterview.storage_path).catch(() => null)
    }
    if (latestInterview) interviewMap[member.id] = latestInterview
    await signMemberResume(member)
  }))

  return team.map(m => ({ ...m, latest_interview: interviewMap[m.id] || null }))
}

/**
 * Add organization users to the mandate. userIds entries are ids or
 * { user_id, requirement_id } objects; a bare id uses the body-level requirement_id.
 * When the mandate has roles, every user needs one. Users already on it are skipped.
 * Everything is validated before anything is written.
 */
async function addTeamMembers(template, mandateId, body, managerId, companyId) {
  const { userIds } = body
  if (!Array.isArray(userIds) || userIds.length === 0) throw httpError(400, 'userIds array is required')

  const requirements = await clientRequirementsRepo.getByMandate(mandateId)

  const normalizedItems = userIds.map(u => {
    const rawReqId = typeof u === 'object'
      ? (u.requirement_id || u.requirementId)
      : (body.requirement_id || body.requirementId)
    return {
      memberId: Number(typeof u === 'object' ? (u.user_id || u.userId) : u),
      reqId: rawReqId == null || rawReqId === '' ? null : Number(rawReqId),
    }
  }).filter(item => Number.isInteger(item.memberId))

  if (normalizedItems.length !== userIds.length) {
    throw httpError(400, 'Every userIds entry must include a valid user_id')
  }

  const companyMembers = await userRepository.getByIdsForCompany(normalizedItems.map(item => item.memberId), companyId)
  const companyMemberIds = new Set(companyMembers.map(member => Number(member.id)))
  if (companyMemberIds.size !== normalizedItems.length) {
    throw httpError(404, 'One or more users are not in your organization')
  }

  const membersToAdd = []
  for (const { memberId, reqId } of normalizedItems) {
    if (requirements.length > 0 && !reqId) {
      throw httpError(400, 'Each user must specify a requirement_id (role)')
    }
    if (reqId && !requirements.find(r => Number(r.id) === Number(reqId))) {
      throw httpError(404, `Requirement profile ${reqId} not found on this mandate`)
    }
    const existing = await clientTeamRepo.getByUserAndMandate(memberId, mandateId)
    if (!existing) membersToAdd.push({ memberId, reqId })
  }

  const added = []
  for (const item of membersToAdd) {
    added.push(await clientTeamRepo.create({
      user_id: item.memberId,
      mandate_id: mandateId,
      requirement_id: item.reqId,
    }))
  }
  if (added.length > 0) await mandateStatusService.recordCandidatesAssigned(mandateId, managerId)
  return added
}

async function updateTeamMember(mandateId, ctId, body) {
  await getMemberForMandate(ctId, mandateId, 'Client team member not found')
  const requirementId = body.requirement_id || body.requirementId || null
  await requirementsService.assertRequirementExists(mandateId, requirementId)
  return clientTeamRepo.update(ctId, mandateId, { requirement_id: requirementId })
}

// Move a member to another role on the same mandate (null clears the role).
async function moveTeamMemberRequirement(mandateId, ctId, body) {
  const requirementId = body.requirement_id || body.requirementId || null
  await requirementsService.assertRequirementExists(mandateId, requirementId)
  const updated = await clientTeamRepo.updateRequirement(ctId, mandateId, requirementId)
  if (!updated) throw httpError(404, 'Client team member not found')
  return updated
}

// Members with interviews that are not completed or cancelled cannot be removed.
async function removeTeamMember(mandateId, ctId) {
  await getMemberForMandate(ctId, mandateId, 'Client team member not found')
  const interviews = await interviewRepository.getByClientTeamId(ctId)
  if (interviews.some(i => i.status !== 'completed' && i.status !== 'cancelled')) {
    throw httpError(409, 'Cannot remove member with active scheduled interviews')
  }
  await clientTeamRepo.remove(ctId, mandateId)
}

// ── Actions ───────────────────────────────────────────────────────────────────

// Email the role's JD (with an optional message and deadline) and mark it sent.
async function sendJdToMember(template, mandateId, ctId, body, companyId) {
  const member = await getMemberForMandate(ctId, mandateId, 'Team member not found')
  const [user] = await userRepository.getByIdsForCompany([member.user_id], companyId)
  if (!user) throw httpError(404, 'User not found')

  await emailService.sendClientJDWithMessage(user.email, {
    candidateName: `${user.first_name} ${user.last_name}`,
    clientName: template.client_name,
    role: requirementDisplay(member, template.requirements),
    jdText: member.requirement_jd_text || template.jd_text || template.requirements || '',
    customMessage: String(body.customMessage || '').trim(),
    deadline: body.deadline,
    frontendUrl: process.env.FRONTEND_URL,
    clientTeamId: ctId,
  })

  return clientTeamRepo.update(ctId, mandateId, {
    jd_sent: true,
    jd_sent_at: new Date().toISOString(),
  })
}

/**
 * Schedule an interview for a member. Human and offline interviews need an interviewer
 * from the organization (not the candidate); human ones also need a meeting link.
 * @returns {Promise<{interview: object, videoLink: string|null}>}
 */
async function scheduleMemberInterview(template, mandateId, ctId, body, managerId, companyId) {
  const {
    type, mode, difficulty, questionCount, scheduledAt, location, manualMeetingUrl,
    durationMinutes, notes, reportUserIds, interviewerUserId,
  } = body

  const teamMember = await getMemberForMandate(ctId, mandateId, 'Team member not found')

  let interviewer = null
  if (type === 'human' || type === 'offline') {
    if (!interviewerUserId) throw httpError(400, 'Select an interviewer')
    interviewer = await userRepository.getByIdForCompany(Number(interviewerUserId), companyId)
    if (!interviewer) throw httpError(404, 'Interviewer not found in your organization')
    if (Number(interviewer.id) === Number(teamMember.user_id)) {
      throw httpError(400, 'Candidate and interviewer must be different people')
    }
  }

  if (type === 'human' && !/^https?:\/\//i.test(String(manualMeetingUrl || '').trim())) {
    throw httpError(400, 'Paste a valid meeting link (starting with http:// or https://).')
  }

  const videoLink = type === 'human' ? String(manualMeetingUrl).trim() : null
  const roleLabel = requirementDisplay(teamMember, template.requirements)
  const scheduleTimezone = body.scheduleTimezone || null

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
      scheduleTimezone,
      companyName:      template.client_name,
      jobTitle:         roleLabel,
      location:         location || null,
      meetingUrl:       videoLink || null,
      calendarEventId:  null,
      details:          notes || null,
      reportUserIds:    Array.isArray(reportUserIds) ? reportUserIds : [],
    },
    managerId,
    companyId
  )

  // Link interview back to the client team row and store scheduled time + video link
  if (interview?.id) {
    await interviewRepository.linkClientTeamSchedule(interview.id, {
      ctId, scheduledAt, location: location || null, meetingUrl: videoLink || null,
    })
    if (interviewer) {
      await interviewFlowRepository.createAssignment({
        stageRunId: null,
        interviewId: interview.id,
        interviewerUserId: interviewer.id,
      })
      interviewFlowService.notifyInterviewer(interview.id, interviewer, {
        interviewerName: fullName(interviewer),
        candidateName: fullName(teamMember),
        clientName: template.client_name,
        stageName: roleLabel,
        scheduledAt,
        scheduleTimezone,
        location: location || null,
        meetingUrl: videoLink || null,
      }).catch(error => console.error('Interviewer notification failed:', error.message))
    }
  }

  return { interview, videoLink }
}

// Legacy: email the mandate JD to several organization users. Unknown users count as failed.
async function sendJdToUsers(template, body, companyId) {
  const { userIds, deadline } = body
  if (!Array.isArray(userIds) || userIds.length === 0) throw httpError(400, 'userIds array is required')

  const companyMembers = await userRepository.getByIdsForCompany(
    [...new Set(userIds.map(Number).filter(Number.isInteger))],
    companyId
  )
  const companyMembersById = new Map(companyMembers.map(member => [Number(member.id), member]))
  const results = await Promise.all(userIds.map(async uid => {
    const user = companyMembersById.get(Number(uid))
    if (!user) return { uid, ok: false }
    try {
      await emailService.sendJDForResumeUpdate(user.email, {
        candidateName: `${user.first_name} ${user.last_name}`,
        clientName: template.client_name,
        role: template.requirements || 'the requirement',
        jdText: template.jd_text || template.requirements || '',
        deadline,
      })
      return { uid, ok: true }
    } catch {
      return { uid, ok: false }
    }
  }))
  return { sent: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length }
}

// ── Assignments (legacy schedule view) ────────────────────────────────────────

async function listAssignments(template, mandateId) {
  return interviewRepository.getByClientTemplateForManager(mandateId, template.manager_id)
}

async function cancelAssignment(mandateId, interviewId, managerId) {
  const cancelled = await interviewRepository.cancelScheduledClientInterview(interviewId, mandateId, managerId)
  if (!cancelled) throw httpError(409, 'Only scheduled client interviews can be cancelled')
  return cancelled
}

// ── Client outcome rounds ─────────────────────────────────────────────────────
// Repository errors ('Invalid outcome...', '...published...', 'Round not found') pass
// through unchanged; the route maps them to HTTP codes.

async function listRounds(mandateId, ctId) {
  return clientOutcomeRoundsRepo.listByClientTeamId(ctId, mandateId)
}

async function createRound(template, mandateId, ctId, body, managerId) {
  if (template.archived_at) throw httpError(409, 'Mandate is archived')
  const round = await clientOutcomeRoundsRepo.create(ctId, mandateId, managerId, body)
  await mandateStatusService.recordInterviewInProgress(mandateId, managerId)
  await mandateStatusService.checkAutoComplete(mandateId, managerId)
  return round
}

async function updateRound(mandateId, ctId, roundId, body, managerId) {
  const round = await clientOutcomeRoundsRepo.update(roundId, ctId, mandateId, managerId, body)
  await mandateStatusService.checkAutoComplete(mandateId, managerId)
  return round
}

async function publishRound(mandateId, ctId, roundId) {
  return clientOutcomeRoundsRepo.publish(roundId, ctId, mandateId)
}

async function unpublishRound(mandateId, ctId, roundId) {
  return clientOutcomeRoundsRepo.unpublish(roundId, ctId, mandateId)
}

module.exports = {
  getMatches,
  listTeam,
  addTeamMembers,
  updateTeamMember,
  moveTeamMemberRequirement,
  removeTeamMember,
  sendJdToMember,
  scheduleMemberInterview,
  sendJdToUsers,
  listAssignments,
  cancelAssignment,
  listRounds,
  createRound,
  updateRound,
  publishRound,
  unpublishRound,
}
