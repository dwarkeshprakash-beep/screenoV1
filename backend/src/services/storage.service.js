// backend/src/services/storage.service.js
// Supabase Storage helpers - upload and delete raw files (resumes, reports).
// Files are streamed from memory buffer; nothing is written to disk.

const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const BUCKET = 'files'

/**
 * Upload a file buffer to Supabase Storage under resumes/.
 * Uses an immutable versioned path.
 * @param {Buffer} buffer - file content from multer memoryStorage
 * @param {number|string} ownerId - user the resume belongs to
 * @param {object} file - file metadata from multer
 * @returns {Promise<{ path: string, size: number, mimeType: string, originalName: string }>}
 */
async function uploadResumeAsset(buffer, ownerId, file = {}) {
  const extensionByMime = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt',
  }
  const extension = extensionByMime[file.mimetype] || 'pdf'
  const contentType = file.mimetype || 'application/pdf'
  const uuid = crypto.randomUUID()
  const path = `resumes/${ownerId}/${uuid}.${extension}`

  const { data, error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  })
  if (error) throw error

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
 * Upload a PDF report buffer to Supabase Storage under reports/.
 * @param {Buffer} buffer
 * @param {number|string} reportId
 * @returns {Promise<{ path: string }>}
 */
async function uploadReportAsset(buffer, reportId) {
  const path = `reports/report_${reportId}.pdf`

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (error) throw error

  return { path }
}

/**
 * Alias for uploadReportAsset that also returns a signed URL.
 * @param {Buffer} buffer
 * @param {number|string} reportId
 * @returns {Promise<{ path: string, url: string }>}
 */
async function uploadReport(buffer, reportId) {
  const { path } = await uploadReportAsset(buffer, reportId)
  const url = await getSignedUrl(path)
  return { path, url }
}

/** Upload an optional document attached to interviewer feedback. */
async function uploadInterviewFeedbackAsset(buffer, assignmentId, file = {}) {
  const safeName = String(file.originalname || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `interview-feedback/${assignmentId}/${crypto.randomUUID()}-${safeName}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.mimetype || 'application/octet-stream', upsert: false,
  })
  if (error) throw error
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
  const extensionByMime = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt',
  }
  const extension = extensionByMime[file.mimetype] || 'pdf'
  const contentType = file.mimetype || 'application/pdf'
  const uuid = crypto.randomUUID()
  const path = `jd/${ownerId}/${uuid}.${extension}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  })
  if (error) throw error

  return {
    path,
    size: buffer.length,
    mimeType: contentType,
    originalName: file.originalname || `jd.${extension}`,
  }
}

/**
 * Fetch a short-lived signed URL for a file in storage.
 * @param {string} path - storage path
 * @param {number} expiresIn - expiration in seconds (default 3600)
 * @returns {Promise<string>}
 */
async function getSignedUrl(path, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  if (error) throw error
  return data.signedUrl
}

/**
 * Delete a file from Supabase Storage by its path.
 * @param {string} path - storage path
 */
async function deleteFile(path) {
  if (!path) return
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}

/**
 * Fire-and-forget job to delete orphaned files from storage.
 * @param {string[]} paths - array of storage paths
 */
async function cleanupOrphanedFiles(paths) {
  if (!paths || paths.length === 0) return
  try {
    const { error } = await supabase.storage.from(BUCKET).remove(paths)
    if (error) console.error('[StorageService] Error cleaning up files:', error.message)
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
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error) throw error
  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

module.exports = {
  uploadResumeAsset,
  uploadResume,
  uploadReportAsset,
  uploadReport,
  uploadJdAsset,
  getSignedUrl,
  deleteFile,
  cleanupOrphanedFiles,
  downloadFile,
  uploadInterviewFeedbackAsset,
}
