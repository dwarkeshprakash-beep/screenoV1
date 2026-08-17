const express = require('express')
const bcrypt = require('bcryptjs')
const authMiddleware = require('../middleware/auth')
const { documentUpload } = require('../middleware/upload')
const userRepository = require('../repositories/user.repository')
const storageService = require('../services/storage.service')
const documentTextService = require('../services/document-text.service')
const llmService = require('../services/llm.service')
const { validatePassword } = require('../utils/password-policy')

const router = express.Router()
router.use(authMiddleware)

router.get('/', async (req, res) => {
  try {
    const user = await userRepository.getById(req.user.id)
    if (!user) return res.status(404).json({ success: false, error: 'User not found' })
    
    // Generate signed URL if the user has a resume stored as a path
    if (user.resume_url && !user.resume_url.startsWith('http')) {
      try {
        user.resume_url = await storageService.getSignedUrl(user.resume_url)
      } catch (err) {
        console.error('Failed to generate signed URL for profile resume:', err.message)
      }
    }

    res.json({ success: true, data: user })
  } catch (err) {
    console.error('GET /profile failed:', err)
    res.status(500).json({ success: false, error: 'Could not load profile' })
  }
})

router.get('/resume-metadata', async (req, res) => {
  try {
    const user = await userRepository.getById(req.user.id)
    if (!user) return res.status(404).json({ success: false, error: 'User not found' })

    let resumeMetadata = null
    if (user.current_resume_asset_id) {
      const asset = await resumeRepository.getAssetById(user.current_resume_asset_id)
      if (asset) {
        resumeMetadata = {
          id: asset.id,
          filename: asset.original_filename,
          mimeType: asset.mime_type,
          size: asset.size,
          uploadedAt: asset.created_at,
          downloadUrl: await storageService.getSignedUrl(asset.storage_path)
        }
      }
    } else if (user.resume_url) {
      // Legacy resume without asset record
      resumeMetadata = {
        filename: 'resume.pdf',
        uploadedAt: user.resume_updated,
        downloadUrl: user.resume_url.startsWith('http') 
          ? user.resume_url 
          : await storageService.getSignedUrl(user.resume_url)
      }
    }

    res.json({ success: true, data: resumeMetadata })
  } catch (err) {
    console.error('GET /profile/resume-metadata failed:', err)
    res.status(500).json({ success: false, error: 'Could not load resume metadata' })
  }
})

router.patch('/', async (req, res) => {
  try {
    const { firstName, lastName, currentPassword, newPassword, availability } = req.body

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, error: 'Current password required' })
      }
      const passwordError = validatePassword(newPassword)
      if (passwordError) return res.status(400).json({ success: false, error: passwordError })
      const fullUser = await userRepository.getByIdWithPassword(req.user.id)
      if (!fullUser) return res.status(404).json({ success: false, error: 'User not found' })
      const valid = await bcrypt.compare(currentPassword, fullUser.password)
      if (!valid) {
        return res.status(400).json({ success: false, error: 'Current password is incorrect' })
      }
      if (await bcrypt.compare(newPassword, fullUser.password)) {
        return res.status(400).json({ success: false, error: 'New password must be different from your current password' })
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

const resumeRepository = require('../repositories/resume.repository')

router.post('/resume', documentUpload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' })
    const buffer = req.file.buffer
    
    // Upload the file to immutable versioned storage
    const uploaded = await storageService.uploadResumeAsset(buffer, req.user.id, req.file)
    
    // Create the resume asset record
    const asset = await resumeRepository.createAsset({
      owner_user_id: req.user.id,
      purpose: 'profile',
      original_filename: uploaded.originalName,
      mime_type: uploaded.mimeType,
      size: uploaded.size,
      storage_path: uploaded.path,
    })

    // Update the user profile with the new asset ID
    // Note: We need a new function in userRepository to update the current_resume_asset_id
    // Wait, the migration adds current_resume_asset_id, but updateProfile might not support it yet.
    // For now we'll update resume_url to the path as a fallback or add it to updateProfile.
    await userRepository.updateProfile(req.user.id, { 
      resumeUrl: uploaded.path, // keep legacy field for backward compatibility
      currentResumeAssetId: asset.id 
    })

    async function extractTags() {
      try {
        const text = await documentTextService.extractTextFromBuffer(
          buffer,
          req.file.mimetype,
          req.file.originalname
        )
        if (text.length < 50) {
          await userRepository.updateProfile(req.user.id, { resumeText: text })
          return
        }
        const tags = await llmService.extractTagsFromText(text)
        await userRepository.updateProfile(req.user.id, { resumeText: text, tags })
      } catch (err) {
        console.error('profile resume tag extraction failed:', err.message)
      }
    }
    void extractTags()

    // Generate a signed URL for immediate use
    const signedUrl = await storageService.getSignedUrl(uploaded.path)

    res.json({ success: true, data: { resumeUrl: signedUrl, asset } })
  } catch (err) {
    console.error('POST /profile/resume failed:', err)
    res.status(500).json({ success: false, error: 'Upload failed' })
  }
})

module.exports = router
