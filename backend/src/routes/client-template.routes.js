const express = require('express')
const authMiddleware = require('../middleware/auth')
const { loadAccess, requireModule } = require('../middleware/access')
const accessService = require('../services/access.service')
const mandateService = require('../services/client-mandate.service')
const requirementsService = require('../services/client-mandate-requirements.service')
const mandateTeamService = require('../services/client-mandate-team.service')

const router = express.Router()

router.use(authMiddleware, loadAccess, requireModule('client_mandates'))

// Who is asking, for the service layer's visibility rules (see client-mandate.service.js).
function mandateViewer(req) {
  return {
    userId: req.user.id,
    companyId: req.user.companyId,
    accessCompanyId: req.access.companyId,
    viewAll: accessService.hasModulePermission(req.access, 'client_mandates', 'View All'),
  }
}

function idParam(req, name) {
  return parseInt(req.params[name], 10)
}

// Expected service failures carry httpStatus; anything else is logged and returned as a 500.
function sendMandateError(res, err, logLabel, fallbackMessage) {
  if (err.httpStatus) return res.status(err.httpStatus).json({ success: false, error: err.message })
  console.error(`${logLabel} failed:`, err.message)
  res.status(500).json({ success: false, error: fallbackMessage })
}

// ── Mandate CRUD ──────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    const template = await mandateService.createMandate(req.body, mandateViewer(req))
    res.status(201).json({ success: true, data: template })
  } catch (err) {
    sendMandateError(res, err, 'POST /client-templates', 'Could not create template')
  }
})

router.get('/', async (req, res) => {
  try {
    const templates = await mandateService.listMandates(mandateViewer(req), String(req.query.state || 'active'))
    res.json({ success: true, data: templates })
  } catch (err) {
    sendMandateError(res, err, 'GET /client-templates', 'Could not load templates')
  }
})

// Registered before /:id so Express doesn't treat "managers" as a mandate id.
router.get('/managers', async (req, res) => {
  try {
    const managers = await mandateService.listManagers(req.user.companyId)
    res.json({ success: true, data: managers })
  } catch (err) {
    sendMandateError(res, err, 'GET /client-templates/managers', 'Could not load managers')
  }
})

// Registered before /:id so Express doesn't treat "bdes" as a mandate id.
router.get('/bdes', async (req, res) => {
  try {
    const bdes = await mandateService.listBdes(req.user.companyId)
    res.json({ success: true, data: bdes })
  } catch (err) {
    sendMandateError(res, err, 'GET /client-templates/bdes', 'Could not load BDEs')
  }
})

