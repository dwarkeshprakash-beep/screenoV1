// ScheduleModal — 4-step wizard to schedule interviews.
// Step 1: Interview mode + stage types (AI voice, AI exam, human interview)
// Step 2: Configure (attempts, cooldown, JD upload, focus, difficulty)
// Step 3: Candidates (chips like email To field) + report recipients
// Step 4: Review + send

import { useState, useEffect, useRef } from 'react'
import { X, Plus, Mic, Code2, Video, UploadCloud, FileCheck2, ChevronDown, Check } from 'lucide-react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import Avatar from '../shared/Avatar'
import * as api from '../../services/api'

// ── helpers ────────────────────────────────────────────────────
const STEP_LABELS = ['Type', 'Configure', 'Recipients', 'Confirm']

const INTERVIEW_TYPES = [
  { id: 'ai_voice',  label: 'AI Voice Interview', icon: Mic,    desc: 'AI conducts a spoken interview, auto-generates transcript and scorecard.', color: 'var(--brand-500)', bg: 'var(--brand-50)' },
  { id: 'exam',      label: 'AI Coding Exam',     icon: Code2,  desc: 'MCQ, coding challenges, and scenario-based questions with a timer.',       color: 'var(--info-500)', bg: 'var(--info-50)' },
  { id: 'human',     label: 'Human Interview',    icon: Video,  desc: 'Schedule a live session via Screeno Room — invite an interviewer.',         color: 'var(--success-500)', bg: 'var(--success-50)' },
]

