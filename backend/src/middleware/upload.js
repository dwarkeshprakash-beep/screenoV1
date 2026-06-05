// backend/src/middleware/upload.js
// Multer config for file uploads (resumes, reports).
// Files are held in memory and forwarded to Cloudinary — never written to disk.

const multer = require('multer')

// Store in memory — we upload to Cloudinary and discard immediately
const storage = multer.memoryStorage()

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter(req, file, cb) {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      // Audio types for interview answer recordings
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
      'audio/wav',
      'audio/mpeg',
      'audio/x-m4a',
      'video/webm',
    ]
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
      cb(null, true)
    } else {
      cb(new Error('File type not allowed'))
    }
  },
})

module.exports = upload
