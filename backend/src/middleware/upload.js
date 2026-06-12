const multer = require('multer')

const DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
])

const AUDIO_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/wav',
  'audio/mpeg',
  'audio/x-m4a',
  'video/webm',
])

function createUpload(allowedTypes, label) {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
    },
    fileFilter(req, file, callback) {
      if (allowedTypes.has(file.mimetype)) {
        callback(null, true)
        return
      }
      callback(new Error(`${label} file type not allowed`))
    },
  })
}

module.exports = {
  documentUpload: createUpload(DOCUMENT_TYPES, 'Document'),
  audioUpload: createUpload(AUDIO_TYPES, 'Audio'),
}