const MODES = [
  { id: 'client_mock',       label: 'Client mock interview' },
  { id: 'internal_monthly',  label: 'Internal monthly assessment' },
]

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
          padding: '7px 10px', border: `1px solid ${open ? 'var(--brand-500)' : 'var(--slate-300)'}`,
          borderRadius: 8, cursor: 'text', minHeight: 42,
          boxShadow: open ? '0 0 0 3px rgba(91,79,233,0.18)' : 'none',
          transition: 'all 120ms',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', marginRight: 2 }}>{label}:</span>
        {candidates.map(c => {
          const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email
          return (
            <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px 3px 5px', background: 'var(--brand-50)', borderRadius: 8, fontSize: 12, fontWeight: 500, color: 'var(--brand-700)' }}>
              <Avatar name={name} size={22} />
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span style={{ fontWeight: 600 }}>{name}</span>
                {c.email && name !== c.email && <span style={{ fontSize: 10, color: 'var(--slate-500)', fontWeight: 400 }}>{c.email}</span>}
              </span>
              <button type="button" onClick={e => { e.stopPropagation(); onRemove(c.id) }} style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', color: 'var(--slate-500)', display: 'inline-flex', lineHeight: 1, marginLeft: 2 }}>
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
          <span style={{ fontSize: 13, color: 'var(--slate-400)' }}>Search candidates…</span>
        )}
      </div>

      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 8, boxShadow: '0 8px 24px rgba(15,23,42,0.12)', maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--slate-400)', textAlign: 'center' }}>
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
                    borderTop: i === 0 ? 'none' : '1px solid var(--slate-100)',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--slate-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                >
                  <Avatar name={name} size={22} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--slate-900)' }}>{name}</div>
                    <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>{u.email}</div>
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
          padding: '7px 10px', border: `1px solid ${open ? 'var(--brand-500)' : 'var(--slate-300)'}`,
          borderRadius: 8, cursor: 'text', minHeight: 42,
          boxShadow: open ? '0 0 0 3px rgba(91,79,233,0.18)' : 'none',
          transition: 'all 120ms',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', marginRight: 2 }}>{label}:</span>
        {disabledEmails.map(e => (
          <span key={e} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--success-50)', border: '1px solid var(--success-200)', borderRadius: 9999, fontSize: 12, fontWeight: 500, color: 'var(--success-600)' }}>
            {e} <span style={{ fontSize: 10, color: 'var(--success-500)' }}>(you)</span>
          </span>
        ))}
        {emails.map(e => (
          <span key={e} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', background: 'var(--brand-50)', border: '1px solid var(--brand-200)', borderRadius: 9999, fontSize: 12, fontWeight: 500, color: 'var(--brand-700)' }}>
            {e}
            <button type="button" onClick={ev => { ev.stopPropagation(); onRemove(e) }} style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', color: 'var(--slate-500)', display: 'inline-flex', lineHeight: 1 }}>
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
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 8, boxShadow: '0 8px 24px rgba(15,23,42,0.12)', maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
          {val && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()) && (
            <div onClick={() => addEmail(val)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid var(--slate-100)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--slate-50)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}>
              <Plus size={13} color="var(--brand-500)" />
              <span style={{ fontSize: 13, color: 'var(--brand-500)' }}>Add "{val.trim()}"</span>
            </div>
          )}
          {filtered.slice(0, 6).map((u, i) => (
            <div key={u.id} onClick={() => { onAdd(u.email); setVal('') }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderTop: i === 0 ? 'none' : '1px solid var(--slate-100)', transition: 'background 100ms' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--slate-50)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}>
              <Avatar name={`${u.first_name} ${u.last_name}`} size={22} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--slate-900)' }}>{u.first_name} {u.last_name}</div>
                <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>{u.email}</div>
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
    async function loadData() {
      try {
        const [teamRes, interviewersRes, orgUsersRes] = await Promise.all([
          api.getTeam(),
          api.getInterviewers(),
          api.getOrgUsers(),
        ])
        setTeamList(teamRes.data || [])
        setInterviewers(interviewersRes.data || [])
        setOrgUsers(orgUsersRes.data || [])
      } catch {
        setTeamList([])
        setInterviewers([])
        setOrgUsers([])
      }
    }
    loadData()
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

    const targets = candidates.length > 0 ? candidates.map(c => ({ id: c.id, external: c.external })) : selectedIds.map(id => ({ id, external: false }))
    if (!targets.length) {
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
      await Promise.all(targets.map(t => {
        const payload = {
          idempotencyKey: `${batchKey}:${t.id}:${primaryStage}`,
          type: primaryStage,
          mode,
          stages: stages.map(s => s.id),
          interviewMode: voiceMode,
          questionCount,
          difficulty,
          maxAttempts,
          focusAreas,
          jdText,
          transcriptionMode,
          reportEmails: reportEmails.join(','),
          interviewerId: primaryStage === 'human' ? interviewerId : undefined,
          scheduledStart: primaryStage === 'human' ? scheduledStart : undefined,
        }
        if (t.external) {
          payload.candidateId = t.id
        } else {
          payload.teamMemberId = t.id
        }
        return api.createSchedule(payload)
      }))
      if (onDone) onDone()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to schedule interviews.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (loading) return
    onClose()
  }

  // Common styles
  const fieldStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--slate-300)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', transition: 'border-color 120ms' }
  const onFocusField = e => { e.target.style.borderColor = 'var(--brand-500)'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }
  const onBlurField  = e => { e.target.style.borderColor = 'var(--slate-300)'; e.target.style.boxShadow = 'none' }

  const modeBtn = (active) => ({ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1px solid ${active ? 'var(--brand-500)' : 'var(--slate-200)'}`, background: active ? 'var(--brand-50)' : 'var(--bg-surface)', color: active ? 'var(--brand-700)' : 'var(--slate-700)', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 120ms' })
  const pillBtn = (active) => ({ padding: '6px 14px', borderRadius: 9999, border: `1px solid ${active ? 'var(--brand-500)' : 'var(--slate-200)'}`, background: active ? 'var(--brand-500)' : 'var(--bg-surface)', color: active ? 'var(--bg-surface)' : 'var(--slate-700)', fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 120ms' })

  return (
    <Modal open={open} onClose={handleClose} title="Schedule Assessment" width={680}>
      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--slate-100)' }}>
        {STEP_LABELS.map((lbl, i) => {
          const num = i + 1
          const active = step === num
          const done = step > num
          return (
            <div key={num} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 9999, background: active ? 'var(--brand-500)' : done ? 'var(--brand-50)' : 'var(--slate-100)', color: active ? 'var(--bg-surface)' : done ? 'var(--brand-600)' : 'var(--slate-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                  {done ? <Check size={12} /> : num}
                </div>
                <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: active || done ? 'var(--slate-900)' : 'var(--slate-400)' }}>{lbl}</span>
              </div>
              {i < 3 && <div style={{ flex: 1, height: 2, background: done ? 'var(--brand-100)' : 'var(--slate-100)', margin: '0 12px' }} />}
            </div>
          )
        })}
      </div>

      {/* Step 1: Type & Stages */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate-900)', marginBottom: 12 }}>Interview Mode</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {MODES.map(m => (
                <button key={m.id} onClick={() => setMode(m.id)} style={modeBtn(mode === m.id)}>{m.label}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate-900)' }}>Stages</div>
              {stages.length < 3 && (
                <div style={{ position: 'relative' }}>
                  <select
                    value=""
                    onChange={e => addStage(e.target.value)}
                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                  >
                    <option value="" disabled>Add stage...</option>
                    {INTERVIEW_TYPES.map(t => <option key={t.id} value={t.id} disabled={stages.find(s => s.id === t.id)}>{t.label}</option>)}
                  </select>
                  <Button variant="secondary" type="button" size="small"><Plus size={12} style={{ marginRight: 4 }} /> Add Stage</Button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stages.map((stg, i) => {
                const conf = INTERVIEW_TYPES.find(t => t.id === stg.id)
                return (
                  <div key={stg.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, border: '1px solid var(--slate-200)', borderRadius: 10, background: 'var(--bg-surface)' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 9999, background: 'var(--slate-100)', color: 'var(--slate-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: conf.bg, color: conf.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <conf.icon size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate-900)' }}>{conf.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>{conf.desc}</div>
                    </div>
                    {stages.length > 1 && (
                      <button onClick={() => removeStage(i)} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--slate-400)' }}><X size={16} /></button>
                    )}
                  </div>
                )
              })}
            </div>
            <p style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 10, lineHeight: 1.5 }}>
              Candidates must pass each stage to advance. The primary report is based on Stage 1.
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {stages[0]?.id === 'human' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 6 }}>Interviewer</label>
                <div style={{ position: 'relative' }}>
                  <select value={interviewerId} onChange={e => setInterviewerId(e.target.value)} style={{ ...fieldStyle, appearance: 'none' }} onFocus={onFocusField} onBlur={onBlurField}>
                    <option value="">Select interviewer...</option>
                    {interviewers.map(u => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</option>
                    ))}
                  </select>
                  <ChevronDown size={14} color="var(--slate-400)" style={{ position: 'absolute', right: 12, top: 12, pointerEvents: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 6 }}>Scheduled Time</label>
                <input type="datetime-local" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} style={fieldStyle} onFocus={onFocusField} onBlur={onBlurField} />
              </div>
            </div>
          ) : (
            <>
              {stages[0]?.id === 'ai_voice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 18px', background: 'var(--brand-50)', borderRadius: 10, border: '1px solid var(--brand-100)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--brand-700)', marginBottom: 6 }}>AI Conversation Style</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setVoiceMode('adaptive')} style={{ ...modeBtn(voiceMode === 'adaptive'), borderColor: voiceMode === 'adaptive' ? 'var(--brand-500)' : 'var(--brand-200)', background: voiceMode === 'adaptive' ? 'var(--brand-500)' : 'var(--bg-surface)', color: voiceMode === 'adaptive' ? 'var(--bg-surface)' : 'var(--brand-700)' }}>Adaptive (Dynamic follow-ups)</button>
                      <button onClick={() => setVoiceMode('simple')}   style={{ ...modeBtn(voiceMode === 'simple'), borderColor: voiceMode === 'simple' ? 'var(--brand-500)' : 'var(--brand-200)', background: voiceMode === 'simple' ? 'var(--brand-500)' : 'var(--bg-surface)', color: voiceMode === 'simple' ? 'var(--bg-surface)' : 'var(--brand-700)' }}>Fixed Question List</button>
                    </div>
                  </div>
                  {voiceMode === 'adaptive' && (
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--brand-700)', marginBottom: 6 }}>Transcription Engine</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setTranscriptionMode('api')}   style={{ ...modeBtn(transcriptionMode === 'api'), borderColor: transcriptionMode === 'api' ? 'var(--brand-500)' : 'var(--brand-200)', background: transcriptionMode === 'api' ? 'var(--brand-500)' : 'var(--bg-surface)', color: transcriptionMode === 'api' ? 'var(--bg-surface)' : 'var(--brand-700)' }}>Cloud API (High accuracy)</button>
                        <button onClick={() => setTranscriptionMode('local')} style={{ ...modeBtn(transcriptionMode === 'local'), borderColor: transcriptionMode === 'local' ? 'var(--brand-500)' : 'var(--brand-200)', background: transcriptionMode === 'local' ? 'var(--brand-500)' : 'var(--bg-surface)', color: transcriptionMode === 'local' ? 'var(--bg-surface)' : 'var(--brand-700)' }}>In-Browser (Faster, free)</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 8 }}>Length &amp; Depth</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[10, 20, 30].map(n => (
                      <button key={n} onClick={() => setQuestionCount(n)} style={pillBtn(questionCount === n)}>
                        {n === 30 ? 'Full (30 q)' : `${n} questions`}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 8 }}>Difficulty</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['easy', 'medium', 'hard'].map(d => (
                      <button key={d} onClick={() => setDifficulty(d)} style={pillBtn(difficulty === d)}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-700)' }}>Focus Areas / JD snippet</label>
                  <button type="button" onClick={() => jdInputRef.current?.click()} style={{ background: 'transparent', border: 0, color: 'var(--brand-500)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <UploadCloud size={14} /> Upload JD file
                  </button>
                  <input type="file" ref={jdInputRef} onChange={handleJdFileChange} accept=".txt,.pdf,.docx" style={{ display: 'none' }} />
                </div>
                {jdFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--success-50)', border: '1px solid var(--success-200)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success-700)', fontSize: 13, fontWeight: 500 }}>
                      <FileCheck2 size={16} /> {jdFile.name}
                    </div>
                    <button type="button" onClick={() => { setJdFile(null); setJdText('') }} style={{ background: 'transparent', border: 0, color: 'var(--success-700)', cursor: 'pointer' }}><X size={14} /></button>
                  </div>
                ) : (
                  <textarea
                    rows={3}
                    placeholder="E.g. System design, React hooks, Kubernetes... (or upload a JD)"
                    value={focusAreas}
                    onChange={e => setFocusAreas(e.target.value)}
                    style={{ ...fieldStyle, resize: 'vertical' }}
                    onFocus={onFocusField} onBlur={onBlurField}
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 8 }}>Attempts allowed</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setMaxAttempts(1)} style={pillBtn(maxAttempts === 1)}>One-time link</button>
                  <button onClick={() => setMaxAttempts(-1)} style={pillBtn(maxAttempts === -1)}>Unlimited (Practice)</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: Recipients */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 6 }}>
              Candidates <span style={{ color: 'var(--danger-500)' }}>*</span>
            </label>
            <CandidateChips
              candidates={candidates}
              teamList={teamList}
              onAdd={addCandidate}
              onRemove={removeCandidate}
              label="To"
            />
            <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 6 }}>
              Select team members to assess. Each will receive a unique link.
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--slate-100)' }} />

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 6 }}>
              Report Delivery (CC)
            </label>
            <EmailChips
              emails={reportEmails}
              orgUsers={orgUsers}
              onAdd={addReportEmail}
              onRemove={removeReportEmail}
              label="CC"
              disabledEmails={managerEmail ? [managerEmail] : []}
            />
            <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 6 }}>
              These emails will receive the AI scorecard when the candidate finishes.
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: 9999, background: 'var(--brand-50)', color: 'var(--brand-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Mic size={24} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 600, color: 'var(--slate-900)' }}>Ready to schedule</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-500)' }}>Unique invites will be emailed immediately.</p>
          </div>

          {/* Candidate list mini */}
          <div style={{ background: 'var(--slate-50)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 8 }}>Sending to {candidates.length} candidates:</div>
            {candidates.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {candidates.map(c => {
                  const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email
                  return (
                    <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 8, fontSize: 12, fontWeight: 500, color: 'var(--slate-700)' }}>
                      <Avatar name={name} size={16} /> {name}
                    </span>
                  )
                })}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--danger-500)', margin: 0 }}>No candidates selected</p>
            )}
          </div>

          {/* Summary grid */}
          <div style={{ background: 'var(--slate-50)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 10 }}>Interview summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: 'var(--slate-700)' }}>
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
                  <span style={{ color: 'var(--slate-400)' }}>{k}: </span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Report recipients */}
          {(managerEmail || reportEmails.length > 0) && (
            <div style={{ background: 'var(--slate-50)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 8 }}>Report recipients</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {managerEmail && (
                  <span style={{ padding: '3px 9px', background: 'var(--success-50)', border: '1px solid var(--success-200)', borderRadius: 9999, fontSize: 11, fontWeight: 500, color: 'var(--success-600)' }}>{managerEmail} (you)</span>
                )}
                {reportEmails.map(e => (
                  <span key={e} style={{ padding: '3px 9px', background: 'var(--brand-50)', border: '1px solid var(--brand-200)', borderRadius: 9999, fontSize: 11, fontWeight: 500, color: 'var(--brand-700)' }}>{e}</span>
                ))}
              </div>
            </div>
          )}

          {error && <p style={{ color: 'var(--danger-500)', fontSize: 13, margin: 0 }}>{error}</p>}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--slate-100)' }}>
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
