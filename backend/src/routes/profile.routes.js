const express = require('express')
const authMiddleware = require('../middleware/auth')
const { loadAccess } = require('../middleware/access')
const { documentUpload } = require('../middleware/upload')
const storageService = require('../services/storage.service')
const resumeService = require('../services/resume.service')
const profileService = require('../services/profile.service')

const router = express.Router()
router.use(authMiddleware, loadAccess)

// Expected service failures carry httpStatus; anything else is a 500 with the fallback message.
function sendProfileError(res, err, fallbackMessage) {
  if (err.httpStatus) return res.status(err.httpStatus).json({ success: false, error: err.message })
  return res.status(500).json({ success: false, error: fallbackMessage })
}

router.get('/', async (req, res) => {
  try {
    const user = await profileService.getProfile(req.user.id)
    res.json({ success: true, data: user })
  } catch (err) {
    if (!err.httpStatus) console.error('GET /profile failed:', err)
    sendProfileError(res, err, 'Could not load profile')
  }
})

router.get('/resume-metadata', async (req, res) => {
  try {
    const resumeMetadata = await profileService.getResumeMetadata(req.user.id)
    res.json({ success: true, data: resumeMetadata })
  } catch (err) {
    if (!err.httpStatus) console.error('GET /profile/resume-metadata failed:', err)
    sendProfileError(res, err, 'Could not load resume metadata')
  }
})

router.patch('/', async (req, res) => {
  try {
    const updated = await profileService.updateProfile(req.user.id, req.body)
    res.json({ success: true, data: updated })
  } catch (err) {
    if (!err.httpStatus) console.error('PATCH /profile failed:', err)
    sendProfileError(res, err, 'Could not update profile')
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
