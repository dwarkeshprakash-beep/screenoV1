// backend/src/routes/admin.routes.js
// Admin-only system inspection and emergency controls.

const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const mandateLifecycleService = require('../services/mandate-lifecycle.service')
const db = require('../db/connection')

const router = express.Router()
router.use(authMiddleware, requireRole('admin'))

router.get('/mandates', async (req, res) => {
  try {
    const mandates = await db.query(
      `SELECT
         ct.id, ct.client_name, ct.requirements, ct.headcount, ct.created, ct.archived_at,
         u.id AS manager_id,
         u.first_name AS manager_first_name,
         u.last_name AS manager_last_name,
         u.email AS manager_email,
         c.name AS company_name,
         (SELECT COUNT(*) FROM client_teams team WHERE team.mandate_id = ct.id) AS candidate_count,
         (SELECT COUNT(*) FROM interviews i WHERE i.client_template_id = ct.id) AS interview_count,
         (SELECT COUNT(*) FROM interviews i WHERE i.client_template_id = ct.id AND i.status = 'in_progress') AS active_interview_count
       FROM client_templates ct
       JOIN users u ON u.id = ct.manager_id
       LEFT JOIN companies c ON c.id = u.company_id
       ORDER BY ct.created DESC`,
      {}
    )
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

    const managers = await db.query(
      `SELECT id, role FROM users WHERE id = @id`,
      { id: newManagerId }
    )
    if (managers.length === 0 || managers[0].role !== 'manager') {
      return res.status(400).json({ success: false, error: 'Target user is not a manager' })
    }

    const updated = await db.query(
      `UPDATE client_templates
       SET manager_id = @newManagerId
       WHERE id = @mandateId
       RETURNING *`,
      { mandateId, newManagerId }
    )
    if (updated.length === 0) {
      return res.status(404).json({ success: false, error: 'Mandate not found' })
    }
    res.json({ success: true, data: updated[0] })
  } catch (err) {
    console.error('[Admin] PATCH /mandates/:id/reassign failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not reassign mandate' })
  }
})

router.patch('/mandates/:id/force-status', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const { archived } = req.body
    if (typeof archived !== 'boolean') {
      return res.status(400).json({ success: false, error: 'archived must be boolean' })
    }

    const updated = await db.query(
      `UPDATE client_templates
       SET archived_at = CASE WHEN @archived THEN NOW() ELSE NULL END
       WHERE id = @mandateId
       RETURNING *`,
      { mandateId, archived }
    )
    if (updated.length === 0) {
      return res.status(404).json({ success: false, error: 'Mandate not found' })
    }
    res.json({ success: true, data: updated[0] })
  } catch (err) {
    console.error('[Admin] PATCH /mandates/:id/force-status failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not update mandate status' })
  }
})

router.delete('/mandates/:id/force-delete', async (req, res) => {
  try {
    const mandateId = parseInt(req.params.id, 10)
    const mandate = await db.query(
      `SELECT id, client_name, manager_id FROM client_templates WHERE id = @mandateId`,
      { mandateId }
    )
    if (mandate.length === 0) {
      return res.status(404).json({ success: false, error: 'Mandate not found' })
    }
    if (req.body.confirmText !== mandate[0].client_name) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation text does not match mandate client name',
      })
    }

    const impact = await mandateLifecycleService.getDeletionImpact(mandateId, mandate[0].manager_id)
    await mandateLifecycleService.permanentlyDeleteMandate(mandateId, mandate[0].manager_id)
    res.json({ success: true, data: { deleted: true, impact } })
  } catch (err) {
    console.error('[Admin] DELETE /mandates/:id/force-delete failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not force-delete mandate' })
  }
})

