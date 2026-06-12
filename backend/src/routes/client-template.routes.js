// backend/src/routes/client-template.routes.js
const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const clientTemplateRepo = require('../repositories/client-template.repository')
const teamMemberRepository = require('../repositories/team-member.repository')
const userRepository = require('../repositories/user.repository')
const emailService = require('../services/email.service')
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

// GET /api/templates/client/:id/matches — team members whose tags overlap with the template tags
router.get('/:id/matches', async (req, res) => {
  try {
    const template = await clientTemplateRepo.getById(parseInt(req.params.id, 10), req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' })

    let templateTags = []
    try { templateTags = JSON.parse(template.tags || '[]').map(t => t.toLowerCase()) } catch { templateTags = [] }
    const members = await teamMemberRepository.getByManager(req.user.id)

    const matches = members.map(m => {
      let memberTags = []
      try { memberTags = JSON.parse(m.tags || '[]').map(t => t.toLowerCase()) } catch { memberTags = [] }
      const overlap = templateTags.filter(t => memberTags.includes(t))
      return { ...m, match_score: overlap.length, matched_tags: overlap }
    }).filter(m => m.match_score > 0).sort((a, b) => b.match_score - a.match_score)

    res.json({ success: true, data: matches })
  } catch (err) {
    console.error('GET /client-templates/:id/matches failed:', err)
    res.status(500).json({ success: false, error: 'Could not load matches' })
  }
})

// POST /api/templates/client/:id/send-jd — email JD + resume deadline to selected team members
router.post('/:id/send-jd', async (req, res) => {
  try {
    const template = await clientTemplateRepo.getById(parseInt(req.params.id, 10), req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' })

    const { userIds, deadline } = req.body
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, error: 'userIds array is required' })
    }

    // Save deadline on the template if provided
    if (deadline) {
      await clientTemplateRepo.update(template.id, req.user.id, { resume_deadline: deadline })
    }

    // Fetch all company members first — prevents cross-company email exfiltration
    const companyMembers = await teamMemberRepository.getByManager(req.user.id)
    const validUserIds = new Set(companyMembers.map(m => m.user_id))

    const results = await Promise.all(
      userIds.map(async uid => {
        if (!validUserIds.has(uid)) return { uid, ok: false }
        const user = await userRepository.getById(uid)
        if (!user) return { uid, ok: false }
        try {
          await emailService.sendJDForResumeUpdate(user.email, {
            candidateName: `${user.first_name} ${user.last_name}`,
            clientName: template.client_name,
            jdText: template.jd_text || template.requirements || '',
            deadline: deadline || template.resume_deadline,
          })
          return { uid, ok: true }
        } catch {
          return { uid, ok: false }
        }
      })
    )

    const sent = results.filter(r => r.ok).length
    const failed = results.filter(r => !r.ok).length
    res.json({ success: true, data: { sent, failed } })
  } catch (err) {
    console.error('POST /client-templates/:id/send-jd failed:', err)
    res.status(500).json({ success: false, error: 'Could not send JD emails' })
  }
})

module.exports = router
