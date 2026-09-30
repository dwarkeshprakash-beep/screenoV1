// backend/src/services/storage.service.js
// File storage - path/business logic lives here. createStorageService depends only
// on a provider abstraction ({ upload, getSignedUrl, remove, download }), injected as
// a parameter - it never references Supabase or AWS directly, so a fake provider can
// be passed in tests without touching env vars or real SDKs.
//
// Every other file in the codebase requires this module directly (the convention
// everywhere here - plain CommonJS singletons, no DI container), so the module wires
// up the real provider once at the bottom via provider-factory and exports that
// instance. Only the wiring at the bottom knows STORAGE_PROVIDER exists.

const crypto = require('crypto')
const { resolveProvider } = require('./storage/provider-factory')

const RESUME_EXTENSIONS = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
}

const STUDY_MATERIAL_EXTENSIONS = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
}

/**
 * True when a stored file reference is already a full http(s) URL (legacy rows)
 * rather than a storage path that still needs signing.
 * @param {string} value
 * @returns {boolean}
 */
function isExternalUrl(value) {
  return /^https?:\/\//i.test(String(value || ''))
}

/**
 * Storage folder for one manager's monthly study-material files. Used both to build
 * upload paths and to check that a path submitted on save belongs to that manager.
 * @param {number|string} ownerId
 * @returns {string}
 */
function studyMaterialPrefix(ownerId) {
  return `study-material/${ownerId}/`
}

/**
 * @param {{ upload: Function, getSignedUrl: Function, remove: Function, download: Function }} provider
 */