router.get('/interviews', async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status) : null
    const statusFilter = status ? 'WHERE i.status = @status' : ''
    const interviews = await db.query(
      `SELECT
         i.id, i.status, i.type, i.scheduled_at, i.available_from, i.due_at,
         i.client_template_id, i.monthly_assessment_id, i.client_team_id, i.created,
         COALESCE(iu.first_name, ec.first_name) AS first_name,
         COALESCE(iu.last_name, ec.last_name) AS last_name,
         COALESCE(iu.email, ec.email) AS email,
         c.name AS company_name,
         ct.client_name AS mandate_name,
         ma.subject_name AS monthly_subject
       FROM interviews i
       LEFT JOIN users iu ON iu.id = i.internal_user_id
       LEFT JOIN external_candidates ec ON ec.id = i.external_candidate_id
       LEFT JOIN users manager ON manager.id = i.manager_id
       LEFT JOIN companies c ON c.id = manager.company_id
       LEFT JOIN client_templates ct ON ct.id = i.client_template_id
       LEFT JOIN monthly_assessments ma ON ma.id = i.monthly_assessment_id
       ${statusFilter}
       ORDER BY i.created DESC
       LIMIT 100`,
      status ? { status } : {}
    )
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

    const updated = await db.query(
      `UPDATE interviews
       SET status = @status
       WHERE id = @interviewId
       RETURNING *`,
      { interviewId, status: req.body.status }
    )
    if (updated.length === 0) {
      return res.status(404).json({ success: false, error: 'Interview not found' })
    }
    res.json({ success: true, data: updated[0] })
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

    const updated = await db.query(
      `UPDATE client_teams
       SET status = @status,
           notes = COALESCE(@notes, notes)
       WHERE id = @clientTeamId
       RETURNING *`,
      { clientTeamId, status: req.body.status, notes: req.body.notes || null }
    )
    if (updated.length === 0) {
      return res.status(404).json({ success: false, error: 'Client team member not found' })
    }
    res.json({ success: true, data: updated[0] })
  } catch (err) {
    console.error('[Admin] PATCH /client-teams/:id/force-status failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not update client team status' })
  }
})

router.post('/client-teams/:id/reassign-requirement', async (req, res) => {
  try {
    const clientTeamId = parseInt(req.params.id, 10)
    const requirementId = req.body.requirementId ? Number(req.body.requirementId) : null
    const current = await db.query(
      `SELECT id, mandate_id FROM client_teams WHERE id = @clientTeamId`,
      { clientTeamId }
    )
    if (current.length === 0) {
      return res.status(404).json({ success: false, error: 'Client team member not found' })
    }

    if (requirementId) {
      const requirement = await db.query(
        `SELECT id FROM client_mandate_requirements
         WHERE id = @requirementId
           AND mandate_id = @mandateId`,
        { requirementId, mandateId: current[0].mandate_id }
      )
      if (requirement.length === 0) {
        return res.status(400).json({ success: false, error: 'Requirement does not belong to this mandate' })
      }
    }

    const updated = await db.query(
      `UPDATE client_teams
       SET requirement_id = @requirementId
       WHERE id = @clientTeamId
       RETURNING *`,
      { clientTeamId, requirementId }
    )
    res.json({ success: true, data: updated[0] })
  } catch (err) {
    console.error('[Admin] POST /client-teams/:id/reassign-requirement failed:', err.message)
    res.status(500).json({ success: false, error: 'Could not reassign requirement' })
  }
})

router.get('/broken-states', async (req, res) => {
  try {
    const issues = []

    const orphanedMandates = await db.query(
      `SELECT ct.id, ct.client_name, ct.manager_id
       FROM client_templates ct
       LEFT JOIN users u ON u.id = ct.manager_id
       WHERE u.id IS NULL`,
      {}
    )
    if (orphanedMandates.length > 0) {
      issues.push({
        type: 'orphaned_mandates',
        count: orphanedMandates.length,
        items: orphanedMandates,
        description: 'Mandates with deleted or missing managers',
      })
    }

    const invalidRequirements = await db.query(
      `SELECT ct.id, ct.mandate_id, ct.user_id, ct.requirement_id
       FROM client_teams ct
       WHERE ct.requirement_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1
           FROM client_mandate_requirements cmr
           WHERE cmr.id = ct.requirement_id
             AND cmr.mandate_id = ct.mandate_id
         )`,
      {}
    )
    if (invalidRequirements.length > 0) {
      issues.push({
        type: 'invalid_requirements',
        count: invalidRequirements.length,
        items: invalidRequirements,
        description: 'Client team members with invalid requirement references',
      })
    }

    const stuckInterviews = await db.query(
      `SELECT id, status, type, scheduled_at, created
       FROM interviews
       WHERE status = 'in_progress'
         AND created < NOW() - INTERVAL '7 days'`,
      {}
    )
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
