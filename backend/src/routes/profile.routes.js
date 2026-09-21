const express = require('express')
const bcrypt = require('bcryptjs')
const authMiddleware = require('../middleware/auth')
const { loadAccess } = require('../middleware/access')
const { documentUpload } = require('../middleware/upload')
const userRepository = require('../repositories/user.repository')
const resumeRepository = require('../repositories/resume.repository')
const storageService = require('../services/storage.service')
const resumeService = require('../services/resume.service')
const { validatePassword } = require('../utils/password-policy')

const router = express.Router()
router.use(authMiddleware, loadAccess)

router.get('/', async (req, res) => {
  try {
    const user = await userRepository.getById(req.user.id)
    if (!user) return res.status(404).json({ success: false, error: 'User not found' })

    // Frontend merges this response into the stored session user - send the
    // resolved portal (RBAC-derived, not a raw DB column - see access.service.js).
    user.role = req.access.portal

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
    updated.role = req.access.portal
    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('PATCH /profile failed:', err)
    res.status(500).json({ success: false, error: 'Could not update profile' })
  }
})

router.post('/resume', documentUpload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' })

    const result = await resumeService.addResume(req.user.id, req.file.buffer, req.file)
    if (result.error === 'limit_reached') {
      return res.status(400).json({
        success: false,
        error: `You can have at most ${resumeService.MAX_RESUMES_PER_OWNER} resumes - delete one to add another.`,
      })
    }

    const signedUrl = await storageService.getSignedUrl(result.asset.storage_path)
    res.json({ success: true, data: { resumeUrl: signedUrl, asset: result.asset } })
  } catch (err) {
    console.error('POST /profile/resume failed:', err)
    res.status(500).json({ success: false, error: 'Upload failed' })
  }
})

router.get('/resumes', async (req, res) => {
  try {
    const resumes = await resumeService.listResumes(req.user.id)
    res.json({ success: true, data: resumes })
  } catch (err) {
    console.error('GET /profile/resumes failed:', err)
    res.status(500).json({ success: false, error: 'Could not load resumes' })
  }
})

router.patch('/resume/:assetId/default', async (req, res) => {
  try {
    const assetId = parseInt(req.params.assetId, 10)
    const result = await resumeService.setDefault(req.user.id, assetId)
    if (result.error === 'not_found') {
      return res.status(404).json({ success: false, error: 'Resume not found' })
    }
    res.json({ success: true, data: result.asset })
  } catch (err) {
    console.error('PATCH /profile/resume/:assetId/default failed:', err)
    res.status(500).json({ success: false, error: 'Could not set default resume' })
  }
})

const DELETE_ERROR_MESSAGES = {
  is_default: 'Set another resume as default before deleting this one.',
  in_use: 'This resume is linked to a client submission and cannot be deleted.',
}

router.delete('/resume/:assetId', async (req, res) => {
  try {
    const assetId = parseInt(req.params.assetId, 10)
    const check = await resumeService.canDeleteResume(req.user.id, assetId)
    if (!check.allowed) {
      if (check.reason === 'not_found') {
        return res.status(404).json({ success: false, error: 'Resume not found' })
      }
      return res.status(400).json({ success: false, error: DELETE_ERROR_MESSAGES[check.reason] })
    }

    await resumeService.deleteResume(check.asset)
    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /profile/resume/:assetId failed:', err)
    res.status(500).json({ success: false, error: 'Could not delete resume' })
  }
})

module.exports = router
