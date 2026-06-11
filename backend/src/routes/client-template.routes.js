// backend/src/routes/client-template.routes.js
const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const clientTemplateRepo = require('../repositories/client-template.repository')
const llmService = require('../services/llm.service')

const router = express.Router()

router.use(authMiddleware, requireRole('manager'))

router.post('/', async (req, res) => {
  try {
    const data = { ...req.body, manager_id: req.user.id }
    
    // Auto-generate tags if a JD is provided and tags are empty
    if (data.jd_text && (!data.tags || data.tags.length === 0)) {
      data.tags = await llmService.extractTagsFromText(data.jd_text)
    }

    const template = await clientTemplateRepo.create(data)
    res.status(201).json({ success: true, data: template })
  } catch (err) {
    console.error('POST /client-templates failed:', err)
    res.status(500).json({ success: false, error: 'Could not create template' })
  }
})

router.get('/', async (req, res) => {
  try {
    const templates = await clientTemplateRepo.getByManager(req.user.id)
    res.json({ success: true, data: templates })
  } catch (err) {
    console.error('GET /client-templates failed:', err)
    res.status(500).json({ success: false, error: 'Could not load templates' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const template = await clientTemplateRepo.getById(parseInt(req.params.id, 10), req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' })
    res.json({ success: true, data: template })
  } catch (err) {
    console.error('GET /client-templates/:id failed:', err)
    res.status(500).json({ success: false, error: 'Could not load template' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const template = await clientTemplateRepo.update(parseInt(req.params.id, 10), req.user.id, req.body)
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' })
    res.json({ success: true, data: template })
  } catch (err) {
    console.error('PATCH /client-templates/:id failed:', err)
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
    console.error('POST /extract-tags failed:', err)
    res.status(500).json({ success: false, error: 'Could not extract tags' })
  }
})

module.exports = router
