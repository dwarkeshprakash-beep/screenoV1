// backend/src/routes/client-template.routes.js
const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const clientTemplateRepo = require('../repositories/client-template.repository')
const userRepository = require('../repositories/user.repository')
const interviewRepository = require('../repositories/interview.repository')
const emailService = require('../services/email.service')
const llmService = require('../services/llm.service')

const router = express.Router()

router.use(authMiddleware, requireRole('manager'))

function parseTags(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function hasTags(value) {
  return parseTags(value).some(tag => String(tag || '').trim())
}

router.post('/', async (req, res) => {
  try {
    const data = { ...req.body, manager_id: req.user.id }
    
    // Auto-generate tags if a JD is provided and tags are empty
    if (data.jd_text && !hasTags(data.tags)) {
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
    const templateId = parseInt(req.params.id, 10)
    const existing = await clientTemplateRepo.getById(templateId, req.user.id)
    if (!existing) return res.status(404).json({ success: false, error: 'Template not found' })

    const data = { ...req.body }
    const jdChanged = data.jd_text !== undefined
      && String(data.jd_text || '').trim()
      && String(data.jd_text || '') !== String(existing.jd_text || '')
    if (jdChanged && data.tags === undefined) {
      data.tags = await llmService.extractTagsFromText(data.jd_text)
    }

    const template = await clientTemplateRepo.update(templateId, req.user.id, data)
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
    const members = (await userRepository.getByCompany(req.user.companyId))
      .filter(member => member.role !== 'manager')

    const matches = members.map(m => {
      let memberTags = []
      try { memberTags = JSON.parse(m.tags || '[]').map(t => t.toLowerCase()) } catch { memberTags = [] }
      const overlap = templateTags.filter(t => memberTags.includes(t))
      return {
        ...m,
        user_id: m.id,
        match_score: overlap.length,
        matched_tags: overlap,
        recommended: overlap.length > 0,
      }
    }).sort((a, b) =>
      b.match_score - a.match_score
      || String(a.first_name || '').localeCompare(String(b.first_name || ''))
    )

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
    const companyMembers = await userRepository.getByIdsForCompany(
      [...new Set(userIds.map(Number).filter(Number.isInteger))],
      req.user.companyId
    )
    const companyMembersById = new Map(
      companyMembers.map(member => [Number(member.id), member])
    )

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

router.get('/:id/assignments', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id, 10)
    const template = await clientTemplateRepo.getById(templateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' })
    const assignments = await interviewRepository.getByClientTemplateForManager(
      templateId,
      req.user.id
    )
    res.json({ success: true, data: assignments })
  } catch (err) {
    console.error('GET /client-templates/:id/assignments failed:', err)
    res.status(500).json({ success: false, error: 'Could not load client assignments' })
  }
})

router.delete('/:id/assignments/:interviewId', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id, 10)
    const interviewId = parseInt(req.params.interviewId, 10)
    const template = await clientTemplateRepo.getById(templateId, req.user.id)
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' })

    const cancelled = await interviewRepository.cancelScheduledClientInterview(
      interviewId,
      templateId,
      req.user.id
    )
    if (!cancelled) {
      return res.status(409).json({
        success: false,
        error: 'Only scheduled client interviews can be cancelled',
      })
    }
    res.json({ success: true, data: cancelled })
  } catch (err) {
    console.error('DELETE /client-templates/:id/assignments/:interviewId failed:', err)
    res.status(500).json({ success: false, error: 'Could not cancel client assignment' })
  }
})

module.exports = router
