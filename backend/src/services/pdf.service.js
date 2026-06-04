// backend/src/services/pdf.service.js
// Build a PDF buffer from a completed interview report.
// Uses pdfkit (pure Node.js — no headless browser).

const PDFDocument = require('pdfkit')

// Brand colours (match tokens.css)
const PURPLE = '#5B4FE9'
const DARK   = '#0F172A'
const MID    = '#475569'
const LIGHT  = '#94A3B8'
const RULE   = '#E2E8F0'
const BG_BAR = '#F1F5F9'

/**
 * Render a labelled score bar.
 * @param {PDFDocument} doc
 * @param {string} label
 * @param {number} score  1-10
 * @param {number} x
 * @param {number} y
 */
function scoreBar(doc, label, score, x, y) {
  const barW = 220
  const barH = 8
  const filled = Math.max(0, Math.min(10, score || 0)) / 10

  doc.fontSize(10).fillColor(MID).text(label, x, y)
  doc.roundedRect(x, y + 16, barW, barH, 4).fill(BG_BAR)
  if (filled > 0) {
    doc.roundedRect(x, y + 16, barW * filled, barH, 4).fill(PURPLE)
  }
  doc.fontSize(10).fillColor(DARK).text(`${score || '–'}/10`, x + barW + 8, y + 14)
}

/**
 * Generate a PDF report buffer.
 * @param {Object} params
 * @param {Object} params.candidate   - { first_name, last_name, email }
 * @param {Object} params.interview   - { jd_text, difficulty, created }
 * @param {Object} params.report      - { overall_score, confidence, tech_knowledge, communication, summary, strengths, tips }
 * @returns {Promise<Buffer>}
 */
async function generateReportPdf({ candidate, interview, report }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true })
    const chunks = []
    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageW = doc.page.width - 96   // usable width (margins both sides)
    const L = 48                         // left margin

    // ── Header bar ───────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 64).fill(PURPLE)
    doc.fontSize(22).fillColor('#FFFFFF').font('Helvetica-Bold')
       .text('Screeno', L, 20)
    doc.fontSize(11).font('Helvetica').fillColor('rgba(255,255,255,0.75)')
       .text('Interview Report', L + 100, 24)

    // ── Candidate info ────────────────────────────────────────────────────────
    const name = `${candidate.first_name} ${candidate.last_name}`
    doc.moveDown(2)
    doc.fontSize(18).fillColor(DARK).font('Helvetica-Bold').text(name, L)
    doc.fontSize(10).fillColor(MID).font('Helvetica')
       .text(candidate.email || '', L)
       .text(`Difficulty: ${interview.difficulty || 'medium'} · ${new Date(interview.created || Date.now()).toDateString()}`, L)

    doc.moveDown(0.5)
    doc.moveTo(L, doc.y).lineTo(L + pageW, doc.y).strokeColor(RULE).stroke()
    doc.moveDown(0.8)

    // ── Overall score (big number) ────────────────────────────────────────────
    const scoreY = doc.y
    doc.fontSize(48).fillColor(PURPLE).font('Helvetica-Bold')
       .text(`${report.overall_score || '–'}`, L, scoreY, { width: 80, align: 'center' })
    doc.fontSize(10).fillColor(LIGHT).font('Helvetica')
       .text('Overall', L, scoreY + 52, { width: 80, align: 'center' })

    // ── Sub-score bars ────────────────────────────────────────────────────────
    const barsX = L + 100
    const barsStartY = scoreY + 4
    scoreBar(doc, 'Confidence',     report.confidence     || 0, barsX,       barsStartY)
    scoreBar(doc, 'Tech Knowledge', report.tech_knowledge || 0, barsX,       barsStartY + 44)
    scoreBar(doc, 'Communication',  report.communication  || 0, barsX + 300, barsStartY)

    doc.y = barsStartY + 88
    doc.moveDown(0.5)
    doc.moveTo(L, doc.y).lineTo(L + pageW, doc.y).strokeColor(RULE).stroke()
    doc.moveDown(0.8)

    // ── Summary ───────────────────────────────────────────────────────────────
    doc.fontSize(13).fillColor(DARK).font('Helvetica-Bold').text('Summary', L)
    doc.moveDown(0.3)
    doc.fontSize(10).fillColor(MID).font('Helvetica')
       .text(report.summary || 'No summary available.', L, doc.y, { width: pageW, lineGap: 4 })
    doc.moveDown(1)

    // ── Strengths ─────────────────────────────────────────────────────────────
    const strengths = Array.isArray(report.strengths)
      ? report.strengths
      : tryParseArray(report.strengths)

    if (strengths.length) {
      doc.fontSize(13).fillColor(DARK).font('Helvetica-Bold').text('Strengths', L)
      doc.moveDown(0.3)
      for (const s of strengths) {
        doc.fontSize(10).fillColor(MID).font('Helvetica')
           .text(`• ${s}`, L + 8, doc.y, { width: pageW - 8, lineGap: 3 })
      }
      doc.moveDown(1)
    }

    // ── Areas for improvement ─────────────────────────────────────────────────
    const tips = Array.isArray(report.tips)
      ? report.tips
      : tryParseArray(report.tips)

    if (tips.length) {
      doc.fontSize(13).fillColor(DARK).font('Helvetica-Bold').text('Areas for Improvement', L)
      doc.moveDown(0.3)
      for (const t of tips) {
        doc.fontSize(10).fillColor(MID).font('Helvetica')
           .text(`• ${t}`, L + 8, doc.y, { width: pageW - 8, lineGap: 3 })
      }
      doc.moveDown(1)
    }

    // ── JD excerpt ────────────────────────────────────────────────────────────
    if (interview.jd_text) {
      doc.moveTo(L, doc.y).lineTo(L + pageW, doc.y).strokeColor(RULE).stroke()
      doc.moveDown(0.6)
      doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold').text('Job Description', L)
      doc.moveDown(0.3)
      const jdExcerpt = (interview.jd_text || '').slice(0, 600)
      doc.fontSize(9).fillColor(LIGHT).font('Helvetica')
         .text(jdExcerpt + (interview.jd_text.length > 600 ? '…' : ''), L, doc.y, { width: pageW, lineGap: 3 })
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const pages = doc.bufferedPageRange()
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i)
      doc.fontSize(8).fillColor(LIGHT)
         .text(`Generated by Screeno · ${new Date().toDateString()}`, L, doc.page.height - 36, {
           width: pageW, align: 'center',
         })
    }

    doc.end()
  })
}

function tryParseArray(val) {
  if (!val) return []
  try { return JSON.parse(val) } catch { return [] }
}

module.exports = { generateReportPdf }
