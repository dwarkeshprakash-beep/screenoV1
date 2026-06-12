const express = require('express')
const examService = require('../services/exam.service')

const router = express.Router()

router.get('/:token', async (req, res) => {
  try {
    const exam = await examService.getExam(req.params.token)
    res.json({ success: true, data: exam })
  } catch (err) {
    console.error('GET /exam/:token failed:', err)
    if (err.message === 'Exam already completed') {
      return res.status(409).json({ success: false, error: err.message })
    }
    if (err.message === 'Invalid or expired link') {
      return res.status(404).json({ success: false, error: err.message })
    }
    res.status(500).json({ success: false, error: 'Could not load exam' })
  }
})

router.post('/:token/submit', async (req, res) => {
  try {
    const result = await examService.submitExam(req.params.token, req.body.answers)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('POST /exam/:token/submit failed:', err)
    if (err.message === 'Exam already completed') {
      return res.status(409).json({ success: false, error: err.message })
    }
    if (err.message === 'Invalid or expired link') {
      return res.status(404).json({ success: false, error: err.message })
    }
    if (['At least one answer is required', 'Invalid question submission'].includes(err.message)) {
      return res.status(400).json({ success: false, error: err.message })
    }
    res.status(500).json({ success: false, error: 'Could not submit exam' })
  }
})

module.exports = router
