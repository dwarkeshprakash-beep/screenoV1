const express = require('express')
const bcrypt = require('bcryptjs')
const authMiddleware = require('../middleware/auth')
const { documentUpload } = require('../middleware/upload')
const userRepository = require('../repositories/user.repository')
const storageService = require('../services/storage.service')
const documentTextService = require('../services/document-text.service')
const llmService = require('../services/llm.service')

const router = express.Router()
router.use(authMiddleware)

router.get('/', async (req, res) => {
  try {
    const user = await userRepository.getById(req.user.id)
    if (!user) return res.status(404).json({ success: false, error: 'User not found' })
    res.json({ success: true, data: user })
  } catch (err) {
    console.error('GET /profile failed:', err)
    res.status(500).json({ success: false, error: 'Could not load profile' })
  }
})

router.patch('/', async (req, res) => {
  try {
    const { firstName, lastName, currentPassword, newPassword, availability } = req.body

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, error: 'Current password required' })
      }
      if (String(newPassword).length < 8) {
        return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' })
      }
      const fullUser = await userRepository.getByIdWithPassword(req.user.id)
      if (!fullUser) return res.status(404).json({ success: false, error: 'User not found' })
      const valid = await bcrypt.compare(currentPassword, fullUser.password)
      if (!valid) {
        return res.status(400).json({ success: false, error: 'Current password is incorrect' })
      }
      await userRepository.updatePassword(req.user.id, await bcrypt.hash(newPassword, 10))
    }

    if (firstName || lastName || availability) {
      if (availability && !['bench', 'client_side'].includes(availability)) {
        return res.status(400).json({ success: false, error: 'Invalid availability' })
      }
      await userRepository.updateProfile(req.user.id, { firstName, lastName, availability })
    }

    const updated = await userRepository.getById(req.user.id)
    if (!updated) return res.status(404).json({ success: false, error: 'User not found' })
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('PATCH /profile failed:', err)
    res.status(500).json({ success: false, error: 'Could not update profile' })
  }
})

router.post('/resume', documentUpload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' })
    const buffer = req.file.buffer
    const uploaded = await storageService.uploadResume(buffer, req.user.id, req.file)
    await userRepository.updateProfile(req.user.id, { resumeUrl: uploaded.url })

    async function extractTags() {
      try {
        const text = await documentTextService.extractTextFromBuffer(
          buffer,
          req.file.mimetype,
          req.file.originalname
        )
        if (text.length < 50) return
        const tags = await llmService.extractTagsFromText(text)
        if (tags.length > 0) await userRepository.updateProfile(req.user.id, { tags })
      } catch (err) {
        console.error('profile resume tag extraction failed:', err.message)
      }
    }
    void extractTags()

    res.json({ success: true, data: { resumeUrl: uploaded.url } })
  } catch (err) {
    console.error('POST /profile/resume failed:', err)
    res.status(500).json({ success: false, error: 'Upload failed' })
  }
})

module.exports = router
