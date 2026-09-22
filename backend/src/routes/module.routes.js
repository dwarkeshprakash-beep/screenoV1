// backend/src/routes/module.routes.js
// HTTP only - receive, call moduleService, respond. Modules are seeded by migration and
// mostly fixed - the key can never change, but the display name can be renamed here.
// Admin-only (feeds the ACL module's "which module does this ACL gate" picker).

const express = require('express')
const authMiddleware = require('../middleware/auth')
const { loadAccess, requirePlatformAdmin } = require('../middleware/access')
const moduleService = require('../services/module.service')

const router = express.Router()
router.use(authMiddleware, loadAccess, requirePlatformAdmin)

const BAD_REQUEST_MESSAGES = ['Module name is required', 'Module name is too long']

function sendModuleError(res, err, fallback) {
  if (err.message === 'Module not found') {
    return res.status(404).json({ success: false, error: err.message })
  }
  if (BAD_REQUEST_MESSAGES.includes(err.message)) {
    return res.status(400).json({ success: false, error: err.message })
  }
  return res.status(500).json({ success: false, error: fallback })
}

router.get('/', async (req, res) => {
  try {
    const modules = await moduleService.listModules()
    res.json({ success: true, data: modules })
  } catch (err) {
    console.error('GET /modules failed:', err)
    res.status(500).json({ success: false, error: 'Could not load modules' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const module_ = await moduleService.updateModule(Number(req.params.id), req.body)
    res.json({ success: true, data: module_ })
  } catch (err) {
    sendModuleError(res, err, 'Could not update module')
  }
})

module.exports = router
