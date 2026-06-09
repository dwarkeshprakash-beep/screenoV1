// ScheduleModal — 4-step wizard to schedule interviews.
// Step 1: Interview mode + stage types (AI voice, AI exam, human interview)
// Step 2: Configure (attempts, cooldown, JD upload, focus, difficulty)
// Step 3: Candidates (chips like email To field) + report recipients
// Step 4: Review + send

import { useState, useEffect, useRef } from 'react'
import { X, Plus, Mic, Code2, Video, UploadCloud, FileCheck2, ChevronDown, Check } from 'lucide-react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import * as api from '../../services/api'

// ── helpers ────────────────────────────────────────────────────
const STEP_LABELS = ['Type', 'Configure', 'Recipients', 'Confirm']

const INTERVIEW_TYPES = [
  { id: 'ai_voice',  label: 'AI Voice Interview', icon: Mic,    desc: 'AI conducts a spoken interview, auto-generates transcript and scorecard.', color: '#5B4FE9', bg: '#EFEDFD' },
  { id: 'exam',      label: 'AI Coding Exam',     icon: Code2,  desc: 'MCQ, coding challenges, and scenario-based questions with a timer.',       color: '#2563EB', bg: '#EFF6FF' },
  { id: 'human',     label: 'Human Interview',    icon: Video,  desc: 'Schedule a live session via Screeno Room — invite an interviewer.',         color: '#059669', bg: '#ECFDF5' },
]

const MODES = [
  { id: 'client_mock',       label: 'Client mock interview' },
  { id: 'internal_monthly',  label: 'Internal monthly assessment' },
]

const AV_COLORS = [
  { bg: '#EDE9FE', fg: '#5B21B6' }, { bg: '#FED7AA', fg: '#9A3412' },
  { bg: '#A7F3D0', fg: '#065F46' }, { bg: '#BFDBFE', fg: '#1E40AF' },
  { bg: '#FBCFE8', fg: '#9D174D' }, { bg: '#FDE68A', fg: '#854D0E' },
]
function avHash(s) { let h = 0; for (let i = 0; i < (s || '').length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h) }
function TinyAv({ name = '?' }) {
  const c = AV_COLORS[avHash(name) % AV_COLORS.length]
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div style={{ width: 22, height: 22, borderRadius: 9999, background: c.bg, color: c.fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 9, flexShrink: 0 }}>
      {ini}
    </div>
  )
}

