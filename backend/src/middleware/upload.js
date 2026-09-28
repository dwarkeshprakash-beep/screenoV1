const multer = require('multer')

const DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
])

// Study material may also be a slide deck, so PowerPoint is allowed on top of documents.
const STUDY_MATERIAL_TYPES = new Set([
  ...DOCUMENT_TYPES,
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
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

function createUpload(allowedTypes, label, maxBytes = 5 * 1024 * 1024) {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxBytes,
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
  studyMaterialUpload: createUpload(STUDY_MATERIAL_TYPES, 'Study material', 10 * 1024 * 1024),
}
