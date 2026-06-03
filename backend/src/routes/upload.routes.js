// backend/src/routes/upload.routes.js
// Upload endpoints — resume upload to Cloudinary.
// HTTP only: receive → call service → respond.

const express = require('express')
const authMiddleware = require('../middleware/auth')
const upload = require('../middleware/upload')
const storageService = require('../services/storage.service')
const candidateRepository = require('../repositories/candidate.repository')

const router = express.Router()
router.use(authMiddleware)

/**
 * POST /api/upload/resume
 * Uploads a PDF resume to Cloudinary and saves the URL to the candidate record.
 * Body: multipart/form-data — fields: resume (file), candidateId (string)
 */
router.post('/resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' })

    const candidateId = parseInt(req.body.candidateId, 10)
    if (!candidateId) return res.status(400).json({ success: false, error: 'candidateId is required' })

    const { url } = await storageService.uploadResume(req.file.buffer, req.file.originalname)
    await candidateRepository.update(candidateId, { resumeUrl: url })

    res.json({ success: true, data: { resumeUrl: url } })
  } catch (err) {
    console.error('POST /upload/resume failed:', err)
    res.status(500).json({ success: false, error: 'Upload failed' })
  }
})

module.exports = router
