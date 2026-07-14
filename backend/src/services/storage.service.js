// backend/src/services/storage.service.js
// Supabase Storage helpers — upload and delete raw files (resumes, reports).
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
 * Create an immutable copy of an existing resume for mandate-specific submission.
 * This prevents the original file from being overwritten if the user updates their profile resume.
 * @param {string} sourcePath - path to the source resume file
 * @param {number|string} mandateId - mandate ID for immutable storage path
 * @param {number|string} clientTeamId - client team ID for immutable storage path
 * @returns {Promise<{ path: string }>}
 */
async function copyResumeForMandateSnapshot(sourcePath, mandateId, clientTeamId) {
  if (!sourcePath) throw new Error('Source path is required')
  
  const uuid = crypto.randomUUID()
  const extension = sourcePath.split('.').pop() || 'pdf'
  const snapshotPath = `resumes/mandates/${mandateId}/${clientTeamId}/${uuid}.${extension}`

  const { data: sourceFile, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(sourcePath)
    
  if (downloadError) throw downloadError

  const { data, error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(snapshotPath, sourceFile, {
      contentType: sourceFile.type || 'application/pdf',
      upsert: false,
    })
    
  if (uploadError) throw uploadError

  return { path: snapshotPath }
}

module.exports = { 
  uploadResumeAsset,
  uploadResume,
  uploadReportAsset, 
  uploadReport,
  getSignedUrl, 
  deleteFile, 
  cleanupOrphanedFiles,
  copyResumeForMandateSnapshot,
  uploadInterviewFeedbackAsset,
}
