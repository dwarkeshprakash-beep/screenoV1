// backend/src/routes/template.routes.js
// Interview templates. Manager only.

const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const db = require('../db/connection')

const router = express.Router()

router.use(authMiddleware, requireRole('manager'))

// GET /api/templates
router.get('/', async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT * FROM templates WHERE company_id = @companyId ORDER BY created DESC`,
      { companyId: req.user.companyId }
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('GET /templates failed:', err)
    res.status(500).json({ success: false, error: 'Could not load templates' })
  }
})

// POST /api/templates
router.post('/', async (req, res) => {
  try {
    const { name, description, attempts, type, reportAfter, focusPrompt } = req.body

    if (!name) return res.status(400).json({ success: false, error: 'name is required' })

    const rows = await db.query(
      `INSERT INTO templates (company_id, manager_id, name, description, attempts, type, report_after, focus_prompt)
       VALUES (@companyId, @managerId, @name, @description, @attempts, @type, @reportAfter, @focusPrompt)
       RETURNING *`,
      {
        companyId: req.user.companyId,
        managerId: req.user.id,
        name,
        description: description || null,
        attempts: attempts || 3,
        type: type || null,
        reportAfter: reportAfter || 'all',
        focusPrompt: focusPrompt || null,
      }
    )

    res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('POST /templates failed:', err)
    res.status(500).json({ success: false, error: 'Could not create template' })
  }
})

module.exports = router
