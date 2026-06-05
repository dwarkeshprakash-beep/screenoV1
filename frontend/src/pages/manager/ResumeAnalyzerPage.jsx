// ResumeAnalyzerPage — paste or upload JD and resume, get keyword match score.
// Modes:
//   Library mode — fast, local regex matching with word-boundary guards
//   AI mode     — sends to backend LLM for deep semantic analysis

import { useState, useRef } from 'react'
import { Zap, Loader2, RotateCcw, CheckCircle2, XCircle, ThumbsUp, AlertTriangle, Target, Briefcase, Upload, FileText, Sparkles, BookOpen } from 'lucide-react'
import * as api from '../../services/api'

// ── Skill dictionaries ─────────────────────────────────────────
// Use \b word boundaries and careful escaping to avoid false positives.
// e.g. "Java" must not match "JavaScript"
const HARD_SKILL_PATTERNS = [
  { label: '.NET',         re: /\b\.net\b/i },
  { label: 'C#',           re: /\bc#\b/i },
  { label: 'ASP.NET',      re: /\basp\.net\b/i },
  { label: 'Entity Framework', re: /\bentity\s+framework\b/i },
  { label: 'Azure',        re: /\bazure\b/i },
  { label: 'AWS',          re: /\baws\b/i },
  { label: 'GCP',          re: /\bgcp\b/i },
  { label: 'SQL',          re: /\bsql\b/i },
  { label: 'SQL Server',   re: /\bsql\s+server\b/i },
  { label: 'PostgreSQL',   re: /\bpostgresql?\b/i },
  { label: 'MySQL',        re: /\bmysql\b/i },
  { label: 'MongoDB',      re: /\bmongodb\b/i },
  { label: 'Redis',        re: /\bredis\b/i },
  { label: 'Docker',       re: /\bdocker\b/i },
  { label: 'Kubernetes',   re: /\bkubernetes\b|k8s/i },
  { label: 'Microservices',re: /\bmicroservices?\b/i },
  { label: 'REST',         re: /\brest\b/i },
  { label: 'GraphQL',      re: /\bgraphql\b/i },
  { label: 'gRPC',         re: /\bgrpc\b/i },
  { label: 'Kafka',        re: /\bkafka\b/i },
  { label: 'RabbitMQ',     re: /\brabbitmq\b/i },
  { label: 'React',        re: /\breact\b/i },
  { label: 'Angular',      re: /\bangular\b/i },
  { label: 'Vue',          re: /\bvue\.?js\b/i },
  { label: 'TypeScript',   re: /\btypescript\b/i },
  { label: 'JavaScript',   re: /\bjavascript\b/i },
  { label: 'Node.js',      re: /\bnode\.?js\b/i },
  { label: 'Python',       re: /\bpython\b/i },
  // "Java" must NOT match "JavaScript" — use negative lookahead
  { label: 'Java',         re: /\bjava(?!script)\b/i },
  { label: 'Spring',       re: /\bspring\b/i },
  { label: 'Go',           re: /\bgolang\b|\bgo\s+lang\b|\bwritten in go\b/i },
  { label: 'CI/CD',        re: /\bci\s*\/\s*cd\b/i },
  { label: 'Terraform',    re: /\bterraform\b/i },
  { label: 'System Design',re: /\bsystem\s+design\b/i },
  { label: 'Unit Testing', re: /\bunit\s+test/i },
  { label: 'TDD',          re: /\btdd\b/i },
  { label: 'OAuth',        re: /\boauth\b/i },
  { label: 'JWT',          re: /\bjwt\b/i },
  { label: 'LINQ',         re: /\blinq\b/i },
  { label: 'DevOps',       re: /\bdevops\b/i },
  { label: 'Git',          re: /\bgit\b/i },
]

const SOFT_SKILL_PATTERNS = [
  { label: 'Communication',     re: /\bcommunicat/i },
  { label: 'Leadership',        re: /\bleadership\b/i },
  { label: 'Ownership',         re: /\bownership\b/i },
  { label: 'Collaboration',     re: /\bcollaborat/i },
  { label: 'Mentoring',         re: /\bmentor/i },
  { label: 'Problem Solving',   re: /\bproblem.solv/i },
  { label: 'Stakeholder Mgmt',  re: /\bstakeholder/i },
  { label: 'Agile',             re: /\bagile\b/i },
  { label: 'Scrum',             re: /\bscrum\b/i },
  { label: 'Teamwork',          re: /\bteamwork\b/i },
  { label: 'Analytical',        re: /\banalytic/i },
  { label: 'Adaptability',      re: /\badapt/i },
]

const JD_SAMPLE = `Senior .NET Developer — Acme Technologies (Bangalore, Hybrid)

We are hiring a Senior .NET Developer to build scalable backend services.

Requirements:
- 5+ years with C# and .NET / ASP.NET Core
- Strong experience with Microservices and System Design
- Hands-on with Azure (App Service, Functions, Service Bus)
- SQL Server and Entity Framework
- CI/CD, Docker, Kubernetes
- REST and gRPC APIs
- Excellent communication and leadership; mentoring junior engineers`

const RESUME_SAMPLE = `Rahul Sharma — Senior Software Engineer
rahul.sharma@gmail.com · +91 99887 65432 · Bangalore

SUMMARY
Backend engineer with 6 years building .NET and C# microservices on Postgres and Docker.
Strong on REST APIs, async processing with Kafka, and unit testing. Good communication and ownership.

EXPERIENCE
- Built an order-reconciliation service in .NET consuming Kafka events, writing to Postgres.
- Designed REST APIs with LINQ and Entity Framework; led a small team using Agile/Scrum.
- Containerised services with Docker and set up CI/CD pipelines in Git.

SKILLS
.NET, C#, SQL, Postgres, Docker, Kafka, REST, LINQ, Entity Framework, Unit Testing, Agile`

// ── Helpers ────────────────────────────────────────────────────
function chip(label, tone) {
  const styles = {
    ok:      { background: '#ECFDF5', color: '#047857' },
    miss:    { background: '#FEF2F2', color: '#B53618' },
    neutral: { background: '#F1F5F9', color: '#475569' },
  }
  const s = styles[tone] || styles.neutral
  return (
    <span key={label} style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 9999, ...s }}>
      {label}
    </span>
  )
}