// Email-chip-style candidate picker
function CandidateChips({ candidates, onRemove, teamList, onAdd, label = 'To' }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const existing = new Set(candidates.map(c => c.id))
  const filtered = teamList.filter(u => {
    if (existing.has(u.id)) return false
    const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase()
    return !search || name.includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
          padding: '7px 10px', border: `1px solid ${open ? '#5B4FE9' : '#CBD5E1'}`,
          borderRadius: 8, cursor: 'text', minHeight: 42,
          boxShadow: open ? '0 0 0 3px rgba(91,79,233,0.18)' : 'none',
          transition: 'all 120ms',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginRight: 2 }}>{label}:</span>
        {candidates.map(c => {
          const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email
          return (
            <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px 3px 5px', background: '#EFEDFD', borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#3A31A3' }}>
              <TinyAv name={name} />
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span style={{ fontWeight: 600 }}>{name}</span>
                {c.email && name !== c.email && <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 400 }}>{c.email}</span>}
              </span>
              <button type="button" onClick={e => { e.stopPropagation(); onRemove(c.id) }} style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', color: '#6B7280', display: 'inline-flex', lineHeight: 1, marginLeft: 2 }}>
                <X size={11} />
              </button>
            </span>
          )
        })}
        {open && (
          <input
            autoFocus
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{ border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', flex: 1, minWidth: 80, background: 'transparent' }}
          />
        )}
        {!open && candidates.length === 0 && (
          <span style={{ fontSize: 13, color: '#94A3B8' }}>Search candidates…</span>
        )}
      </div>

      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 8, boxShadow: '0 8px 24px rgba(15,23,42,0.12)', maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>
              {search ? 'No matches found.' : 'All team members already added.'}
            </div>
          ) : (
            filtered.map((u, i) => {
              const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
              return (
                <div
                  key={u.id}
                  onClick={() => { onAdd(u); setSearch('') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 14px', cursor: 'pointer',
                    borderTop: i === 0 ? 'none' : '1px solid #F1F5F9',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = '#FFF'}
                >
                  <TinyAv name={name} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{name}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>{u.email}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// Email chips for report recipients (free-entry or pick from org)
function EmailChips({ emails, onRemove, orgUsers, onAdd, label, disabledEmails = [] }) {
  const [open, setOpen] = useState(false)
  const [val, setVal]   = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function addEmail(email) {
    const e = email.trim().toLowerCase()
    if (e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !emails.includes(e) && !disabledEmails.includes(e)) {
      onAdd(e)
    }
    setVal('')
  }

  function handleKey(e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(val) }
    if (e.key === 'Backspace' && !val && emails.length > 0) onRemove(emails[emails.length - 1])
  }

  const filtered = orgUsers.filter(u => {
    const email = (u.email || '').toLowerCase()
    return !emails.includes(email) && !disabledEmails.includes(email) &&
           (!val || email.includes(val.toLowerCase()) || `${u.first_name} ${u.last_name}`.toLowerCase().includes(val.toLowerCase()))
  })

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
          padding: '7px 10px', border: `1px solid ${open ? '#5B4FE9' : '#CBD5E1'}`,
          borderRadius: 8, cursor: 'text', minHeight: 42,
          boxShadow: open ? '0 0 0 3px rgba(91,79,233,0.18)' : 'none',
          transition: 'all 120ms',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginRight: 2 }}>{label}:</span>
        {disabledEmails.map(e => (
          <span key={e} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 9999, fontSize: 12, fontWeight: 500, color: '#047857' }}>
            {e} <span style={{ fontSize: 10, color: '#059669' }}>(you)</span>
          </span>
        ))}
        {emails.map(e => (
          <span key={e} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', background: '#EFEDFD', border: '1px solid #C4B5FD', borderRadius: 9999, fontSize: 12, fontWeight: 500, color: '#3A31A3' }}>
            {e}
            <button type="button" onClick={ev => { ev.stopPropagation(); onRemove(e) }} style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', color: '#6B7280', display: 'inline-flex', lineHeight: 1 }}>
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setOpen(true)}
          placeholder={emails.length === 0 && disabledEmails.length === 0 ? 'Add email or search…' : ''}
          style={{ border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', flex: 1, minWidth: 80, background: 'transparent' }}
        />
      </div>

      {open && (val || filtered.length > 0) && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 8, boxShadow: '0 8px 24px rgba(15,23,42,0.12)', maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
          {val && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()) && (
            <div onClick={() => addEmail(val)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid #F1F5F9' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.background = '#FFF'}>
              <Plus size={13} color="#5B4FE9" />
              <span style={{ fontSize: 13, color: '#5B4FE9' }}>Add "{val.trim()}"</span>
            </div>
          )}
          {filtered.slice(0, 6).map((u, i) => (
            <div key={u.id} onClick={() => { onAdd(u.email); setVal('') }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderTop: i === 0 ? 'none' : '1px solid #F1F5F9', transition: 'background 100ms' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.background = '#FFF'}>
              <TinyAv name={`${u.first_name} ${u.last_name}`} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{u.first_name} {u.last_name}</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>{u.email}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
function ScheduleModal({ open, onClose, member, selectedIds = [], template, onDone }) {
  const [step, setStep]     = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  // ── Step 1 state ────────────────────────────────────────────
  const [mode, setMode]     = useState('internal_monthly')
  const [stages, setStages] = useState([{ id: 'ai_voice' }])
  const [voiceMode, setVoiceMode] = useState('simple')

  // ── Step 2 state ────────────────────────────────────────────
  const [maxAttempts, setMaxAttempts] = useState(1)          // 1 = one-time link, -1 = unlimited
  const [jdFile, setJdFile]           = useState(null)
  const [jdText, setJdText]           = useState('')
  const [focusAreas, setFocusAreas]   = useState('')
  const [difficulty, setDifficulty]   = useState('medium')
  const [questionCount, setQuestionCount] = useState(10)     // 10, 20, or 30 (Full)
  const [transcriptionMode, setTranscriptionMode] = useState('api')
  const jdInputRef = useRef(null)

  // ── Step 3 state ────────────────────────────────────────────
  const [teamList, setTeamList]         = useState([])
  const [interviewers, setInterviewers] = useState([])
  const [orgUsers, setOrgUsers]         = useState([])  // company users (report recipient suggestions)
  const [candidates, setCandidates]     = useState([])  // selected candidate objects
  const [reportEmails, setReportEmails] = useState([])  // extra CC emails for report

  // ── Manager email (auto-added to report CC) ────────────────
  const [managerEmail, setManagerEmail] = useState('')
  const [interviewerId, setInterviewerId] = useState('')
  const [scheduledStart, setScheduledStart] = useState('')

  useEffect(() => {
    if (!open) return
    setStep(1); setError(null)
    // Pre-fill from template
    if (template) {
      setMaxAttempts(template.attempts || 1)
      setFocusAreas(template.description || '')
    }
    // Load team
    api.getTeam().then(r => setTeamList(r.data || [])).catch(() => setTeamList([]))
    api.getInterviewers().then(r => setInterviewers(r.data || [])).catch(() => setInterviewers([]))
    api.getOrgUsers().then(r => setOrgUsers(r.data || [])).catch(() => setOrgUsers([]))
    // Get manager email
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      if (u.email) setManagerEmail(u.email)
    } catch {}
    // Pre-fill candidates from props
    if (member) setCandidates([member])
    else setCandidates([])
  }, [open])

  function addStage(typeId) {
    if (stages.length < 3 && !stages.find(s => s.id === typeId)) {
      setStages(s => [...s, { id: typeId }])
    }
  }
  function removeStage(i) { if (stages.length > 1) setStages(s => s.filter((_, idx) => idx !== i)) }

  function addCandidate(u) {
    if (!candidates.find(c => c.id === u.id)) setCandidates(prev => [...prev, u])
  }
  function removeCandidate(id) { setCandidates(prev => prev.filter(c => c.id !== id)) }

  function addReportEmail(email) { setReportEmails(prev => [...prev, email]) }
  function removeReportEmail(email) { setReportEmails(prev => prev.filter(e => e !== email)) }

  async function handleJdFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setJdFile(file)
    // Try to extract text from file for AI use
    if (file.type === 'text/plain') {
      const text = await file.text()
      setJdText(text)
    } else {
      // For PDF/DOCX: just store filename; backend will handle text extraction if needed
      setJdText(`[Uploaded file: ${file.name}]`)
    }
  }

  async function handleSubmit() {
    setLoading(true); setError(null)

    const ids = candidates.length > 0 ? candidates.map(c => c.id) : selectedIds
    if (!ids.length) {
      setError('Please add at least one candidate.')
      setLoading(false)
      return
    }

    const primaryStage = stages[0]?.id || 'ai_voice'
    if (primaryStage === 'human' && (!interviewerId || !scheduledStart)) {
      setError('Choose an interviewer and appointment time for human interviews.')
      setLoading(false)
      return
    }

    try {
      const batchKey = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
      await Promise.all(ids.map(candidateId =>
        api.createSchedule({
          idempotencyKey: `${batchKey}:${candidateId}:${primaryStage}`,
          candidateId,
          type: primaryStage,
          mode,
          interviewMode: primaryStage === 'ai_voice' ? voiceMode : primaryStage,
          transcriptionMode,
          maxAttempts,
          cooldownHours: 0,
          windowDays: 30,
          reportTiming: 'each',
          jdText: jdText || null,
          focusAreas,
          difficulty,
          questionCount,
          reportEmails: [managerEmail, ...reportEmails].filter(Boolean),
          stages: stages.map(s => s.id),
          interviewerId: primaryStage === 'human' ? parseInt(interviewerId, 10) : null,
          scheduledStart: primaryStage === 'human' ? new Date(scheduledStart).toISOString() : null,
        })
      ))
      onDone && onDone()
      handleClose()
    } catch (err) {
      setError(err.message || 'Could not schedule interview. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setStep(1); setError(null)
    setStages([{ id: 'ai_voice' }]); setMode('internal_monthly'); setVoiceMode('simple')
    setJdFile(null); setJdText(''); setFocusAreas('')
    setDifficulty('medium'); setQuestionCount(10); setMaxAttempts(1); setTranscriptionMode('api')
    setReportEmails([]); setCandidates([]); setTeamList([]); setInterviewers([]); setOrgUsers([])
    setInterviewerId(''); setScheduledStart('')
    onClose()
  }

  const field = {
    width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1',
    borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 120ms, box-shadow 120ms',
  }
  const onFocusField = e => { e.target.style.borderColor = '#5B4FE9'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }
  const onBlurField  = e => { e.target.style.borderColor = '#CBD5E1'; e.target.style.boxShadow = 'none' }
  const lbl = (text, hint) => (
    <div style={{ marginBottom: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{text}</span>
      {hint && <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 6 }}>{hint}</span>}
    </div>
  )

  const modeBtn = (id, label) => (
    <button key={id} type="button" onClick={() => setMode(id)} style={{
      flex: 1, padding: '9px 12px', borderRadius: 8,
      border: `1px solid ${mode === id ? '#5B4FE9' : '#E2E8F0'}`,
      background: mode === id ? '#EFEDFD' : '#FFF',
      color: mode === id ? '#3A31A3' : '#374151',
      fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 120ms',
    }}>{label}</button>
  )

  const pillBtn = (active, onClick, label) => (
    <button key={label} type="button" onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 99, fontFamily: 'inherit',
      border: `1px solid ${active ? '#5B4FE9' : '#E2E8F0'}`,
      background: active ? '#EFEDFD' : '#FFF',
      color: active ? '#3A31A3' : '#374151',
      fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 120ms',
    }}>{label}</button>
  )

  return (
    <Modal open={open} onClose={handleClose} title="Schedule Interview" size="md">
      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        {STEP_LABELS.map((l, i) => {
          const idx = i + 1
          const done = idx < step
          const active = idx === step
          return (
            <div key={l} style={{ display: 'flex', alignItems: 'center', flex: i < STEP_LABELS.length - 1 ? 1 : 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 9999,
                  background: done ? '#5B4FE9' : active ? '#FFF' : '#FFF',
                  border: done ? 'none' : active ? '2px solid #5B4FE9' : '1px solid #CBD5E1',
                  color: done ? '#FFF' : active ? '#5B4FE9' : '#94A3B8',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, flexShrink: 0,
                }}>
                  {done ? <Check size={11} /> : idx}
                </span>
                <span style={{ fontSize: 12, fontWeight: active ? 600 : 500, color: active ? '#5B4FE9' : done ? '#0F172A' : '#94A3B8', whiteSpace: 'nowrap' }}>
                  {l}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: idx < step ? '#5B4FE9' : '#E2E8F0', margin: '0 10px', borderRadius: 9999 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── STEP 1: Type ─────────────────────────────────────── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            {lbl('Interview mode')}
            <div style={{ display: 'flex', gap: 8 }}>
              {MODES.map(m => modeBtn(m.id, m.label))}
            </div>
          </div>

          <div>
            {lbl('Interview stages', '(up to 3 · at least 1 required)')}
            {stages.map((st, i) => {
              const t = INTERVIEW_TYPES.find(x => x.id === st.id)
              if (!t) return null
              const TIcon = t.icon
              return (
                <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: `1px solid ${t.color}33`, background: `${t.bg}88`, borderRadius: 10, marginBottom: 8 }}>
                  <span style={{ width: 5, height: 24, borderRadius: 3, background: t.color, flexShrink: 0 }} />
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: t.bg, color: t.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <TIcon size={15} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Stage {i + 1}: {t.label}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>{t.desc}</div>
                  </div>
                  {stages.length > 1 && (
                    <button type="button" onClick={() => removeStage(i)} style={{ background: 'transparent', border: 0, color: '#94A3B8', cursor: 'pointer', padding: 4 }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              )
            })}

            {stages.length < 3 && (
              <div>
                <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>Add another stage:</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {INTERVIEW_TYPES.filter(t => !stages.find(s => s.id === t.id)).map(t => {
                    const TIcon = t.icon
                    return (
                      <button key={t.id} type="button" onClick={() => addStage(t.id)} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '7px 12px', borderRadius: 8,
                        border: '1px dashed #CBD5E1', background: '#FFF',
                        color: '#374151', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'all 120ms',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#5B4FE9'; e.currentTarget.style.color = '#5B4FE9' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#374151' }}
                      >
                        <Plus size={12} /> {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Transcription mode — only for AI Voice */}
          {stages[0]?.id === 'ai_voice' && (
            <div>
              {lbl('AI Voice style')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  {
                    id: 'simple',
                    label: 'Fixed question list',
                    desc: 'Generate a set list of questions upfront from the resume, JD, and focus areas.',
                  },
                  {
                    id: 'adaptive',
                    label: 'Adaptive conversation',
                    desc: 'AI follows up or pivots to related topics based on each answer, aiming for your target count.',
                  },
                ].map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setVoiceMode(option.id)}
                    style={{
                      padding: '12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                      border: `1px solid ${voiceMode === option.id ? '#5B4FE9' : '#E2E8F0'}`,
                      background: voiceMode === option.id ? '#EFEDFD' : '#FFF',
                      color: voiceMode === option.id ? '#3A31A3' : '#374151',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{option.label}</div>
                    <div style={{ fontSize: 11, lineHeight: 1.45, marginTop: 4, color: '#6B7280' }}>
                      {option.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {stages[0]?.id === 'human' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                {lbl('Interviewer')}
                <select value={interviewerId} onChange={e => setInterviewerId(e.target.value)} style={field}>
                  <option value="">Choose interviewer</option>
                  {interviewers.map(u => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                {lbl('Appointment time')}
                <input type="datetime-local" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} style={field} />
              </div>
            </div>
          )}

          {stages.some(s => s.id === 'ai_voice') && (
            <div>
              {lbl('Transcription method')}
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { id: 'api',   label: 'Groq API',        desc: 'Faster, cloud-based' },
                ].map(o => (
                  <button key={o.id} type="button" onClick={() => setTranscriptionMode(o.id)} style={{
                    flex: 1, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                    border: `1px solid ${transcriptionMode === o.id ? '#5B4FE9' : '#E2E8F0'}`,
                    background: transcriptionMode === o.id ? '#EFEDFD' : '#FFF',
                    color: transcriptionMode === o.id ? '#3A31A3' : '#374151',
                    fontWeight: 600, fontSize: 12, textAlign: 'left', transition: 'all 120ms',
                  }}>
                    <div>{o.label}</div>
                    <div style={{ fontSize: 11, fontWeight: 400, color: transcriptionMode === o.id ? '#6B7280' : '#94A3B8', marginTop: 2 }}>{o.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Configure ────────────────────────────────── */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* JD upload */}
          <div>
            {lbl('Job description', '(optional — improves AI question quality)')}
            {jdFile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8 }}>
                <FileCheck2 size={16} color="#059669" />
                <span style={{ fontSize: 13, color: '#047857', flex: 1 }}>{jdFile.name}</span>
                <button type="button" onClick={() => { setJdFile(null); setJdText('') }} style={{ background: 'transparent', border: 0, color: '#6B7280', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <div
                  onClick={() => jdInputRef.current?.click()}
                  style={{
                    border: '2px dashed #CBD5E1', borderRadius: 10, padding: '16px', textAlign: 'center',
                    cursor: 'pointer', background: '#FFF', transition: 'all 120ms', marginBottom: 8,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#5B4FE9'; e.currentTarget.style.background = '#FAFAFE' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#FFF' }}
                >
                  <UploadCloud size={20} color="#94A3B8" style={{ margin: '0 auto 6px', display: 'block' }} />
                  <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Upload JD (PDF / DOCX / TXT)</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>or paste text below</div>
                </div>
                <input ref={jdInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={handleJdFileChange} />
                <textarea
                  rows={3}
                  value={jdText}
                  onChange={e => setJdText(e.target.value)}
                  placeholder="Paste JD text here…"
                  style={{ ...field, resize: 'vertical' }}
                  onFocus={onFocusField} onBlur={onBlurField}
                />
              </>
            )}
          </div>

          {/* Focus areas */}
          <div>
            {lbl('AI focus areas', '(optional)')}
            <textarea
              rows={2}
              value={focusAreas}
              onChange={e => setFocusAreas(e.target.value)}
              placeholder="e.g. Focus on system design, Azure, and team leadership…"
              style={{ ...field, resize: 'vertical' }}
              onFocus={onFocusField} onBlur={onBlurField}
            />
          </div>

          {/* Attempt type */}
          <div>
            {lbl('Interview attempts')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { id: 1,  label: 'One-time link',    desc: 'Link expires after the candidate completes the interview once.' },
                { id: -1, label: 'Unlimited tries',  desc: 'Candidate can retake anytime — a new report is generated each time.' },
              ].map(opt => (
                <button key={opt.id} type="button" onClick={() => setMaxAttempts(opt.id)} style={{
                  padding: '12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  border: `1px solid ${maxAttempts === opt.id ? '#5B4FE9' : '#E2E8F0'}`,
                  background: maxAttempts === opt.id ? '#EFEDFD' : '#FFF',
                  color: maxAttempts === opt.id ? '#3A31A3' : '#374151',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{opt.label}</div>
                  <div style={{ fontSize: 11, lineHeight: 1.45, marginTop: 4, color: '#6B7280' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            {lbl('Question difficulty')}
            <div style={{ display: 'flex', gap: 8 }}>
              {['easy', 'medium', 'hard'].map(d => pillBtn(difficulty === d, () => setDifficulty(d), d.charAt(0).toUpperCase() + d.slice(1)))}
            </div>
          </div>

          {/* Question count */}
          <div>
            {lbl('Number of questions', voiceMode === 'adaptive' ? '(target — AI adapts around this)' : stages[0]?.id === 'ai_voice' ? '(fixed list generated upfront)' : '')}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { v: 10, label: '10' },
                { v: 20, label: '20' },
                { v: 30, label: 'Full interview' },
              ].map(({ v, label }) => pillBtn(questionCount === v, () => setQuestionCount(v), label))}
            </div>
            {questionCount === 30 && (
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '6px 0 0' }}>
                Full interview: comprehensive assessment covering all resume, JD, and focus area topics.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 3: Recipients ───────────────────────────────── */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            {lbl('Candidates', 'interview invites will be sent to these people')}
            <CandidateChips
              label="To"
              candidates={candidates}
              onRemove={removeCandidate}
              teamList={teamList}
              onAdd={addCandidate}
            />
            {candidates.length === 0 && !member && (
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '6px 0 0' }}>Add at least one candidate to continue.</p>
            )}
            {selectedIds.length > 0 && candidates.length === 0 && (
              <p style={{ fontSize: 11, color: '#5B4FE9', margin: '6px 0 0' }}>{selectedIds.length} candidates pre-selected from team page.</p>
            )}
            {candidates.length > 0 && (
              <div style={{ marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
                <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
                  {candidates.map(c => {
                    const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email
                    return (
                      <div key={c.id} style={{ flexShrink: 0, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 10px', fontSize: 11 }}>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{name}</div>
                        {c.email && <div style={{ color: '#6B7280', marginTop: 1 }}>{c.email}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div>
            {lbl('Send report to', 'you are always included — add others from your organisation or enter email')}
            <EmailChips
              label="CC"
              emails={reportEmails}
              onRemove={removeReportEmail}
              orgUsers={orgUsers}
              onAdd={addReportEmail}
              disabledEmails={managerEmail ? [managerEmail] : []}
            />
            <p style={{ fontSize: 11, color: '#94A3B8', margin: '6px 0 0' }}>
              Press Enter or comma to add a custom email.
            </p>
          </div>
        </div>
      )}

      {/* ── STEP 4: Confirm ──────────────────────────────────── */}
      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Candidate list */}
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Sending to</div>
            {candidates.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {candidates.map(c => {
                  const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email
                  return (
                    <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px 3px 6px', background: '#EFEDFD', borderRadius: 9999, fontSize: 12, fontWeight: 500, color: '#3A31A3' }}>
                      <TinyAv name={name} /> {name}
                    </span>
                  )
                })}
              </div>
            ) : selectedIds.length > 0 ? (
              <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{selectedIds.length} selected member{selectedIds.length !== 1 ? 's' : ''} from team</p>
            ) : (
              <p style={{ fontSize: 13, color: '#EF4444', margin: 0 }}>No candidates selected</p>
            )}
          </div>

          {/* Summary grid */}
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Interview summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: '#374151' }}>
              {[
                ['Mode',          MODES.find(m => m.id === mode)?.label || mode],
                ...(stages[0]?.id === 'ai_voice'
                  ? [
                    ['Voice style', voiceMode === 'adaptive' ? 'Adaptive conversation' : 'Fixed question list'],
                    ['Questions',   questionCount === 30 ? 'Full interview' : (voiceMode === 'adaptive' ? `~${questionCount} (adaptive target)` : `${questionCount}`)],
                  ]
                  : [['Questions', questionCount === 30 ? 'Full interview' : `${questionCount}`]]),
                ['Stages',        stages.map(s => INTERVIEW_TYPES.find(t => t.id === s.id)?.label).join(' → ')],
                ['Attempts',      maxAttempts === -1 ? 'Unlimited (report per try)' : 'One-time link'],
                ['Difficulty',    difficulty.charAt(0).toUpperCase() + difficulty.slice(1)],
              ].map(([k, v]) => (
                <div key={k}>
                  <span style={{ color: '#94A3B8' }}>{k}: </span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Report recipients */}
          {(managerEmail || reportEmails.length > 0) && (
            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Report recipients</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {managerEmail && (
                  <span style={{ padding: '3px 9px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 9999, fontSize: 11, fontWeight: 500, color: '#047857' }}>{managerEmail} (you)</span>
                )}
                {reportEmails.map(e => (
                  <span key={e} style={{ padding: '3px 9px', background: '#EFEDFD', border: '1px solid #C4B5FD', borderRadius: 9999, fontSize: 11, fontWeight: 500, color: '#3A31A3' }}>{e}</span>
                ))}
              </div>
            </div>
          )}

          {error && <p style={{ color: '#EF4444', fontSize: 13, margin: 0 }}>{error}</p>}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
        <Button variant="secondary" type="button" onClick={step > 1 ? () => { setStep(s => s - 1); setError(null) } : handleClose}>
          {step > 1 ? '← Back' : 'Cancel'}
        </Button>
        {step < 4 ? (
          <Button type="button" onClick={() => {
            if (step === 3 && candidates.length === 0 && selectedIds.length === 0) {
              setError('Add at least one candidate.')
              return
            }
            setError(null)
            setStep(s => s + 1)
          }}>
            Next →
          </Button>
        ) : (
          <Button loading={loading} type="button" onClick={handleSubmit}>
            Schedule &amp; Send Invites →
          </Button>
        )}
      </div>
    </Modal>
  )
}

export default ScheduleModal
