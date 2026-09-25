// backend/src/services/profile.service.js
// The signed-in user's own profile: read, resume metadata, and self-service updates.
// Expected failures throw with err.httpStatus set (400/404) and a user-facing message.
const bcrypt = require('bcryptjs')
const userRepository = require('../repositories/user.repository')
const resumeRepository = require('../repositories/resume.repository')
const storageService = require('./storage.service')
const { validatePassword } = require('../utils/password-policy')

const VALID_AVAILABILITY = ['bench', 'client_side']

// Expected failures carry the HTTP status the route should answer with.
function profileError(status, message) {
  const err = new Error(message)
  err.httpStatus = status
  return err
}

function isStoragePath(value) {
  return value && !value.startsWith('http')
}

// Profile row with resume_url signed when it is a storage path. Signing failure keeps the raw value.
async function getProfile(userId) {
  const user = await userRepository.getById(userId)
  if (!user) throw profileError(404, 'User not found')

  if (isStoragePath(user.resume_url)) {
    try {
      user.resume_url = await storageService.getSignedUrl(user.resume_url)
    } catch (err) {
      console.error('Failed to generate signed URL for profile resume:', err.message)
    }
  }
  return user
}

// Metadata for the current default resume, or null when the user has none.
async function getResumeMetadata(userId) {
  const user = await userRepository.getById(userId)
  if (!user) throw profileError(404, 'User not found')

  if (user.current_resume_asset_id) {
    const asset = await resumeRepository.getAssetById(user.current_resume_asset_id)
    if (!asset) return null
    return {
      id: asset.id,
      filename: asset.original_filename,
      mimeType: asset.mime_type,
      size: asset.size,
      uploadedAt: asset.created_at,
      downloadUrl: await storageService.getSignedUrl(asset.storage_path),
    }
  }

  if (user.resume_url) {
    // Legacy resume without asset record
    return {
      filename: 'resume.pdf',
      uploadedAt: user.resume_updated,
      downloadUrl: isStoragePath(user.resume_url)
        ? await storageService.getSignedUrl(user.resume_url)
        : user.resume_url,
    }
  }

  return null
}

// Password change (when newPassword is given) runs before the name/availability update.
async function updateProfile(userId, { firstName, lastName, currentPassword, newPassword, availability }) {
  if (newPassword) {
    if (!currentPassword) throw profileError(400, 'Current password required')
    const passwordError = validatePassword(newPassword)
    if (passwordError) throw profileError(400, passwordError)

    const fullUser = await userRepository.getByIdWithPassword(userId)
    if (!fullUser) throw profileError(404, 'User not found')
    if (!await bcrypt.compare(currentPassword, fullUser.password)) {
      throw profileError(400, 'Current password is incorrect')
    }
    if (await bcrypt.compare(newPassword, fullUser.password)) {
      throw profileError(400, 'New password must be different from your current password')
    }
    await userRepository.updatePassword(userId, await bcrypt.hash(newPassword, 10))
  }

  if (firstName || lastName || availability) {
    if (availability && !VALID_AVAILABILITY.includes(availability)) {
      throw profileError(400, 'Invalid availability')
    }
    await userRepository.updateProfile(userId, { firstName, lastName, availability })
  }

  const updated = await userRepository.getById(userId)
  if (!updated) throw profileError(404, 'User not found')
  return updated
}

module.exports = {
  getProfile,
  getResumeMetadata,
  updateProfile,
}