router.post('/:id/archive', async (req, res) => {
  try {
    const template = await mandateService.archiveMandate(idParam(req, 'id'), req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' })
    res.json({ success: true, data: template })
  } catch (err) {
    sendMandateError(res, err, 'POST /client-templates/:id/archive', 'Could not archive template')
  }
})

router.post('/:id/restore', async (req, res) => {
  try {
    const template = await mandateService.restoreMandate(idParam(req, 'id'), req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' })
    res.json({ success: true, data: template })
  } catch (err) {
    sendMandateError(res, err, 'POST /client-templates/:id/restore', 'Could not restore template')
  }
})

// ?preview=true returns the deletion impact without deleting.
router.delete('/:id', async (req, res) => {
  try {
    const data = await mandateService.deleteMandate(idParam(req, 'id'), req.user.id, req.query.preview === 'true')
    res.json({ success: true, data })
  } catch (err) {
    if (err.httpStatus) return sendMandateError(res, err)
    console.error('DELETE /client-templates/:id failed:', err.message)
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: 'Template not found' })
    }
    res.status(500).json({ success: false, error: 'Could not permanently delete template' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const template = await mandateService.getMandate(idParam(req, 'id'), mandateViewer(req))
    res.json({ success: true, data: template })
  } catch (err) {
    sendMandateError(res, err, 'GET /client-templates/:id', 'Could not load template')
  }
})

router.get('/:id/status', async (req, res) => {
  try {
    const summary = await mandateService.getMandateStatus(idParam(req, 'id'), mandateViewer(req))
    res.json({ success: true, data: summary })
  } catch (err) {
    sendMandateError(res, err, 'GET /client-templates/:id/status', 'Could not load mandate status')
  }
})

// Owning-manager only manual "complete" override.
router.post('/:id/status/complete', async (req, res) => {
  try {
    const summary = await mandateService.completeMandate(idParam(req, 'id'), req.user.id)
    res.json({ success: true, data: summary })
  } catch (err) {
    sendMandateError(res, err, 'POST /client-templates/:id/status/complete', 'Could not mark mandate complete')
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const template = await mandateService.updateMandate(idParam(req, 'id'), req.body, mandateViewer(req))
    res.json({ success: true, data: template })
  } catch (err) {
    sendMandateError(res, err, 'PATCH /client-templates/:id', 'Could not update template')
  }
})

router.post('/extract-tags', async (req, res) => {
  try {
    const { text } = req.body
    if (!text) return res.status(400).json({ success: false, error: 'Text required' })
    const tags = await mandateService.extractTags(text)
    res.json({ success: true, data: tags })
  } catch (err) {
    sendMandateError(res, err, 'POST /extract-tags', 'Could not extract tags')
  }
})

// ── Requirement profiles ──────────────────────────────────────────────────────
// Any viewer of the mandate (owner or collaborator) may manage its profiles one at a time.

router.get('/:id/requirements', async (req, res) => {
  try {
    const mandateId = idParam(req, 'id')
    await mandateService.getVisibleMandate(mandateId, mandateViewer(req))
    const requirements = await requirementsService.listRequirements(mandateId)
    res.json({ success: true, data: requirements })
  } catch (err) {
    sendMandateError(res, err, 'GET /requirements', 'Could not load requirements')
  }
})

router.post('/:id/requirements', async (req, res) => {
  try {
    const template = await mandateService.getEditableVisibleMandate(idParam(req, 'id'), mandateViewer(req))
    const requirement = await requirementsService.createRequirement(template, req.body)
    res.status(201).json({ success: true, data: requirement })
  } catch (err) {
    sendMandateError(res, err, 'POST /requirements', 'Could not create requirement')
  }
})

router.patch('/:id/requirements/:rqId', async (req, res) => {
  try {
    const template = await mandateService.getEditableVisibleMandate(idParam(req, 'id'), mandateViewer(req))
    const updated = await requirementsService.updateRequirement(template, idParam(req, 'rqId'), req.body)
    res.json({ success: true, data: updated })
  } catch (err) {
    sendMandateError(res, err, 'PATCH /requirements/:id', 'Could not update requirement')
  }
})

router.delete('/:id/requirements/:rqId', async (req, res) => {
  try {
    const template = await mandateService.getEditableVisibleMandate(idParam(req, 'id'), mandateViewer(req))
    await requirementsService.deleteRequirement(template, idParam(req, 'rqId'))
    res.json({ success: true })
  } catch (err) {
    sendMandateError(res, err, 'DELETE /requirements/:id', 'Could not delete requirement')
  }
})

// ── Candidate matches (for browsing/adding prospects) ────────────────────────
// Returns all org members with tag match score and in_team flag.
// Team members are recommended for AI matching; other members shown on demand.

router.get('/:id/matches', async (req, res) => {
  try {
    const mandateId = idParam(req, 'id')
    const template = await mandateService.getVisibleMandate(mandateId, mandateViewer(req), 'Template not found')
    const matches = await mandateTeamService.getMatches(template, mandateId, req.user.companyId)
    res.json({ success: true, data: matches })
  } catch (err) {
    sendMandateError(res, err, 'GET /client-templates/:id/matches', 'Could not load matches')
  }
})

// ── Client team (prospects) ───────────────────────────────────────────────────
// Reading the team is open to any viewer; changing it is owner-only.

router.get('/:id/team', async (req, res) => {
  try {
    const mandateId = idParam(req, 'id')
    await mandateService.getVisibleMandate(mandateId, mandateViewer(req))
    const team = await mandateTeamService.listTeam(mandateId)
    res.json({ success: true, data: team })
  } catch (err) {
    sendMandateError(res, err, 'GET /client-templates/:id/team', 'Could not load client team')
  }
})

router.post('/:id/team', async (req, res) => {
  try {
    const mandateId = idParam(req, 'id')
    const template = await mandateService.getEditableOwnedMandate(mandateId, req.user.id)
    const added = await mandateTeamService.addTeamMembers(template, mandateId, req.body, req.user.id, req.user.companyId)
    res.status(201).json({ success: true, data: added })
  } catch (err) {
    sendMandateError(res, err, 'POST /team', 'Could not add members to client team')
  }
})

router.patch('/:id/team/:ctId', async (req, res) => {
  try {
    const mandateId = idParam(req, 'id')
    await mandateService.getEditableOwnedMandate(mandateId, req.user.id)
    const updated = await mandateTeamService.updateTeamMember(mandateId, idParam(req, 'ctId'), req.body)
    res.json({ success: true, data: updated })
  } catch (err) {
    sendMandateError(res, err, 'PATCH /team/:ctId', 'Could not update client team member')
  }
})

// Move a member to another requirement profile (role)
router.patch('/:id/team/:ctId/requirement', async (req, res) => {
  try {
    const mandateId = idParam(req, 'id')
    await mandateService.getEditableOwnedMandate(mandateId, req.user.id)
    const updated = await mandateTeamService.moveTeamMemberRequirement(mandateId, idParam(req, 'ctId'), req.body)
    res.json({ success: true, data: updated })
  } catch (err) {
    sendMandateError(res, err, 'PATCH /team/:ctId/requirement', 'Could not update requirement for client team member')
  }
})

router.delete('/:id/team/:ctId', async (req, res) => {
  try {
    const mandateId = idParam(req, 'id')
    await mandateService.getEditableOwnedMandate(mandateId, req.user.id)
    await mandateTeamService.removeTeamMember(mandateId, idParam(req, 'ctId'))
    res.json({ success: true })
  } catch (err) {
    sendMandateError(res, err, 'DELETE /team/:ctId', 'Could not remove member from client team')
  }
})

// ── Actions ───────────────────────────────────────────────────────────────────

router.post('/:id/team/:ctId/send-jd', async (req, res) => {
  try {
    const mandateId = idParam(req, 'id')
    const template = await mandateService.getEditableOwnedMandate(mandateId, req.user.id)
    const updated = await mandateTeamService.sendJdToMember(template, mandateId, idParam(req, 'ctId'), req.body, req.user.companyId)
    res.json({ success: true, data: updated })
  } catch (err) {
    sendMandateError(res, err, 'POST /team/:ctId/send-jd', 'Could not send JD')
  }
})

router.post('/:id/team/:ctId/schedule', async (req, res) => {
  try {
    const mandateId = idParam(req, 'id')
    const template = await mandateService.getEditableOwnedMandate(mandateId, req.user.id)
    const { interview, videoLink } = await mandateTeamService.scheduleMemberInterview(
      template, mandateId, idParam(req, 'ctId'), req.body, req.user.id, req.user.companyId
    )
    res.status(201).json({ success: true, data: interview, videoLink })
  } catch (err) {
    if (err.httpStatus) return sendMandateError(res, err)
    // Scheduling errors are user-facing (e.g. slot validation), so their message is returned.
    console.error('POST /team/:ctId/schedule failed:', err.message)
    res.status(500).json({ success: false, error: err.message || 'Could not schedule interview' })
  }
})

// Legacy: send JD to multiple org members

router.post('/:id/send-jd', async (req, res) => {
  try {
    const template = await mandateService.getEditableOwnedMandate(idParam(req, 'id'), req.user.id, 'Template not found')
    const result = await mandateTeamService.sendJdToUsers(template, req.body, req.user.companyId)
    res.json({ success: true, data: result })
  } catch (err) {
    sendMandateError(res, err, 'POST /send-jd', 'Could not send JD emails')
  }
})

// ── Assignments (legacy schedule view) ───────────────────────────────────────

router.get('/:id/assignments', async (req, res) => {
  try {
    const mandateId = idParam(req, 'id')
    const template = await mandateService.getVisibleMandate(mandateId, mandateViewer(req), 'Template not found')
    const assignments = await mandateTeamService.listAssignments(template, mandateId)
    res.json({ success: true, data: assignments })
  } catch (err) {
    sendMandateError(res, err, 'GET /assignments', 'Could not load client assignments')
  }
})

router.delete('/:id/assignments/:interviewId', async (req, res) => {
  try {
    const mandateId = idParam(req, 'id')
    await mandateService.getEditableOwnedMandate(mandateId, req.user.id, 'Template not found')
    const cancelled = await mandateTeamService.cancelAssignment(mandateId, idParam(req, 'interviewId'), req.user.id)
    res.json({ success: true, data: cancelled })
  } catch (err) {
    sendMandateError(res, err, 'DELETE /assignments/:interviewId', 'Could not cancel client assignment')
  }
})

// ── Client outcome rounds (replaces single-record model) ────────────────────────────
// Access pattern: /:id/team/:ctId/rounds/*
// Any viewer may read rounds; only the owning manager may change them.

router.get('/:id/team/:ctId/rounds', async (req, res) => {
  try {
    const mandateId = idParam(req, 'id')
    await mandateService.getVisibleMandate(mandateId, mandateViewer(req))
    const rounds = await mandateTeamService.listRounds(mandateId, idParam(req, 'ctId'))
    res.json({ success: true, data: rounds })
  } catch (err) {
    sendMandateError(res, err, 'GET /:id/team/:ctId/rounds', 'Could not load outcome rounds')
  }
})

router.post('/:id/team/:ctId/rounds', async (req, res) => {
  try {
    const mandateId = idParam(req, 'id')
    const template = await mandateService.getOwnedMandate(mandateId, req.user.id)
    const round = await mandateTeamService.createRound(template, mandateId, idParam(req, 'ctId'), req.body, req.user.id)
    res.status(201).json({ success: true, data: round })
  } catch (err) {
    if (err.httpStatus) return sendMandateError(res, err)
    console.error('POST /:id/team/:ctId/rounds failed:', err.message)
    const status = err.message.includes('Invalid outcome') ? 400 : 500
    res.status(status).json({ success: false, error: err.message || 'Could not create round' })
  }
})

router.patch('/:id/team/:ctId/rounds/:roundId', async (req, res) => {
  try {
    const mandateId = idParam(req, 'id')
    await mandateService.getOwnedMandate(mandateId, req.user.id)
    const round = await mandateTeamService.updateRound(mandateId, idParam(req, 'ctId'), idParam(req, 'roundId'), req.body, req.user.id)
    res.json({ success: true, data: round })
  } catch (err) {
    if (err.httpStatus) return sendMandateError(res, err)
    console.error('PATCH /:id/team/:ctId/rounds/:roundId failed:', err.message)
    const status = err.message.includes('published') ? 409 : err.message.includes('Invalid') ? 400 : 500
    res.status(status).json({ success: false, error: err.message || 'Could not update round' })
  }
})

router.post('/:id/team/:ctId/rounds/:roundId/publish', async (req, res) => {
  try {
    const mandateId = idParam(req, 'id')
    await mandateService.getOwnedMandate(mandateId, req.user.id)
    const round = await mandateTeamService.publishRound(mandateId, idParam(req, 'ctId'), idParam(req, 'roundId'))
    res.json({ success: true, data: round })
  } catch (err) {
    if (err.httpStatus) return sendMandateError(res, err)
    console.error('POST /:id/team/:ctId/rounds/:roundId/publish failed:', err.message)
    res.status(err.message === 'Round not found' ? 404 : 500).json({ success: false, error: err.message })
  }
})

router.post('/:id/team/:ctId/rounds/:roundId/unpublish', async (req, res) => {
  try {
    const mandateId = idParam(req, 'id')
    await mandateService.getOwnedMandate(mandateId, req.user.id)
    const round = await mandateTeamService.unpublishRound(mandateId, idParam(req, 'ctId'), idParam(req, 'roundId'))
    res.json({ success: true, data: round })
  } catch (err) {
    if (err.httpStatus) return sendMandateError(res, err)
    console.error('POST /:id/team/:ctId/rounds/:roundId/unpublish failed:', err.message)
    res.status(err.message === 'Round not found' ? 404 : 500).json({ success: false, error: err.message })
  }
})

module.exports = router
