const zlib = require('zlib')

/**
 * Minimal ZIP reader (no dependency): returns { name: Buffer } for entries whose name
 * passes `wanted`. Handles stored and deflated entries - enough for Office Open XML.
 * ZIP64 archives are not supported (Office files under the 10 MB upload cap never are).
 */
function readZipEntries(buffer, wanted) {
  // End of central directory record: last 22+ bytes, signature 0x06054b50.
  let eocd = -1
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('Not a ZIP archive')

  const entryCount = buffer.readUInt16LE(eocd + 10)
  let offset = buffer.readUInt32LE(eocd + 16)
  const entries = {}
  for (let n = 0; n < entryCount; n += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break
    const method = buffer.readUInt16LE(offset + 10)
    const compressedSize = buffer.readUInt32LE(offset + 20)
    const nameLength = buffer.readUInt16LE(offset + 28)
    const extraLength = buffer.readUInt16LE(offset + 30)
    const commentLength = buffer.readUInt16LE(offset + 32)
    const localOffset = buffer.readUInt32LE(offset + 42)
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength)
    offset += 46 + nameLength + extraLength + commentLength

    if (!wanted(name)) continue
    // The local header repeats the name and has its own extra-field length.
    const dataStart = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28)
    const data = buffer.subarray(dataStart, dataStart + compressedSize)
    if (method === 0) entries[name] = data
    else if (method === 8) entries[name] = zlib.inflateRawSync(data)
  }
  return entries
}

function decodeXmlEntities(text) {
  return text
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
}

// Slide text from a .pptx, in slide order, one line per paragraph.
function extractPptxText(buffer) {
  const slides = readZipEntries(buffer, name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
  const slideNumber = name => Number(name.match(/slide(\d+)\.xml$/)[1])
  return Object.keys(slides)
    .sort((a, b) => slideNumber(a) - slideNumber(b))
    .map(name => {
      const paragraphs = slides[name].toString('utf8').split('</a:p>')
      const lines = paragraphs
        .map(paragraph => [...paragraph.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(match => match[1]).join(''))
        .map(line => decodeXmlEntities(line).trim())
        .filter(Boolean)
      return lines.length > 0 ? `Slide ${slideNumber(name)}:\n${lines.join('\n')}` : ''
    })
    .filter(Boolean)
    .join('\n\n')
}

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
  if (mimetype?.includes('presentationml') || name.endsWith('.pptx')) {
    return extractPptxText(buffer)
  }
  // Legacy binary .ppt (and anything else) is not readable - callers treat '' as "no text".
  return ''
}

module.exports = { extractTextFromBuffer }
