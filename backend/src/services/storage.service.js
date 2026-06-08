// backend/src/services/storage.service.js
// Supabase Storage helpers — upload and delete raw files (resumes, reports).
// Files are streamed from memory buffer; nothing is written to disk.

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const BUCKET = 'files'

/**
 * Upload a file buffer to Supabase Storage under resumes/.
 * Uses a path keyed to the candidate so each candidate has exactly one
 * resume asset — re-uploading overwrites the previous file instead of leaving
 * orphaned copies in storage.
 * @param {Buffer} buffer - file content from multer memoryStorage
 * @param {number|string} candidateId - candidate the resume belongs to
 * @returns {Promise<{ url: string, publicId: string }>}
 */
async function uploadResume(buffer, candidateId) {
  const path = `resumes/resume_candidate_${candidateId}.pdf`

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, publicId: path }
}

/**
 * Upload a PDF report buffer to Supabase Storage under reports/.
 * @param {Buffer} buffer
 * @param {number|string} reportId - used to build a stable path
 * @returns {Promise<{ url: string, publicId: string }>}
 */
async function uploadReport(buffer, reportId) {
  const path = `reports/report_${reportId}_${Date.now()}.pdf`

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: 'application/pdf',
  })
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, publicId: path }
}

/**
 * Delete a file from Supabase Storage by its path.
 * @param {string} publicId - storage path, e.g. "resumes/resume_candidate_12.pdf"
 */
async function deleteFile(publicId) {
  await supabase.storage.from(BUCKET).remove([publicId])
}

module.exports = { uploadResume, uploadReport, deleteFile }
