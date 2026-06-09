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
    const json = await res.json()
    return json.data?.text || ''
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
        const json = await r.json()
        if (!json.success) throw new Error(json.error || 'AI analysis failed.')
        setRes({ ...json.data, mode: 'ai' })
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

  // Textarea fills remaining panel height via flex (no magic calc numbers)
  const taStyle = {
    flex: 1, width: '100%', height: 0, minHeight: 220,
    padding: '14px 16px', border: 'none', outline: 'none',
    resize: 'none', fontSize: 13, fontFamily: 'inherit',
    lineHeight: 1.65, color: '#0F172A', background: 'transparent',
    overflowY: 'auto', boxSizing: 'border-box',
  }

  const panels = [
    { title: 'Job Description',  text: jdText,  setText: setJdText,  file: jdFile,  setFile: setJdFile,  ref: jdFileRef,  field: 'jd',     sample: JD_SAMPLE,     ph: 'Paste the job description here, or upload a file…' },
    { title: 'Candidate Resume', text: resumeText, setText: setResumeText, file: resumeFile, setFile: setResumeFile, ref: resumeFileRef, field: 'resume', sample: RESUME_SAMPLE, ph: 'Paste the resume text here, or upload a file…' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minHeight: 0 }}>
      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} } .ta-panel:focus-within { border-color: #5B4FE9 !important; box-shadow: 0 0 0 3px rgba(91,79,233,0.12) !important; }`}</style>

      {/* ── Top bar: mode toggle + AI notice ──────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', background: '#F1F5F9', borderRadius: 10, padding: 4, border: '1px solid #E2E8F0' }}>
          {[
            { id: false, Icon: BookOpen, label: 'Library',   sub: 'Fast · Local' },
            { id: true,  Icon: Sparkles, label: 'AI (Deep)', sub: 'Semantic · LLM' },
          ].map(m => (
            <button
              key={String(m.id)}
              onClick={() => setAiMode(m.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 7, border: 'none', fontFamily: 'inherit',
                background: aiMode === m.id ? '#5B4FE9' : 'transparent',
                color: aiMode === m.id ? '#FFF' : '#6B7280',
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
                boxShadow: aiMode === m.id ? '0 2px 10px rgba(91,79,233,0.32)' : 'none',
                transition: 'all 150ms',
              }}
            >
              <m.Icon size={15} strokeWidth={aiMode === m.id ? 2.5 : 2} />
              {m.label}
              {aiMode === m.id && (
                <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.22)', letterSpacing: '0.02em' }}>
                  {m.sub}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input phase ───────────────────────────────────────── */}
      {(phase === 'input' || phase === 'analyzing') && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1, minHeight: 0 }}>
            {panels.map((c, i) => (
              <div
                key={i}
                className="ta-panel"
                style={{
                  display: 'flex', flexDirection: 'column',
                  background: '#FFF', border: '1.5px solid #E2E8F0', borderRadius: 12,
                  overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
                  transition: 'border-color 150ms, box-shadow 150ms',
                }}
              >
                {/* Panel header */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>{c.title}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => c.ref.current?.click()}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#5B4FE9', background: '#EFEDFD', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', transition: 'background 120ms' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#E0DBFB'}
                      onMouseLeave={e => e.currentTarget.style.background = '#EFEDFD'}
                    >
                      <Upload size={12} /> Upload
                    </button>
                    <button
                      onClick={() => { c.setText(c.sample); c.setFile(null) }}
                      style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, background: '#F1F5F9', border: 0, borderRadius: 6, padding: '5px 10px', cursor: 'pointer', transition: 'all 120ms' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#374151' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#6B7280' }}
                    >
                      Sample
                    </button>
                  </div>
                  <input ref={c.ref} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={e => handleFileSelect(e, c.field)} />
                </div>

                {/* File indicator */}
                {c.file && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#ECFDF5', borderBottom: '1px solid #A7F3D0', fontSize: 12, flexShrink: 0 }}>
                    <FileText size={14} color="#059669" />
                    <span style={{ color: '#047857', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{c.file.name}</span>
                    <button onClick={() => { c.setFile(null); c.setText('') }} style={{ background: 'transparent', border: 0, color: '#6B7280', cursor: 'pointer', padding: 2, display: 'inline-flex', fontSize: 16, lineHeight: 1 }}>×</button>
                  </div>
                )}

                {/* Textarea — fills remaining panel height */}
                <textarea
                  value={c.text}
                  onChange={e => c.setText(e.target.value)}
                  placeholder={c.ph}
                  style={{ ...taStyle, color: c.file ? '#94A3B8' : '#0F172A' }}
                  disabled={!!c.file}
                />
              </div>
            ))}
          </div>

          {extractError && (
            <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, color: '#B53618' }}>
              {extractError}
            </div>
          )}

          {/* Analyze button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={analyze}
              disabled={phase === 'analyzing' || !canAnalyze}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 9,
                padding: '12px 32px', borderRadius: 10, fontFamily: 'inherit',
                background: !canAnalyze ? '#E2E8F0' : '#5B4FE9',
                color: !canAnalyze ? '#94A3B8' : '#FFF',
                border: 0, fontWeight: 700, fontSize: 14,
                cursor: !canAnalyze || phase === 'analyzing' ? 'not-allowed' : 'pointer',
                boxShadow: canAnalyze && phase !== 'analyzing' ? '0 4px 16px rgba(91,79,233,0.35)' : 'none',
                transition: 'all 150ms', letterSpacing: '-0.01em',
              }}
            >
              {phase === 'analyzing'
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {aiMode ? 'Running AI analysis…' : 'Analyzing…'}</>
                : <>{aiMode ? <Sparkles size={16} /> : <Zap size={16} />} Analyze match</>}
            </button>
            {!canAnalyze && (
              <span style={{ fontSize: 12, color: '#94A3B8' }}>Paste or upload both a JD and a resume to continue.</span>
            )}
          </div>
        </>
      )}

      {/* ── Results phase ─────────────────────────────────────── */}
      {phase === 'results' && res && (() => {
        const v = verdict(res.score)
        const C = 2 * Math.PI * 34
        const VIcon = v.icon
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {res.aiNote && (
              <div style={{ padding: '9px 14px', background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 8, fontSize: 12, color: '#B45309', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={13} /> {res.aiNote}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={reset} style={{ fontSize: 13, color: '#5B4FE9', fontWeight: 600, background: 'transparent', border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <RotateCcw size={14} /> Edit inputs &amp; re-scan
              </button>
              <span style={{ fontSize: 11, color: '#94A3B8', background: '#F1F5F9', padding: '4px 10px', borderRadius: 999, fontWeight: 500 }}>
                {res.mode === 'ai' ? '✦ AI analysis' : '◈ Library analysis'}
              </span>
            </div>

            {/* Score ring + verdict */}
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'stretch' }}>
              <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 16px', textAlign: 'center', boxShadow: '0 1px 3px rgba(15,23,42,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto' }}>
                  <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="50" cy="50" r="38" stroke="#F1F5F9" strokeWidth="10" fill="none" />
                    <circle cx="50" cy="50" r="38" stroke={v.c} strokeWidth="10" fill="none" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 38 * res.score / 100} ${2 * Math.PI * 38}`}
                      style={{ transition: 'stroke-dasharray 700ms cubic-bezier(0.2,0,0,1)' }}
                    />
                  </svg>
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--font-display,'Inter')", fontSize: 28, fontWeight: 700, color: '#0F172A' }}>{res.score}%</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 10, fontWeight: 500 }}>JD match rate</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Target: 75%+</div>
              </div>

              <div style={{ background: v.bg, border: `1.5px solid ${v.bd}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <VIcon size={22} color={v.c} />
                  <span style={{ fontSize: 18, fontWeight: 700, color: v.c, letterSpacing: '-0.01em' }}>{v.label}</span>
                </div>
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, margin: 0 }}>{v.note}</p>
                {res.yJd && (
                  <div style={{ marginTop: 12, fontSize: 12, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.5)', padding: '6px 10px', borderRadius: 8 }}>
                    <Briefcase size={13} />
                    JD needs {res.yJd}+ yrs · Resume shows {res.yRes || '—'} yrs {res.yRes && Number(res.yRes) >= Number(res.yJd) ? '✓' : '⚠'}
                  </div>
                )}
              </div>
            </div>

            {/* Keyword stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              {[
                { value: (res.mH?.length || 0) + (res.mS?.length || 0), label: 'Matched keywords', bg: '#ECFDF5', c: '#047857', bd: '#A7F3D0' },
                { value: (res.missH?.length || 0) + (res.missS?.length || 0), label: 'Missing keywords', bg: '#FEF2F2', c: '#DC2626', bd: '#FECACA' },
                { value: res.missH?.length || 0, label: 'Hard skills gap', bg: '#FFFBEB', c: '#B45309', bd: '#FDE68A' },
              ].map((s, i) => (
                <div key={i} style={{ background: s.bg, border: `1px solid ${s.bd}`, borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: '#475569', fontWeight: 500, lineHeight: 1.4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Interview focus */}
            {(res.missH?.length > 0 || res.aiGaps?.length > 0) && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontSize: 13, color: '#92400E', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Target size={14} /> Probe these in the interview
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[...(res.missH || []), ...(res.aiGaps || [])].map(s => chip(s, 'miss'))}
                </div>
              </div>
            )}

            {/* AI strengths */}
            {res.mode === 'ai' && res.aiStrengths?.length > 0 && (
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontSize: 13, color: '#065F46', fontWeight: 700, marginBottom: 8 }}>AI-identified strengths</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {res.aiStrengths.map(s => chip(s, 'ok'))}
                </div>
              </div>
            )}

            {/* Detail tabs */}
            <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0' }}>
                {[['hard', 'Hard skills'], ['soft', 'Soft skills'], ['search', 'Searchability']].map(([id, l]) => (
                  <button key={id} onClick={() => setTab(id)} style={{ padding: '12px 20px', border: 0, background: 'transparent', fontSize: 13, fontWeight: 600, color: tab === id ? '#5B4FE9' : '#94A3B8', borderBottom: tab === id ? '2px solid #5B4FE9' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit', transition: 'color 120ms', marginBottom: -1 }}>
                    {l}
                  </button>
                ))}
              </div>
              <div style={{ padding: 20 }}>
                {tab === 'hard' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#047857', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Matched ({res.mH?.length || 0})</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{res.mH?.length ? res.mH.map(s => chip(s, 'ok')) : <span style={{ fontSize: 13, color: '#94A3B8' }}>None matched</span>}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#B53618', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Missing ({res.missH?.length || 0})</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{res.missH?.length ? res.missH.map(s => chip(s, 'miss')) : <span style={{ fontSize: 13, color: '#94A3B8' }}>Nothing missing — great</span>}</div>
                    </div>
                  </div>
                )}
                {tab === 'soft' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#047857', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Matched ({res.mS?.length || 0})</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{res.mS?.length ? res.mS.map(s => chip(s, 'ok')) : <span style={{ fontSize: 13, color: '#94A3B8' }}>None matched</span>}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#B53618', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Missing ({res.missS?.length || 0})</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{res.missS?.length ? res.missS.map(s => chip(s, 'miss')) : <span style={{ fontSize: 13, color: '#94A3B8' }}>Nothing missing</span>}</div>
                    </div>
                  </div>
                )}
                {tab === 'search' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(res.searchChecks || []).map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: s.ok ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${s.ok ? '#A7F3D0' : '#FECACA'}`, borderRadius: 8 }}>
                        {s.ok ? <CheckCircle2 size={16} color="#059669" /> : <XCircle size={16} color="#DC2626" />}
                        <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 500 }}>{s.label}</span>
                      </div>
                    ))}
                    <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4, lineHeight: 1.5 }}>ATS systems parse contact details and standard sections to rank resumes.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default ResumeAnalyzerPage