function createStorageService(provider) {
  /**
   * Upload a file buffer to storage under resumes/. Uses an immutable versioned path.
   * @param {Buffer} buffer - file content from multer memoryStorage
   * @param {number|string} ownerId - user the resume belongs to
   * @param {object} file - file metadata from multer
   * @returns {Promise<{ path: string, size: number, mimeType: string, originalName: string }>}
   */
  async function uploadResumeAsset(buffer, ownerId, file = {}) {
    const extension = RESUME_EXTENSIONS[file.mimetype] || 'pdf'
    const contentType = file.mimetype || 'application/pdf'
    const path = `resumes/${ownerId}/${crypto.randomUUID()}.${extension}`

    await provider.upload(path, buffer, { contentType, upsert: false })

    return {
      path,
      size: buffer.length,
      mimeType: contentType,
      originalName: file.originalname || `resume.${extension}`
    }
  }

  /**
   * Alias for uploadResumeAsset that also returns a signed URL.
   * @param {Buffer} buffer
   * @param {number|string} ownerId
   * @param {object} file
   * @returns {Promise<{ path: string, url: string }>}
   */
  async function uploadResume(buffer, ownerId, file = {}) {
    const result = await uploadResumeAsset(buffer, ownerId, file)
    const url = await getSignedUrl(result.path)
    return { ...result, url }
  }

  /**
   * Upload a PDF report buffer to storage under reports/.
   * @param {Buffer} buffer
   * @param {number|string} reportId
   * @returns {Promise<{ path: string }>}
   */
  async function uploadReportAsset(buffer, reportId) {
    const path = `reports/report_${reportId}.pdf`
    await provider.upload(path, buffer, { contentType: 'application/pdf', upsert: true })
    return { path }
  }

  /** Upload an optional document attached to interviewer feedback. */
  async function uploadInterviewFeedbackAsset(buffer, assignmentId, file = {}) {
    const safeName = String(file.originalname || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `interview-feedback/${assignmentId}/${crypto.randomUUID()}-${safeName}`
    await provider.upload(path, buffer, {
      contentType: file.mimetype || 'application/octet-stream',
      upsert: false,
    })
    return { path }
  }

  /**
   * Upload the original JD document a manager/BDE attaches to a mandate or role profile.
   * Kept alongside the extracted jd_text so a bad extraction never loses the source file.
   * @param {Buffer} buffer
   * @param {number|string} ownerId - uploader's user id (mandate may not exist yet while drafting)
   * @param {object} file - file metadata from multer
   * @returns {Promise<{ path: string, size: number, mimeType: string, originalName: string }>}
   */
  async function uploadJdAsset(buffer, ownerId, file = {}) {
    const extension = RESUME_EXTENSIONS[file.mimetype] || 'pdf'
    const contentType = file.mimetype || 'application/pdf'
    const path = `jd/${ownerId}/${crypto.randomUUID()}.${extension}`

    await provider.upload(path, buffer, { contentType, upsert: false })

    return {
      path,
      size: buffer.length,
      mimeType: contentType,
      originalName: file.originalname || `jd.${extension}`,
    }
  }

  /**
   * Upload a study-material document a manager attaches to a monthly subject.
   * The subject may not exist yet (create wizard), so the file is keyed by uploader.
   * @param {Buffer} buffer
   * @param {number|string} ownerId - uploader's user id
   * @param {object} file - file metadata from multer
   * @returns {Promise<{ path: string, size: number, mimeType: string, originalName: string }>}
   */
  async function uploadStudyMaterialAsset(buffer, ownerId, file = {}) {
    const extension = STUDY_MATERIAL_EXTENSIONS[file.mimetype] || 'pdf'
    const contentType = file.mimetype || 'application/pdf'
    const path = `${studyMaterialPrefix(ownerId)}${crypto.randomUUID()}.${extension}`

    await provider.upload(path, buffer, { contentType, upsert: false })

    return {
      path,
      size: buffer.length,
      mimeType: contentType,
      originalName: file.originalname || `study-material.${extension}`,
    }
  }

  /**
   * Fetch a short-lived signed URL for a file in storage.
   * @param {string} path - storage path
   * @param {number} expiresIn - expiration in seconds (default 3600)
   * @returns {Promise<string>}
   */
  async function getSignedUrl(path, expiresIn = 3600) {
    return provider.getSignedUrl(path, expiresIn)
  }

  /**
   * Turn a stored file reference into a downloadable URL: full URLs pass through,
   * storage paths are signed. Never throws - returns null if signing fails.
   * @param {string} value - storage path or URL
   * @returns {Promise<string|null>}
   */
  async function resolveFileUrl(value) {
    if (!value) return null
    if (isExternalUrl(value)) return value
    try {
      return await getSignedUrl(value)
    } catch (err) {
      console.error('Failed to sign storage URL:', err.message)
      return null
    }
  }

  /**
   * Delete a file from storage by its path.
   * @param {string} path - storage path
   */
  async function deleteFile(path) {
    if (!path) return
    await provider.remove([path])
  }

  /**
   * Fire-and-forget job to delete orphaned files from storage.
   * @param {string[]} paths - array of storage paths
   */
  async function cleanupOrphanedFiles(paths) {
    if (!paths || paths.length === 0) return
    try {
      await provider.remove(paths)
    } catch (err) {
      console.error('[StorageService] Failed to queue file cleanup:', err.message)
    }
  }

  /**
   * Download a file's raw bytes from storage (e.g. to re-extract text from a resume
   * that's being set as the default without a fresh upload).
   * @param {string} path - storage path
   * @returns {Promise<Buffer>}
   */
  async function downloadFile(path) {
    return provider.download(path)
  }

  return {
    uploadResumeAsset,
    uploadResume,
    uploadReportAsset,
    uploadJdAsset,
    uploadStudyMaterialAsset,
    studyMaterialPrefix,
    getSignedUrl,
    isExternalUrl,
    resolveFileUrl,
    deleteFile,
    cleanupOrphanedFiles,
    downloadFile,
    uploadInterviewFeedbackAsset,
  }
}

// Composition root: the only line that knows STORAGE_PROVIDER exists. Every consumer
// keeps doing `require('.../storage.service')` exactly as before - this just wires it.
module.exports = createStorageService(resolveProvider())

// Exposed so tests can build an isolated instance with a fake provider:
//   const { createStorageService } = require('.../storage.service')
//   const service = createStorageService(fakeProvider)
module.exports.createStorageService = createStorageService
