import { useState } from 'react'
import { Zap, Loader2, RotateCcw, CheckCircle2, XCircle, ThumbsUp, AlertTriangle, Target, Briefcase } from 'lucide-react'

const HARD_SKILLS = [
  '.net','c#','asp.net','entity framework','azure','aws','gcp','sql','sql server','postgres','postgresql',
  'mysql','mongodb','redis','docker','kubernetes','microservices','rest','graphql','grpc','kafka','rabbitmq',
  'react','angular','vue','typescript','javascript','node.js','python','java','spring','go','ci/cd','terraform',
  'system design','unit testing','tdd','oauth','jwt','linq','async','multithreading','devops','git',
]

const SOFT_SKILLS = [
  'communication','leadership','ownership','collaboration','mentoring','problem solving','stakeholder',
  'agile','scrum','teamwork','time management','adaptability','analytical',
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

function chip(label, tone) {
  const styles = {
    ok:   { background: '#ECFDF5', color: '#047857' },
    miss: { background: '#FEF2F2', color: '#B53618' },
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
  if (score >= 85) return { label: 'Strong match — likely passes ATS', c: '#047857', bg: '#ECFDF5', bd: '#A7F3D0', icon: CheckCircle2, note: 'Strongly aligned. Most ATS filters will pass this resume through.' }
  if (score >= 65) return { label: 'Good shape — passes most filters', c: '#047857', bg: '#ECFDF5', bd: '#A7F3D0', icon: ThumbsUp, note: 'In good shape. Close the remaining gaps for competitive, high-volume roles.' }
  if (score >= 50) return { label: 'Borderline — may be filtered in large pools', c: '#B45309', bg: '#FFFBEB', bd: '#FEF3C7', icon: AlertTriangle, note: 'Might pass in a small applicant pool, but likely filtered when volume is high.' }
  return { label: 'Major mismatch — likely rejected', c: '#B53618', bg: '#FEF2F2', bd: '#FECACA', icon: XCircle, note: 'Significant skills gap for this JD. Add the missing required skills first.' }
}

function ResumeAnalyzerPage() {
  const [jd, setJd]       = useState('')
  const [resume, setResume] = useState('')
  const [phase, setPhase] = useState('input')
  const [tab, setTab]     = useState('hard')
  const [res, setRes]     = useState(null)

  function analyze() {
    setPhase('analyzing')
    setTimeout(() => {
      const J = jd.toLowerCase(), R = resume.toLowerCase()
      const inJd = dict => dict.filter(s => J.includes(s))
      const jdHard = inJd(HARD_SKILLS), jdSoft = inJd(SOFT_SKILLS)
      const has = s => R.includes(s)
      const mH = jdHard.filter(has), missH = jdHard.filter(s => !has(s))
      const mS = jdSoft.filter(has), missS = jdSoft.filter(s => !has(s))
      const total = jdHard.length * 1.4 + jdSoft.length
      const score = total ? Math.round(((mH.length * 1.4 + mS.length) / total) * 100) : 0
      const yJd  = (jd.match(/(\d+)\s*\+?\s*(?:years|yrs|year)/i) || [])[1]
      const yRes = (resume.match(/(\d+)\s*\+?\s*(?:years|yrs|year)/i) || [])[1]
      const search = [
        { label: 'Contact email present',      ok: /[\w.+-]+@[\w-]+\.[\w.-]+/.test(resume) },
        { label: 'Phone number present',       ok: /(\+?\d[\d\s-]{7,})/.test(resume) },
        { label: 'Skills section detected',    ok: /skills?/i.test(resume) },
        { label: 'Experience section detected', ok: /experien/i.test(resume) },
      ]
      setRes({ score, jdHard, jdSoft, mH, missH, mS, missS, yJd, yRes, search })
      setPhase('results')
    }, 1400)
  }

  const inputStyle = {
    width: '100%', padding: 12, border: '1px solid #CBD5E1', borderRadius: 8,
    fontSize: 13, fontFamily: 'inherit', lineHeight: 1.55, outline: 'none', resize: 'vertical',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 940 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5B4FE9', marginBottom: 4 }}>TOOLS · ANALYZER</div>
        <h1 style={{ fontFamily: "var(--font-display,'Inter')", fontSize: 26, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', margin: '0 0 6px' }}>Resume Analyzer</h1>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Paste a job description and a resume to get a JD-match score, missing keywords, and interview focus areas.</p>
      </div>

      {/* Input phase */}
      {(phase === 'input' || phase === 'analyzing') && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {[
              { t: 'Job description', v: jd, set: setJd, ph: 'Paste the full JD here…', sample: JD_SAMPLE },
              { t: 'Candidate resume', v: resume, set: setResume, ph: 'Paste the resume text here…', sample: RESUME_SAMPLE },
            ].map((c, i) => (
              <div key={i} style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{c.t}</span>
                  <button onClick={() => c.set(c.sample)} style={{ fontSize: 12, color: '#5B4FE9', fontWeight: 600, background: 'transparent', border: 0, cursor: 'pointer' }}>Load sample</button>
                </div>
                <textarea
                  value={c.v}
                  onChange={e => c.set(e.target.value)}
                  placeholder={c.ph}
                  rows={12}
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = '#5B4FE9'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }}
                  onBlur={e => { e.target.style.borderColor = '#CBD5E1'; e.target.style.boxShadow = 'none' }}
                />
              </div>
            ))}
          </div>
          <button
            onClick={analyze}
            disabled={phase === 'analyzing' || !jd.trim() || !resume.trim()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '11px 20px', borderRadius: 8, fontFamily: 'inherit',
              background: (!jd.trim() || !resume.trim()) ? '#CBD5E1' : '#5B4FE9',
              color: '#FFF', border: 0, fontWeight: 600, fontSize: 13,
              cursor: (!jd.trim() || !resume.trim() || phase === 'analyzing') ? 'not-allowed' : 'pointer',
            }}
          >
            {phase === 'analyzing'
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing…</>
              : <><Zap size={14} /> Analyze match</>}
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
            <button
              onClick={() => setPhase('input')}
              style={{ fontSize: 12, color: '#5B4FE9', fontWeight: 600, background: 'transparent', border: 0, cursor: 'pointer', marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
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
                    JD wants {res.yJd}+ yrs · resume shows {res.yRes || '—'} yrs {res.yRes && Number(res.yRes) >= Number(res.yJd) ? '✓' : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Keyword counts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
              {[
                { value: res.mH.length + res.mS.length, label: 'Matched keywords', bg: '#FFF', c: '#047857', border: '#E2E8F0' },
                { value: res.missH.length + res.missS.length, label: 'Missing keywords', bg: '#FEF2F2', c: '#DC2626', border: '#FECACA' },
                { value: res.missH.length, label: 'Hard skills to focus on', bg: '#FFFBEB', c: '#B45309', border: '#FCD34D' },
              ].map((s, i) => (
                <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: s.c, margin: 0 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Interview focus box */}
            {res.missH.length > 0 && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#92400E', fontWeight: 700, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Target size={14} /> Focus the interview here
                </div>
                <p style={{ fontSize: 13, color: '#78350F', margin: '0 0 8px' }}>These required skills are in the JD but missing from the resume — probe them directly:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{res.missH.map(s => chip(s, 'miss'))}</div>
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
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#047857', marginBottom: 8 }}>Matched ({res.mH.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{res.mH.length ? res.mH.map(s => chip(s, 'ok')) : <span style={{ fontSize: 13, color: '#94A3B8' }}>None matched</span>}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#B53618', marginBottom: 8 }}>Missing ({res.missH.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{res.missH.length ? res.missH.map(s => chip(s, 'miss')) : <span style={{ fontSize: 13, color: '#94A3B8' }}>Nothing missing — great</span>}</div>
                </div>
              </div>
            )}
            {tab === 'soft' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#047857', marginBottom: 8 }}>Matched ({res.mS.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{res.mS.length ? res.mS.map(s => chip(s, 'ok')) : <span style={{ fontSize: 13, color: '#94A3B8' }}>None matched</span>}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#B53618', marginBottom: 8 }}>Missing ({res.missS.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{res.missS.length ? res.missS.map(s => chip(s, 'miss')) : <span style={{ fontSize: 13, color: '#94A3B8' }}>Nothing missing</span>}</div>
                </div>
              </div>
            )}
            {tab === 'search' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {res.search.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: s.ok ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${s.ok ? '#A7F3D0' : '#FECACA'}`, borderRadius: 8 }}>
                    {s.ok ? <CheckCircle2 size={16} color="#059669" /> : <XCircle size={16} color="#DC2626" />}
                    <span style={{ fontSize: 13, color: '#0F172A' }}>{s.label}</span>
                  </div>
                ))}
                <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>ATS systems must parse contact details and standard sections to rank a resume.</p>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

export default ResumeAnalyzerPage
