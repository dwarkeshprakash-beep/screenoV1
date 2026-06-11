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
    const assessment = await monthlyRepo.create(data)

    if (data.team_member_ids && Array.isArray(data.team_member_ids)) {
      const month_progress = new Array(data.duration_months || 1).fill('pending')
      for (const tmid of data.team_member_ids) {
        await monthlyRepo.createEnrollment({
          assessment_id: assessment.id,
          team_member_id: tmid,
          month_progress
        })
      }
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
