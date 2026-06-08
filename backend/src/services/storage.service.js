// backend/src/services/storage.service.js
// Cloudinary helpers — upload and delete raw files (resumes, reports).
// Files are streamed from memory buffer; nothing is written to disk.

const cloudinary = require('cloudinary').v2

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Upload a file buffer to Cloudinary under screeno/resumes.
 * Uses a public ID keyed to the candidate so each candidate has exactly one
 * resume asset — re-uploading overwrites the previous file instead of leaving
 * orphaned copies in Cloudinary.
 * @param {Buffer} buffer - file content from multer memoryStorage
 * @param {number|string} candidateId - candidate the resume belongs to
 * @returns {Promise<{ url: string, publicId: string }>}
 */
async function uploadResume(buffer, candidateId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'screeno/resumes',
        resource_type: 'raw',
        public_id: `resume_candidate_${candidateId}`,
        format: 'pdf',
        overwrite: true,
        invalidate: true,
      },
      (error, result) => {
        if (error) return reject(error)
        resolve({ url: result.secure_url, publicId: result.public_id })
      }
    )
    stream.end(buffer)
  })
}

/**
 * Upload a PDF report buffer to Cloudinary under screeno/reports.
 * @param {Buffer} buffer
 * @param {number|string} reportId - used to build a stable public_id
 * @returns {Promise<{ url: string, publicId: string }>}
 */
async function uploadReport(buffer, reportId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'screeno/reports',
        resource_type: 'raw',
        public_id: `report_${reportId}_${Date.now()}`,
        format: 'pdf',
      },
      (error, result) => {
        if (error) return reject(error)
        resolve({ url: result.secure_url, publicId: result.public_id })
      }
    )
    stream.end(buffer)
  })
}

/**
 * Delete a file from Cloudinary by its public ID.
 * @param {string} publicId
 */
async function deleteFile(publicId) {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
}

module.exports = { uploadResume, uploadReport, deleteFile }
