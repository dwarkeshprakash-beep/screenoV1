// backend/src/routes/upload.routes.js
// Upload endpoints — resume upload to Cloudinary, text extraction, AI resume analysis.
// HTTP only: receive → call service → respond.

const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const upload = require('../middleware/upload')
const storageService = require('../services/storage.service')
const candidateRepository = require('../repositories/candidate.repository')
const llmService = require('../services/llm.service')

const router = express.Router()
router.use(authMiddleware, requireRole('manager'))

// Helper: extract plain text from file buffer by MIME type / extension
async function extractTextFromBuffer(buffer, mimetype, originalname) {
  const name = (originalname || '').toLowerCase()
  if (mimetype === 'text/plain' || name.endsWith('.txt')) {
    return buffer.toString('utf8')
  }
  if (mimetype === 'application/pdf' || name.endsWith('.pdf')) {
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(buffer)
    return data.text || ''
  }
  if (mimetype.includes('wordprocessing') || name.endsWith('.docx') || name.endsWith('.doc')) {
    const mammoth = require('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value || ''
  }
  return ''
}

/**
 * POST /api/upload/resume
 * Uploads a PDF resume to Cloudinary and saves the URL to the candidate record.
 * Body: multipart/form-data — fields: resume (file), candidateId (string)
 */
router.post('/resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' })

    const candidateId = parseInt(req.body.candidateId, 10)
    if (!candidateId) return res.status(400).json({ success: false, error: 'candidateId is required' })

    const { url } = await storageService.uploadResume(req.file.buffer, req.file.originalname)
    const candidate = await candidateRepository.getByIdForCompany(candidateId, req.user.companyId)
    if (!candidate) return res.status(404).json({ success: false, error: 'Candidate not found' })
    await candidateRepository.update(candidateId, { resumeUrl: url }, req.user.companyId)

    res.json({ success: true, data: { resumeUrl: url } })
  } catch (err) {
    console.error('POST /upload/resume failed:', err)
    res.status(500).json({ success: false, error: 'Upload failed' })
  }
})

/**
 * POST /api/upload/extract-text
 * Extracts plain text from an uploaded PDF, DOCX, or TXT file.
 * Body: multipart/form-data — field: file
 */
router.post('/extract-text', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' })
    const text = await extractTextFromBuffer(req.file.buffer, req.file.mimetype, req.file.originalname)
    res.json({ success: true, data: { text } })
  } catch (err) {
    console.error('POST /upload/extract-text failed:', err)
    res.status(500).json({ success: false, error: 'Could not extract text from file' })
  }
})

/**
 * POST /api/upload/analyze-resume
 * AI-powered semantic analysis of a resume against a JD.
 * Body: JSON { jd: string, resume: string }
 * Returns: { score, mH, missH, mS, missS, aiStrengths, aiGaps, aiNote, ... }
 */
router.post('/analyze-resume', express.json(), async (req, res) => {
  const { jd, resume } = req.body || {}
  if (!jd || !resume) {
    return res.status(400).json({ success: false, error: 'jd and resume are required' })
  }

  const prompt = `You are a technical recruiter. Analyze this candidate's resume against the job description.

JOB DESCRIPTION:
${jd.slice(0, 3000)}

RESUME:
${resume.slice(0, 3000)}

Return a JSON object with:
- score: number 0-100 (how well the resume matches the JD)
- mH: string[] (hard/technical skills that match)
- missH: string[] (required hard skills missing from resume)
- mS: string[] (soft skills that match)
- missS: string[] (required soft skills missing from resume)
- aiStrengths: string[] (notable strengths of this candidate)
- aiGaps: string[] (key gaps to probe in interview)
- yJd: string|null (years of experience required in JD)
- yRes: string|null (years of experience shown in resume)
- searchChecks: [{label: string, ok: boolean}] (4 ATS checks: email present, phone present, skills section, experience section)

Be precise. Only list skills that are genuinely required in the JD or genuinely present in the resume. Return only valid JSON, no explanation.`

  try {
    const raw = await llmService.callRaw(prompt)
    // Parse JSON from LLM response
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in LLM response')
    const data = JSON.parse(jsonMatch[0])
    data.mode = 'ai'
    res.json({ success: true, data })
  } catch (err) {
    console.error('POST /upload/analyze-resume failed:', err)
    res.status(500).json({ success: false, error: 'AI analysis failed', detail: err.message })
  }
})

module.exports = router
