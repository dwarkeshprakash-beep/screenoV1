// backend/src/routes/monthly-assessment.routes.js
const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const monthlyRepo = require('../repositories/monthly-assessment.repository')
const llmService = require('../services/llm.service')

const router = express.Router()

router.use(authMiddleware, requireRole('manager'))

router.post('/', async (req, res) => {
  try {
    const data = { ...req.body, manager_id: req.user.id }
    // Normalize frontend field aliases to repo-expected names
    if (!data.subject_name && data.subject) data.subject_name = data.subject
    if (!data.ai_generated_jd && data.jd_text) data.ai_generated_jd = data.jd_text
    if (typeof data.sub_topics === 'string') {
      try { data.sub_topics = JSON.parse(data.sub_topics) } catch { data.sub_topics = [] }
    }
    if (typeof data.topics === 'string') {
      try { data.topics = JSON.parse(data.topics) } catch { data.topics = [] }
    }
    const assessment = await monthlyRepo.create(data)

    if (data.team_member_ids && Array.isArray(data.team_member_ids)) {
      const month_progress = new Array(data.duration_months || 1).fill('pending')
      await Promise.all(data.team_member_ids.map(tmid =>
        monthlyRepo.createEnrollment({
          assessment_id: assessment.id,
          team_member_id: tmid,
          month_progress
        })
      ))
    }

    res.status(201).json({ success: true, data: assessment })
  } catch (err) {
    console.error('POST /monthly-assessments failed:', err)
    res.status(500).json({ success: false, error: 'Could not create assessment' })
  }
})

router.get('/', async (req, res) => {
  try {
    const assessments = await monthlyRepo.getByManager(req.user.id)
    for (const a of assessments) {
      a.enrollments = await monthlyRepo.getEnrollmentsByAssessment(a.id)
    }
    res.json({ success: true, data: assessments })
  } catch (err) {
    console.error('GET /monthly-assessments failed:', err)
    res.status(500).json({ success: false, error: 'Could not load assessments' })
  }
})

// GET /api/assessments/monthly/calendar — all enrollments grouped for the year view
router.get('/calendar', async (req, res) => {
  try {
    const rows = await monthlyRepo.getCalendarByManager(req.user.id)
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('GET /monthly-assessments/calendar failed:', err)
    res.status(500).json({ success: false, error: 'Could not load calendar' })
  }
})

router.post('/generate-subtopics', async (req, res) => {
  try {
    const { subject, topic, difficulty } = req.body
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
    const jd = await llmService.generateJDFromTopics(subject, subTopics, difficulty)
    res.json({ success: true, data: jd })
  } catch (err) {
    console.error('POST /generate-jd failed:', err)
    res.status(500).json({ success: false, error: 'Could not generate JD' })
  }
})

module.exports = router
