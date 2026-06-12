const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const monthlyAssessmentRepository = require('../repositories/monthly-assessment.repository')
const monthlyAssessmentService = require('../services/monthly-assessment.service')
const llmService = require('../services/llm.service')

const router = express.Router()

router.use(authMiddleware, requireRole('manager'))

router.post('/', async (req, res) => {
  try {
    const assessment = await monthlyAssessmentService.createAssessment(req.body, req.user.id)
    res.status(201).json({ success: true, data: assessment })
  } catch (err) {
    console.error('POST /monthly-assessments failed:', err)
    if (err.message.startsWith('Forbidden')) {
      return res.status(403).json({ success: false, error: err.message })
    }
    if (['At least one team member is required', 'Subject is required'].includes(err.message)) {
      return res.status(400).json({ success: false, error: err.message })
    }
    res.status(500).json({ success: false, error: 'Could not create assessment' })
  }
})

router.get('/', async (req, res) => {
  try {
    const assessments = await monthlyAssessmentService.getAssessments(req.user.id)
    res.json({ success: true, data: assessments })
  } catch (err) {
    console.error('GET /monthly-assessments failed:', err)
    res.status(500).json({ success: false, error: 'Could not load assessments' })
  }
})

router.get('/calendar', async (req, res) => {
  try {
    const rows = await monthlyAssessmentRepository.getCalendarByManager(req.user.id)
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('GET /monthly-assessments/calendar failed:', err)
    res.status(500).json({ success: false, error: 'Could not load calendar' })
  }
})

router.post('/generate-subtopics', async (req, res) => {
  try {
    const { subject, topic, difficulty } = req.body
    if (!subject || !topic) {
      return res.status(400).json({ success: false, error: 'subject and topic are required' })
    }
    const subTopics = await llmService.generateSubtopics(subject, topic, difficulty)
    res.json({ success: true, data: subTopics })
  } catch (err) {
    console.error('POST /generate-subtopics failed:', err)
    res.status(500).json({ success: false, error: 'Could not generate subtopics' })
  }
})

router.post('/generate-jd', async (req, res) => {
  try {
    const { subject, subTopics, difficulty } = req.body
    if (!subject || !Array.isArray(subTopics) || subTopics.length === 0) {
      return res.status(400).json({ success: false, error: 'subject and subTopics are required' })
    }
    const jd = await llmService.generateJDFromTopics(subject, subTopics, difficulty)
    res.json({ success: true, data: jd })
  } catch (err) {
    console.error('POST /generate-jd failed:', err)
    res.status(500).json({ success: false, error: 'Could not generate JD' })
  }
})

module.exports = router