function verdict(score) {
  if (score >= 85) return { label: 'Strong match', c: '#047857', bg: '#ECFDF5', bd: '#A7F3D0', icon: CheckCircle2, note: 'Highly aligned — most ATS filters will pass this resume.' }
  if (score >= 65) return { label: 'Good match', c: '#047857', bg: '#ECFDF5', bd: '#A7F3D0', icon: ThumbsUp, note: 'In good shape. Close remaining gaps for competitive roles.' }
  if (score >= 50) return { label: 'Borderline', c: '#B45309', bg: '#FFFBEB', bd: '#FEF3C7', icon: AlertTriangle, note: 'May pass a small pool but likely filtered at high volume.' }
  return { label: 'Major mismatch', c: '#B53618', bg: '#FEF2F2', bd: '#FECACA', icon: XCircle, note: 'Significant skills gap — address required skills first.' }
}

function libraryAnalyze(jd, resume) {
  const inText = (text, pattern) => pattern.re.test(text)
  const jdHard  = HARD_SKILL_PATTERNS.filter(p => inText(jd, p))
  const jdSoft  = SOFT_SKILL_PATTERNS.filter(p => inText(jd, p))
  const mH   = jdHard.filter(p => inText(resume, p))
  const missH = jdHard.filter(p => !inText(resume, p))
  const mS   = jdSoft.filter(p => inText(resume, p))
  const missS = jdSoft.filter(p => !inText(resume, p))
  const total = jdHard.length * 1.4 + jdSoft.length
  const score = total ? Math.round(((mH.length * 1.4 + mS.length) / total) * 100) : 0
  const yJd  = (jd.match(/(\d+)\s*\+?\s*(?:years?|yrs?)/i) || [])[1]
  const yRes = (resume.match(/(\d+)\s*\+?\s*(?:years?|yrs?)/i) || [])[1]
  const searchChecks = [
    { label: 'Contact email present',       ok: /[^\s@]+@[^\s@]+\.[^\s@]+/.test(resume) },
    { label: 'Phone number present',        ok: /(\+?\d[\d\s\-]{7,})/.test(resume) },
    { label: 'Skills section detected',     ok: /skills?/i.test(resume) },
    { label: 'Experience section detected', ok: /experien/i.test(resume) },
  ]
  return {
    score, mode: 'library',
    jdHard: jdHard.map(p => p.label), jdSoft: jdSoft.map(p => p.label),
    mH: mH.map(p => p.label), missH: missH.map(p => p.label),
    mS: mS.map(p => p.label), missS: missS.map(p => p.label),
    yJd, yRes, searchChecks,
    aiStrengths: [], aiGaps: [], aiNote: null,
  }
}

