// backend/src/services/resume.service.js
// Business logic for a candidate's resume pool: multiple resumes, one marked default,
// deletion guarded against the default and against resumes linked to a client submission.

const resumeRepository = require('../repositories/resume.repository')
const userRepository = require('../repositories/user.repository')
const storageService = require('./storage.service')
const documentTextService = require('./document-text.service')
const llmService = require('./llm.service')

const MAX_RESUMES_PER_OWNER = 5

/** Extracts resume text + skill tags in the background and saves them to the user. Never throws. */
async function extractAndSaveTags(ownerId, buffer, file) {
  try {
    const text = await documentTextService.extractTextFromBuffer(buffer, file.mimetype, file.originalname)
    if (text.length < 50) {
      await userRepository.updateProfile(ownerId, { resumeText: text })
      return
    }
    const tags = await llmService.extractTagsFromText(text)
    await userRepository.updateProfile(ownerId, { resumeText: text, tags })
  } catch (err) {
    console.error('resume tag extraction failed:', err.message)
  }
}

/** Lists a candidate's active resumes with a signed download URL and which one is default. */
async function listResumes(ownerId) {
  const [assets, user] = await Promise.all([
    resumeRepository.listActiveByOwner(ownerId, 'profile'),
    userRepository.getById(ownerId),
  ])
  return Promise.all(assets.map(async asset => ({
    id: asset.id,
    filename: asset.original_filename,
    mimeType: asset.mime_type,
    size: asset.size,
    uploadedAt: asset.created_at,
    isDefault: asset.id === user?.current_resume_asset_id,
    downloadUrl: await storageService.getSignedUrl(asset.storage_path),
  })))
}

/** Adds a new resume to the candidate's pool. Returns { error: 'limit_reached' } if the cap is hit. */
async function addResume(ownerId, buffer, file) {
  const count = await resumeRepository.countActiveByOwner(ownerId, 'profile')
  if (count >= MAX_RESUMES_PER_OWNER) {
    return { error: 'limit_reached' }
  }

  const uploaded = await storageService.uploadResumeAsset(buffer, ownerId, file)
  const asset = await resumeRepository.createAsset({
    owner_user_id: ownerId,
    purpose: 'profile',
    original_filename: uploaded.originalName,
    mime_type: uploaded.mimeType,
    size: uploaded.size,
    storage_path: uploaded.path,
  })

  const user = await userRepository.getById(ownerId)
  if (!user?.current_resume_asset_id) {
    await userRepository.updateProfile(ownerId, {
      resumeUrl: uploaded.path,
      currentResumeAssetId: asset.id,
    })
    void extractAndSaveTags(ownerId, buffer, file)
  }

  return { asset }
}

/** Marks an existing resume as the candidate's default, re-extracting skills from it. */
async function setDefault(ownerId, assetId) {
  const asset = await resumeRepository.getAssetById(assetId)
  if (!asset || asset.owner_user_id !== ownerId || asset.purpose !== 'profile') {
    return { error: 'not_found' }
  }

  await userRepository.updateProfile(ownerId, {
    resumeUrl: asset.storage_path,
    currentResumeAssetId: asset.id,
  })

  try {
    const buffer = await storageService.downloadFile(asset.storage_path)
    void extractAndSaveTags(ownerId, buffer, {
      mimetype: asset.mime_type,
      originalname: asset.original_filename,
    })
  } catch (err) {
    console.error('resume re-extraction on setDefault failed:', err.message)
  }

  return { asset }
}

/** Checks whether a resume can be deleted: must be owned, not the default, and not linked to a mandate. */
async function canDeleteResume(ownerId, assetId) {
  const asset = await resumeRepository.getAssetById(assetId)
  if (!asset || asset.owner_user_id !== ownerId || asset.purpose !== 'profile') {
    return { allowed: false, reason: 'not_found' }
  }

  const user = await userRepository.getById(ownerId)
  if (user?.current_resume_asset_id === asset.id) {
    return { allowed: false, reason: 'is_default' }
  }

  const inUse = await resumeRepository.isAssetReferencedByMandate(asset.id)
  if (inUse) {
    return { allowed: false, reason: 'in_use' }
  }

  return { allowed: true, asset }
}

/** Soft-deletes a resume asset and best-effort removes the underlying file from storage. */
async function deleteResume(asset) {
  await resumeRepository.softDeleteAsset(asset.id)
  try {
    await storageService.deleteFile(asset.storage_path)
  } catch (err) {
    console.error('resume file cleanup failed:', err.message)
  }
}

/** Validates a resumeAssetId the candidate picked for a client-mandate submission. */
async function getOwnedActiveAsset(ownerId, assetId) {
  const asset = await resumeRepository.getAssetById(assetId)
  if (!asset || asset.owner_user_id !== ownerId || asset.purpose !== 'profile') return null
  return asset
}

module.exports = {
  MAX_RESUMES_PER_OWNER,
  listResumes,
  addResume,
  setDefault,
  canDeleteResume,
  deleteResume,
  getOwnedActiveAsset,
}
