const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const { documentUpload } = require('../middleware/upload')
const flowService = require('../services/interview-flow.service')

const router = express.Router()
router.use(authMiddleware)

/** Create an ordered flow for a client mandate. */
router.post('/', requireRole('manager'), async (req, res) => {
  try {
    const flow = await flowService.createFlow(req.body, req.user.id, req.user.companyId)
    res.status(201).json({ success: true, data: flow })
  } catch (err) {
    console.error('POST /interview-flows failed:', err.message)
    res.status(/not found/i.test(err.message) ? 404 : 400).json({ success: false, error: err.message })
  }
})

/** Edit a saved flow definition. */
router.patch('/:flowId', requireRole('manager'), async (req, res) => {
  try {
    const flow = await flowService.updateFlow(req.params.flowId, req.body, req.user.id, req.user.companyId)
    res.json({ success: true, data: flow })
  } catch (err) {
    console.error('PATCH /interview-flows/:flowId failed:', err.message)
    res.status(/not found/i.test(err.message) ? 404 : 400).json({ success: false, error: err.message })
  }
})

/** Delete an unused saved flow definition. */
router.delete('/:flowId', requireRole('manager'), async (req, res) => {
  try {
    const result = await flowService.deleteFlow(req.params.flowId, req.user.id)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('DELETE /interview-flows/:flowId failed:', err.message)
    res.status(409).json({ success: false, error: err.message })
  }
})

/** List definitions for an owned mandate. */
router.get('/mandate/:mandateId', requireRole('manager'), async (req, res) => {
  try {
    const flows = await flowService.listFlows(req.params.mandateId, req.user.id)
    res.json({ success: true, data: flows })
  } catch (err) {
    console.error('GET /interview-flows/mandate failed:', err.message)
    res.status(404).json({ success: false, error: err.message })
  }
})

/** List candidate run progress and interviewer feedback for a mandate. */
router.get('/mandate/:mandateId/runs', requireRole('manager'), async (req, res) => {
  try {
    const runs = await flowService.listRuns(req.params.mandateId, req.user.id)
    res.json({ success: true, data: runs })
  } catch (err) {
    console.error('GET /interview-flows/mandate/runs failed:', err.message)
    res.status(404).json({ success: false, error: err.message })
  }
})

/** List one-off and flow-generated schedules for an owned mandate. */
router.get('/mandate/:mandateId/schedules', requireRole('manager'), async (req, res) => {
  try {
    const schedules = await flowService.listSchedules(req.params.mandateId, req.user.id)
    res.json({ success: true, data: schedules })
  } catch (err) {
    console.error('GET /interview-flows/mandate/schedules failed:', err.message)
    res.status(404).json({ success: false, error: err.message })
  }
})

/** Start a flow for one candidate already on the mandate team. */
router.post('/:flowId/runs', requireRole('manager'), async (req, res) => {
  try {
    const run = await flowService.startRun(req.params.flowId, req.body.clientTeamId, req.user.id, req.user.companyId)
    res.status(201).json({ success: true, data: run })
  } catch (err) {
    console.error('POST /interview-flows/:flowId/runs failed:', err.message)
    res.status(/not found|not part/i.test(err.message) ? 404 : 400).json({ success: false, error: err.message })
  }
})

/** Load one candidate's isolated flow definition for editing. */
router.get('/runs/:runId/definition', requireRole('manager'), async (req, res) => {
  try {
    const flow = await flowService.getRunFlow(req.params.runId, req.user.id)
    res.json({ success: true, data: flow })
  } catch (err) {
    res.status(404).json({ success: false, error: err.message })
  }
})

/** Edit only this candidate's flow without changing the reusable template. */
router.patch('/runs/:runId/definition', requireRole('manager'), async (req, res) => {
  try {
    const flow = await flowService.updateRunFlow(
      req.params.runId,
      req.body,
      req.user.id,
      req.user.companyId
    )
    res.json({ success: true, data: flow })
  } catch (err) {
    console.error('PATCH /interview-flows/runs/:runId/definition failed:', err.message)
    res.status(/not found/i.test(err.message) ? 404 : 400).json({ success: false, error: err.message })
  }
})

/** Retry the paused stage at a manager-selected future time. */
router.post('/runs/:runId/retry', requireRole('manager'), async (req, res) => {
  try {
    const result = await flowService.retryRun(req.params.runId, req.body.scheduledAt, req.user.id, req.user.companyId)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('POST /interview-flows/runs/:runId/retry failed:', err.message)
    res.status(400).json({ success: false, error: err.message })
  }
})

/** Override a failed pass gate and activate the next stage. */
router.post('/runs/:runId/continue', requireRole('manager'), async (req, res) => {
  try {
    const result = await flowService.continueRun(req.params.runId, req.user.id, req.user.companyId)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('POST /interview-flows/runs/:runId/continue failed:', err.message)
    res.status(400).json({ success: false, error: err.message })
  }
})

/** Permanently delete one candidate's flow and its generated interviews. */
router.delete('/runs/:runId', requireRole('manager'), async (req, res) => {
  try {
    const result = await flowService.deleteRun(req.params.runId, req.user.id)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('DELETE /interview-flows/runs/:runId failed:', err.message)
    res.status(/not found/i.test(err.message) ? 404 : 409).json({ success: false, error: err.message })
  }
})

/** Candidate accounts can see all interviews assigned to them as interviewer. */
router.get('/my-assignments', requireRole('candidate', 'manager'), async (req, res) => {
  try {
    const assignments = await flowService.listAssignments(req.user.id)
    res.json({ success: true, data: assignments })
  } catch (err) {
    console.error('GET /interview-flows/my-assignments failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not load interviewer assignments' })
  }
})

/** A completed interviewer may edit only the written comment. */
router.patch('/assignments/:assignmentId/feedback', requireRole('candidate', 'manager'), async (req, res) => {
  try {
    const updated = await flowService.updateAssignmentFeedback(
      req.params.assignmentId,
      req.user.id,
      req.body
    )
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('PATCH /interview-flows/assignments/feedback failed:', err.message)
    res.status(/not found/i.test(err.message) ? 404 : 400).json({ success: false, error: err.message })
  }
})

/** Complete human/offline work with optional feedback document. */
router.post('/assignments/:assignmentId/complete', requireRole('candidate', 'manager'), documentUpload.single('file'), async (req, res) => {
  try {
    const completed = await flowService.completeAssignment(req.params.assignmentId, req.user.id, req.body, req.file)
    res.json({ success: true, data: completed })
  } catch (err) {
    console.error('POST /interview-flows/assignments/complete failed:', err.message)
    res.status(/not found/i.test(err.message) ? 404 : 400).json({ success: false, error: err.message })
  }
})

module.exports = router