// ── File text extraction (client side for plain text; server needed for PDF/DOCX) ─
async function extractText(file) {
  if (!file) return ''
  if (file.type === 'text/plain') return file.text()
  // PDF and DOCX require server-side extraction — send to backend
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf') ||
      file.type.includes('wordprocessing') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
    const fd = new FormData()
    fd.append('file', file)
    const token = localStorage.getItem('accessToken') || ''
    const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/upload/extract-text`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
    if (!res.ok) throw new Error('Could not extract text from file.')
    const data = await res.json()
    return data.text || ''
  }
  return ''
}

// ── Main component ─────────────────────────────────────────────
function ResumeAnalyzerPage() {
  const [jdText, setJdText]       = useState('')
  const [resumeText, setResumeText] = useState('')
  const [jdFile, setJdFile]       = useState(null)
  const [resumeFile, setResumeFile] = useState(null)
  const [phase, setPhase]         = useState('input')  // input | analyzing | results
  const [aiMode, setAiMode]       = useState(false)
  const [tab, setTab]             = useState('hard')
  const [res, setRes]             = useState(null)
  const [extractError, setExtractError] = useState(null)

  const jdFileRef     = useRef(null)
  const resumeFileRef = useRef(null)

  async function analyze() {
    setExtractError(null)
    setPhase('analyzing')

    let jd     = jdText
    let resume = resumeText

    try {
      if (jdFile)     jd     = await extractText(jdFile)
      if (resumeFile) resume = await extractText(resumeFile)
    } catch (err) {
      setExtractError(err.message || 'Failed to read file.')
      setPhase('input')
      return
    }

    if (aiMode) {
      // AI mode — call backend
      try {
        const r = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/upload/analyze-resume`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
          body: JSON.stringify({ jd, resume }),
        })
        if (!r.ok) throw new Error('AI analysis failed.')
        const data = await r.json()
        setRes({ ...data, mode: 'ai' })
        setPhase('results')
      } catch (err) {
        // Fall back to library mode if AI fails
        setRes({ ...libraryAnalyze(jd, resume), aiNote: 'AI mode unavailable — showing library results.' })
        setPhase('results')
      }
    } else {
      // Library mode — local, fast
      setTimeout(() => {
        setRes(libraryAnalyze(jd, resume))
        setPhase('results')
      }, 800)
    }
  }

  async function handleFileSelect(e, target) {
    const file = e.target.files?.[0]
    if (!file) return
    if (target === 'jd') {
      setJdFile(file)
      if (file.type === 'text/plain') setJdText(await file.text())
    } else {
      setResumeFile(file)
      if (file.type === 'text/plain') setResumeText(await file.text())
    }
  }

  function reset() {
    setPhase('input'); setRes(null); setExtractError(null)
  }

  const canAnalyze = (jdText.trim() || jdFile) && (resumeText.trim() || resumeFile)

  const inputStyle = {
    width: '100%', padding: 12, border: '1px solid #CBD5E1', borderRadius: 8,
    fontSize: 13, fontFamily: 'inherit', lineHeight: 1.55, outline: 'none', resize: 'vertical',
    boxSizing: 'border-box', transition: 'border-color 120ms, box-shadow 120ms',
  }
  const onF = e => { e.target.style.borderColor = '#5B4FE9'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }
  const onB = e => { e.target.style.borderColor = '#CBD5E1'; e.target.style.boxShadow = 'none' }

  return (
    <div style={{ maxWidth: 980 }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5B4FE9', marginBottom: 4 }}>TOOLS · ANALYZER</div>
        <h1 style={{ fontFamily: "var(--font-display,'Inter')", fontSize: 26, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', margin: '0 0 6px' }}>Resume Analyzer</h1>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Upload or paste a JD and resume to get a match score, missing skills, and interview focus areas.</p>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'inline-flex', background: '#F1F5F9', borderRadius: 8, padding: 3, marginBottom: 20, border: '1px solid #E2E8F0' }}>
        {[
          { id: false, label: 'Library',   icon: BookOpen,  desc: 'Fast, local keyword matching' },
          { id: true,  label: 'AI (Deep)', icon: Sparkles,  desc: 'Semantic analysis via LLM' },
        ].map(m => {
          const MIcon = m.icon
          return (
            <button
              key={String(m.id)}
              onClick={() => setAiMode(m.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 6, border: 'none', fontFamily: 'inherit',
                background: aiMode === m.id ? '#FFF' : 'transparent',
                color: aiMode === m.id ? '#0F172A' : '#6B7280',
                fontWeight: aiMode === m.id ? 600 : 500, fontSize: 13,
                cursor: 'pointer', boxShadow: aiMode === m.id ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
                transition: 'all 120ms',
              }}
            >
              <MIcon size={14} /> {m.label}
            </button>
          )
        })}
      </div>
      {aiMode && (
        <div style={{ padding: '8px 12px', background: '#EFEDFD', border: '1px solid #C4BFFA', borderRadius: 8, fontSize: 12, color: '#3A31A3', marginBottom: 16 }}>
          <strong>AI mode:</strong> requires a running backend with GROQ_API_KEY configured. Falls back to library mode if unavailable.
        </div>
      )}

      {/* Input phase */}
      {(phase === 'input' || phase === 'analyzing') && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {[
              { title: 'Job Description',  text: jdText,  setText: setJdText,  file: jdFile,  setFile: setJdFile,  ref: jdFileRef,  field: 'jd',     sample: JD_SAMPLE,     ph: 'Paste JD here…' },
              { title: 'Candidate Resume', text: resumeText, setText: setResumeText, file: resumeFile, setFile: setResumeFile, ref: resumeFileRef, field: 'resume', sample: RESUME_SAMPLE, ph: 'Paste resume text here…' },
            ].map((c, i) => (
              <div key={i} style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{c.title}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => c.ref.current?.click()}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#5B4FE9', background: '#EFEDFD', border: 'none', borderRadius: 6, padding: '4px 9px', cursor: 'pointer' }}
                    >
                      <Upload size={11} /> Upload
                    </button>
                    <button onClick={() => { c.setText(c.sample); c.setFile(null) }} style={{ fontSize: 11, color: '#5B4FE9', fontWeight: 600, background: 'transparent', border: 0, cursor: 'pointer' }}>
                      Sample
                    </button>
                  </div>
                  <input ref={c.ref} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={e => handleFileSelect(e, c.field)} />
                </div>

                {c.file && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, marginBottom: 8, fontSize: 12 }}>
                    <FileText size={13} color="#059669" />
                    <span style={{ color: '#047857', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.file.name}</span>
                    <button onClick={() => { c.setFile(null); c.setText('') }} style={{ background: 'transparent', border: 0, color: '#6B7280', cursor: 'pointer', padding: 0, fontSize: 13 }}>✕</button>
                  </div>
                )}

                {!c.file && (
                  <textarea
                    value={c.text}
                    onChange={e => c.setText(e.target.value)}
                    placeholder={c.ph}
                    rows={12}
                    style={inputStyle}
                    onFocus={onF} onBlur={onB}
                  />
                )}
              </div>
            ))}
          </div>

          {extractError && (
            <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, color: '#B53618', marginBottom: 12 }}>
              {extractError}
            </div>
          )}

          <button
            onClick={analyze}
            disabled={phase === 'analyzing' || !canAnalyze}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '11px 20px', borderRadius: 8, fontFamily: 'inherit',
              background: !canAnalyze ? '#CBD5E1' : '#5B4FE9',
              color: '#FFF', border: 0, fontWeight: 600, fontSize: 13,
              cursor: !canAnalyze || phase === 'analyzing' ? 'not-allowed' : 'pointer',
              transition: 'all 120ms',
            }}
          >
            {phase === 'analyzing'
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {aiMode ? 'Running AI analysis…' : 'Analyzing…'}</>
              : <>{aiMode ? <Sparkles size={14} /> : <Zap size={14} />} Analyze match</>}
          </button>
          <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
        </div>
      )}

      {/* Results phase */}
      {phase === 'results' && res && (() => {
        const v = verdict(res.score)
        const C = 2 * Math.PI * 34
        const VIcon = v.icon
        return (
          <div>
            {res.aiNote && (
              <div style={{ padding: '8px 12px', background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 8, fontSize: 12, color: '#B45309', marginBottom: 14 }}>
                ⚠ {res.aiNote}
              </div>
            )}

            <button onClick={reset} style={{ fontSize: 12, color: '#5B4FE9', fontWeight: 600, background: 'transparent', border: 0, cursor: 'pointer', marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <RotateCcw size={13} /> Edit inputs &amp; re-scan
            </button>

            {/* Score ring + verdict */}
            <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: 20, marginBottom: 20, alignItems: 'center' }}>
              <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 18, textAlign: 'center', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
                <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto' }}>
                  <svg width="96" height="96" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="48" cy="48" r="34" stroke="#F1F5F9" strokeWidth="9" fill="none" />
                    <circle cx="48" cy="48" r="34" stroke={v.c} strokeWidth="9" fill="none" strokeLinecap="round"
                      strokeDasharray={`${C * res.score / 100} ${C}`}
                      style={{ transition: 'stroke-dasharray 700ms cubic-bezier(0.2,0,0,1)' }}
                    />
                  </svg>
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--font-display,'Inter')", fontSize: 26, fontWeight: 700, color: '#0F172A' }}>{res.score}%</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>JD match rate</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Target: 75%+</div>
                <div style={{ marginTop: 8, fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>
                  {res.mode === 'ai' ? '✦ AI analysis' : 'Library analysis'}
                </div>
              </div>

              <div style={{ background: v.bg, border: `1px solid ${v.bd}`, borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <VIcon size={20} color={v.c} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: v.c }}>{v.label}</span>
                </div>
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>{v.note}</p>
                {res.yJd && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Briefcase size={13} />
                    JD needs {res.yJd}+ yrs · Resume shows {res.yRes || '—'} yrs {res.yRes && Number(res.yRes) >= Number(res.yJd) ? '✓' : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Keyword counts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
              {[
                { value: (res.mH?.length || 0) + (res.mS?.length || 0), label: 'Matched keywords', bg: '#FFF', c: '#047857', border: '#E2E8F0' },
                { value: (res.missH?.length || 0) + (res.missS?.length || 0), label: 'Missing keywords', bg: '#FEF2F2', c: '#DC2626', border: '#FECACA' },
                { value: res.missH?.length || 0, label: 'Hard skills to focus on', bg: '#FFFBEB', c: '#B45309', border: '#FCD34D' },
              ].map((s, i) => (
                <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: s.c, margin: 0 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Interview focus box */}
            {(res.missH?.length > 0 || res.aiGaps?.length > 0) && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#92400E', fontWeight: 700, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Target size={14} /> Focus the interview here
                </div>
                <p style={{ fontSize: 13, color: '#78350F', margin: '0 0 8px' }}>
                  These required skills are missing from the resume — probe them directly:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[...(res.missH || []), ...(res.aiGaps || [])].map(s => chip(s, 'miss'))}
                </div>
              </div>
            )}

            {/* AI-specific insights */}
            {res.mode === 'ai' && res.aiStrengths?.length > 0 && (
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#065F46', fontWeight: 700, margin: '0 0 8px' }}>AI-identified strengths</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {res.aiStrengths.map(s => chip(s, 'ok'))}
                </div>
              </div>
            )}

            {/* Detail tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid #E2E8F0' }}>
              {[['hard', 'Hard skills'], ['soft', 'Soft skills'], ['search', 'Searchability']].map(([id, l]) => (
                <button key={id} onClick={() => setTab(id)} style={{ padding: '10px 16px', border: 0, background: 'transparent', fontSize: 13, fontWeight: 600, color: tab === id ? '#5B4FE9' : '#94A3B8', borderBottom: tab === id ? '2px solid #5B4FE9' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
              ))}
            </div>

            {tab === 'hard' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#047857', marginBottom: 8 }}>Matched ({res.mH?.length || 0})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{res.mH?.length ? res.mH.map(s => chip(s, 'ok')) : <span style={{ fontSize: 13, color: '#94A3B8' }}>None matched</span>}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#B53618', marginBottom: 8 }}>Missing ({res.missH?.length || 0})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{res.missH?.length ? res.missH.map(s => chip(s, 'miss')) : <span style={{ fontSize: 13, color: '#94A3B8' }}>Nothing missing — great</span>}</div>
                </div>
              </div>
            )}
            {tab === 'soft' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#047857', marginBottom: 8 }}>Matched ({res.mS?.length || 0})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{res.mS?.length ? res.mS.map(s => chip(s, 'ok')) : <span style={{ fontSize: 13, color: '#94A3B8' }}>None matched</span>}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#B53618', marginBottom: 8 }}>Missing ({res.missS?.length || 0})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{res.missS?.length ? res.missS.map(s => chip(s, 'miss')) : <span style={{ fontSize: 13, color: '#94A3B8' }}>Nothing missing</span>}</div>
                </div>
              </div>
            )}
            {tab === 'search' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(res.searchChecks || []).map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: s.ok ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${s.ok ? '#A7F3D0' : '#FECACA'}`, borderRadius: 8 }}>
                    {s.ok ? <CheckCircle2 size={16} color="#059669" /> : <XCircle size={16} color="#DC2626" />}
                    <span style={{ fontSize: 13, color: '#0F172A' }}>{s.label}</span>
                  </div>
                ))}
                <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>ATS systems parse contact details and standard sections to rank resumes.</p>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

export default ResumeAnalyzerPage
