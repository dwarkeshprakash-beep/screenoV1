// backend/src/routes/profile.routes.js
// Profile endpoints — get and update the logged-in user's own profile.
// HTTP only: receive → call repository → respond.

const express = require('express')
const bcrypt = require('bcryptjs')
const authMiddleware = require('../middleware/auth')
const userRepository = require('../repositories/user.repository')
const multer = require('multer')
const storageService = require('../services/storage.service')
const pdfService = require('../services/pdf.service')
const llmService = require('../services/llm.service')

const upload = multer({ storage: multer.memoryStorage() })

const router = express.Router()
router.use(authMiddleware)

/**
 * GET /api/profile
 * Returns the logged-in user's profile (password field stripped).
 */
router.get('/', async (req, res) => {
  try {
    const user = await userRepository.getById(req.user.id)
    if (!user) return res.status(404).json({ success: false, error: 'User not found' })
    const { password: _, ...safe } = user
    res.json({ success: true, data: safe })
  } catch (err) {
    console.error('GET /profile failed:', err)
    res.status(500).json({ success: false, error: 'Could not load profile' })
  }
})

/**
 * PATCH /api/profile
 * Update first name, last name, and/or password.
 * Body: { firstName?, lastName?, currentPassword?, newPassword? }
 */
router.patch('/', async (req, res) => {
  try {
    const { firstName, lastName, currentPassword, newPassword, availability } = req.body

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, error: 'Current password required' })
      }

      // getById omits password for safety — fetch the full row to verify the hash
      const fullUser = await userRepository.getByIdWithPassword(req.user.id)
      if (!fullUser) return res.status(404).json({ success: false, error: 'User not found' })

      const valid = await bcrypt.compare(currentPassword, fullUser.password)
      if (!valid) return res.status(400).json({ success: false, error: 'Current password is incorrect' })

      const hash = await bcrypt.hash(newPassword, 10)
      await userRepository.updatePassword(req.user.id, hash)
    }

    if (firstName || lastName || availability) {
      await userRepository.updateProfile(req.user.id, { firstName, lastName, availability })
    }

    const updated = await userRepository.getById(req.user.id)
    if (!updated) return res.status(404).json({ success: false, error: 'User not found' })

    const { password: _, ...safe } = updated
    res.json({ success: true, data: safe })
  } catch (err) {
    console.error('PATCH /profile failed:', err)
    res.status(500).json({ success: false, error: 'Could not update profile' })
  }
})

router.post('/resume', upload.single('resume'), async (req, res) => {
  try {
    // Same logic as /api/upload/resume but uses req.user.id directly
    const buffer = req.file.buffer
    const resumeUrl = await storageService.uploadResume(req.user.id, buffer, req.file.originalname)
    await userRepository.updateProfile(req.user.id, { resumeUrl })
    // Fire-and-forget async tag extraction — never blocks the response
    ;(async () => {
      try {
        const text = await pdfService.extractTextFromBuffer(buffer)
        if (text) {
          const tags = await llmService.extractTagsFromText(text)
          await userRepository.updateProfile(req.user.id, { tags: JSON.stringify(tags) })
        }
      } catch { /* tag extraction failure is non-fatal */ }
    })()
    res.json({ success: true, data: { resumeUrl } })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Upload failed' })
  }
})

module.exports = router
