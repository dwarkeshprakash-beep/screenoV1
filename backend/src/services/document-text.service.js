async function extractTextFromBuffer(buffer, mimetype, originalname) {
  const name = String(originalname || '').toLowerCase()
  if (mimetype === 'text/plain' || name.endsWith('.txt')) {
    return buffer.toString('utf8')
  }
  if (mimetype === 'application/pdf' || name.endsWith('.pdf')) {
    const { PDFParse } = require('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    try {
      const result = await parser.getText()
      return result.text || ''
    } finally {
      await parser.destroy()
    }
  }
  if (
    mimetype?.includes('wordprocessing')
    || mimetype === 'application/msword'
    || name.endsWith('.docx')
    || name.endsWith('.doc')
  ) {
    const mammoth = require('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value || ''
  }
  return ''
}

module.exports = { extractTextFromBuffer }
