// backend/src/routes/module.routes.js
// HTTP only — receive, call moduleService, respond. Read-only: modules are seeded by
// migration, not managed through the UI. Admin-only for now (feeds the ACL module's
// "which module does this ACL gate" picker).

const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const moduleService = require('../services/module.service')

const router = express.Router()
router.use(authMiddleware, requireRole('admin'))

router.get('/', async (req, res) => {
  try {
    const modules = await moduleService.listModules()
    res.json({ success: true, data: modules })
  } catch (err) {
    console.error('GET /modules failed:', err)
    res.status(500).json({ success: false, error: 'Could not load modules' })
  }
})

module.exports = router
