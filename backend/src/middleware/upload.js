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
    const allowed = ['application/pdf', 'image/jpeg', 'image/png']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only PDF, JPG, and PNG files are allowed'))
    }
  },
})

module.exports = upload
