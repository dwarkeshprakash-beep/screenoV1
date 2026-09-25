const express = require('express')
const authMiddleware = require('../middleware/auth')
const { loadAccess, requireModule } = require('../middleware/access')
const { documentUpload } = require('../middleware/upload')
const uploadService = require('../services/upload.service')

const router = express.Router()
router.use(authMiddleware, loadAccess)

router.post('/resume', requireModule('team'), documentUpload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' })

    const teamMemberId = req.body.teamMemberId ? parseInt(req.body.teamMemberId, 10) : null
    const data = await uploadService.uploadResume(req.user.id, teamMemberId, req.file)
    res.json({ success: true, data })
  } catch (err) {
    if (err.httpStatus) return res.status(err.httpStatus).json({ success: false, error: err.message })
    console.error('POST /upload/resume failed:', err)
    res.status(500).json({ success: false, error: 'Upload failed' })
  }
})

router.post('/extract-text', requireModule('resume_analyzer'), documentUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' })
    const text = await uploadService.extractText(req.file)
    res.json({ success: true, data: { text } })
  } catch (err) {
    console.error('POST /upload/extract-text failed:', err)
    res.status(500).json({ success: false, error: 'Could not extract text from file' })
  }
})

router.post('/jd', requireModule('client_mandates'), documentUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' })
    const data = await uploadService.uploadJd(req.user.id, req.file)
    res.json({ success: true, data })
  } catch (err) {
    console.error('POST /upload/jd failed:', err)
    res.status(500).json({ success: false, error: 'Could not upload JD file' })
  }
})

router.post('/analyze-resume', requireModule('resume_analyzer'), async (req, res) => {
  const { jd, resume } = req.body || {}
  if (!jd || !resume) {
    return res.status(400).json({ success: false, error: 'jd and resume are required' })
  }

  try {
    const data = await uploadService.analyzeResume(jd, resume)
    res.json({ success: true, data })
  } catch (err) {
    console.error('POST /upload/analyze-resume failed:', err)
    res.status(500).json({ success: false, error: 'AI analysis failed' })
  }
})

module.exports = router
