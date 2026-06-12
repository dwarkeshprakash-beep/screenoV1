import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, CalendarPlus, Pencil, FileText, Download, ThumbsUp, ArrowRight, Check, Building2, BadgeCheck } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'
import ScheduleModal from '../../components/manager/ScheduleModal'
import EditMemberModal from '../../components/manager/EditMemberModal'
import Avatar from '../../components/shared/Avatar'

const SKILL_COLORS = {
  '.NET': { bg: 'var(--brand-50)', fg: 'var(--brand-700)' }, 'C#': { bg: 'var(--brand-50)', fg: 'var(--brand-700)' },
  'React': { bg: 'var(--info-50)', fg: 'var(--info-600)' }, 'SQL': { bg: 'var(--success-50)', fg: 'var(--success-700)' },
  'Docker': { bg: 'var(--info-50)', fg: 'var(--info-600)' }, 'TypeScript': { bg: 'var(--info-50)', fg: 'var(--info-600)' },
  'Node.js': { bg: 'var(--success-50)', fg: 'var(--success-700)' }, 'Java': { bg: 'var(--warning-100)', fg: 'var(--warning-700)' },
  'Azure': { bg: 'var(--info-50)', fg: 'var(--info-600)' }, 'AWS': { bg: 'var(--warning-100)', fg: 'var(--warning-700)' },
}

function SkillTag({ label }) {
  const c = SKILL_COLORS[label] || { bg: 'var(--slate-100)', fg: 'var(--slate-600)' }
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 9999, fontSize: 12, fontWeight: 600, background: c.bg, color: c.fg }}>{label}</span>
}

function AssessBadge({ lastAssessed }) {
  if (!lastAssessed) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 9999, background: 'var(--danger-50)', color: 'var(--danger-500)', fontSize: 12, fontWeight: 600 }}>Never assessed</span>
  const daysAgo = (Date.now() - new Date(lastAssessed).getTime()) / (1000 * 60 * 60 * 24)
  if (daysAgo > 30) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 9999, background: 'var(--warning-50)', color: 'var(--warning-500)', fontSize: 12, fontWeight: 600 }}>Overdue · {Math.round(daysAgo)} days</span>
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 9999, background: 'var(--success-50)', color: 'var(--success-500)', fontSize: 12, fontWeight: 600 }}>Up to date</span>
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'transcript', label: 'AI transcript' },
  { id: 'notes', label: 'Notes' },
]

function MemberProfilePage() {
  const { id } = useParams()
  const navigate  = useNavigate()

  const [member, setMember]         = useState(null)
  const [report, setReport]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [tab, setTab]               = useState('overview')
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [editOpen, setEditOpen]     = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const fileInputRef                = useRef(null)

  const [notes, setNotes]           = useState([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [newNote, setNewNote]       = useState('')
  const [saving, setSaving]         = useState(false)

  const [transcript, setTranscript]         = useState(null)
  const [transcriptLoading, setTranscriptLoading] = useState(false)
  const [aiInterviews, setAiInterviews]      = useState([])
  const [selectedInterviewId, setSelectedInterviewId] = useState(null)

  const [reportHistory, setReportHistory]     = useState([])
  const [selectedReportId, setSelectedReportId] = useState(null)

  useEffect(() => { load(); setTranscript(null); setAiInterviews([]); setSelectedInterviewId(null); setReportHistory([]); setSelectedReportId(null) }, [id])


  const selectedReport = reportHistory.find(r => r.id === selectedReportId) || report

  useEffect(() => {
    if (tab !== 'notes') return
    async function loadNotes() {
      setNotesLoading(true)
      try { const r = await api.getMemberNotes(id); setNotes(r.data || []) }
      catch {} finally { setNotesLoading(false) }
    }
    loadNotes()
  }, [tab, id])

  useEffect(() => {
    if (tab !== 'transcript' || aiInterviews.length > 0 || transcript !== null) return
    async function loadInterviews() {
      setTranscriptLoading(true)
      try {
        const r = await api.getMemberInterviews(id)
        const completed = (r.data || [])
          .filter(i => i.type === 'ai_voice' && i.status === 'completed')
          .sort((a, b) => new Date(b.created) - new Date(a.created))
        setAiInterviews(completed)
        if (completed.length === 0) { setTranscript([]); return }
        setSelectedInterviewId(completed[0].id)
      } catch { setTranscript([]) }
      finally { setTranscriptLoading(false) }
    }
    loadInterviews()
  }, [tab, id, aiInterviews, transcript])

  useEffect(() => {
    if (!selectedInterviewId) return
    async function loadTranscript() {
      setTranscriptLoading(true)
      try {
        const tr = await api.getInterviewTranscript(selectedInterviewId)
        setTranscript(tr?.data || [])
      } catch { setTranscript([]) }
      finally { setTranscriptLoading(false) }
    }
    loadTranscript()
  }, [selectedInterviewId])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const memberRes = await api.getMember(id)
      const loadedMember = memberRes.data
      const userId = loadedMember?.user_id
      const [reportRes, historyRes] = userId
        ? await Promise.all([
          api.getCandidateReport(userId),
          api.getCandidateReportHistory(userId),
        ])
        : [{ data: null }, { data: [] }]

      setMember(loadedMember)
      setReport(reportRes.data)
      const history = historyRes.data || []
      setReportHistory(history)
      if (history.length > 0) setSelectedReportId(history[0].id)
    } catch {
      setError('Could not load profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResumeUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try { await api.uploadResume(member.id, file); await load() }
    catch (err) { setUploadError('Upload failed: ' + err.message) }
    finally { setUploading(false); e.target.value = '' }
  }

  const strengthsList = (() => { try { return JSON.parse(report?.strengths || '[]') } catch { return [] } })()

  if (loading) return <Spinner center />
  if (error)   return <ErrorMessage message={error} />
  if (!member) return <EmptyState message="Member not found." />

  const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim()
  const tags     = (() => { try { return typeof member.tags === 'string' ? JSON.parse(member.tags) : (member.tags || []) } catch { return [] } })()
  const assessmentCount = reportHistory.length
  const bestScore = reportHistory.reduce((max, r) => {
    const s = Number(r.overall_score)
    return (!isNaN(s) && s > 0 && s > max) ? s : max
  }, 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
      {/* Left */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Back */}
        <button onClick={() => navigate('/manager/team')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 0, color: 'var(--brand-500)', fontWeight: 500, fontSize: 13, cursor: 'pointer', alignSelf: 'flex-start' }}>
          <ArrowLeft size={16} /> Back to team
        </button>

        {/* Hero card */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <Avatar name={fullName} size={64} ring="var(--brand-100)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <h1 style={{ fontFamily: "var(--font-display,'Inter')", fontSize: 22, fontWeight: 700, color: 'var(--slate-900)', margin: 0, letterSpacing: '-0.02em' }}>{fullName}</h1>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 9999, background: 'var(--success-50)', color: 'var(--success-600)' }}>Team Member</span>
                {member.availability && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 9999,
                    background: member.availability === 'bench' ? 'var(--brand-50)' : 'var(--success-50)',
                    color: member.availability === 'bench' ? 'var(--brand-700)' : 'var(--success-600)',
                  }}>
                    {member.availability === 'client_side' ? 'Client side' : 'Bench'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'var(--slate-400)', flexWrap: 'wrap', marginBottom: 6 }}>
                {member.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Mail size={12} />{member.email}</span>}
                {member.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Phone size={12} />{member.phone}</span>}
                {member.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><MapPin size={12} />{member.location}</span>}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--fg-muted)', flexWrap: 'wrap', marginBottom: tags.length > 0 ? 8 : 0 }}>
                {member.employee_id && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><BadgeCheck size={12} color="var(--brand-500)" />ID: {member.employee_id}</span>}
                {member.department && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Building2 size={12} color="var(--brand-500)" />{member.department}</span>}
                {member.current_position && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Briefcase size={12} color="var(--brand-500)" />{member.current_position}</span>}
              </div>
              {tags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {tags.map((t, i) => <SkillTag key={i} label={t} />)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setEditOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'var(--bg-surface)', border: '1px solid var(--slate-300)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--slate-900)', cursor: 'pointer' }}>
                <Pencil size={12} /> Edit
              </button>
              <button onClick={() => setScheduleOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'var(--brand-500)', border: 0, borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--bg-surface)', cursor: 'pointer' }}>
                <CalendarPlus size={12} /> Schedule
              </button>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--slate-200)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background: 'transparent', border: 0, padding: '10px 14px', fontSize: 13, fontWeight: tab === t.id ? 600 : 500, color: tab === t.id ? 'var(--brand-700)' : 'var(--slate-500)', borderBottom: tab === t.id ? '2px solid var(--brand-500)' : '2px solid transparent', marginBottom: -1, cursor: 'pointer', fontFamily: 'inherit', transition: 'color 120ms' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand-500)', marginBottom: 14 }}>Performance summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                  { label: 'Last score',   value: report?.overall_score ? `${Number(report.overall_score).toFixed(1)}/10` : '—' },
                  { label: 'Assessments',  value: assessmentCount || '0' },
                  { label: 'Best score',   value: bestScore > 0 ? `${bestScore.toFixed(1)}/10` : '—' },
                  { label: 'Days since',   value: member.last_assessed ? `${Math.round((Date.now() - new Date(member.last_assessed).getTime()) / 86400000)}d` : '—' },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--slate-50)', borderRadius: 8 }}>
                    <div style={{ fontFamily: "var(--font-display,'Inter')", fontSize: 22, fontWeight: 700, color: 'var(--slate-900)', letterSpacing: '-0.015em' }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {strengthsList.length > 0 && (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <ThumbsUp size={15} color="var(--success-600)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)' }}>Strengths</span>
                </div>
                {strengthsList.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--slate-700)', lineHeight: 1.5, padding: '7px 0', borderTop: i ? '1px solid var(--slate-100)' : '0' }}>
                    <Check size={14} color="var(--success-500)" style={{ flexShrink: 0, marginTop: 2 }} />{s}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analysis tab */}
        {tab === 'analysis' && (
          selectedReport ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {reportHistory.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)' }}>Interview session:</span>
                  <select
                    value={selectedReportId || ''}
                    onChange={e => setSelectedReportId(parseInt(e.target.value, 10))}
                    style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--slate-300)', color: 'var(--slate-900)', background: 'var(--bg-surface)' }}
                  >
                    {reportHistory.map(r => (
                      <option key={r.id} value={r.id}>{formatDate(r.created)}{r.interview_type ? ` · ${r.interview_type}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
                {(() => {
                  const hasScores = [selectedReport.confidence, selectedReport.tech_knowledge, selectedReport.communication, selectedReport.overall_score].some(v => v != null)
                  return hasScores ? (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand-500)', marginBottom: 14 }}>Competency breakdown</div>
                      {[
                        { k: 'confidence',     label: 'Confidence',          v: selectedReport.confidence },
                        { k: 'tech_knowledge', label: 'Technical knowledge',  v: selectedReport.tech_knowledge },
                        { k: 'communication',  label: 'Communication',        v: selectedReport.communication },
                        { k: 'overall_score',  label: 'Overall',              v: selectedReport.overall_score },
                      ].map((s, i) => s.v != null && (
                        <div key={i} style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 13, color: 'var(--slate-700)', fontWeight: 500 }}>{s.label}</span>
                            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: s.v >= 7 ? 'var(--success-600)' : s.v >= 5 ? 'var(--warning-600)' : 'var(--danger-700)' }}>{s.v}/10</span>
                          </div>
                          <div style={{ height: 6, background: 'var(--slate-100)', borderRadius: 9999, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(s.v / 10) * 100}%`, background: 'var(--brand-500)', borderRadius: 9999, transition: 'width 600ms cubic-bezier(0.2,0,0,1)' }} />
                          </div>
                        </div>
                      ))}
                    </>
                  ) : null
                })()}
                {selectedReport.summary && (
                  <div style={{ marginTop: 16, padding: 14, background: 'var(--slate-50)', borderRadius: 8 }}>
                    <p style={{ fontSize: 13, color: 'var(--slate-700)', lineHeight: 1.6, margin: 0 }}>{selectedReport.summary}</p>
                  </div>
                )}
                {selectedReport.pdf_url && (
                  <a href={selectedReport.pdf_url} download target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, padding: '8px 14px', background: 'var(--brand-500)', color: 'var(--bg-surface)', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    <Download size={13} /> Download Report PDF
                  </a>
                )}
              </div>
            </div>
          ) : <EmptyState message="No report available yet. Schedule an assessment to generate one." />
        )}

        {/* Transcript tab */}
        {tab === 'transcript' && (
          aiInterviews.length === 0 && transcriptLoading ? <div style={{ padding: 20 }}><Spinner center /></div> :
          aiInterviews.length === 0 ? (
            <EmptyState message="No transcript available. An AI interview must be completed first." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {aiInterviews.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)' }}>Interview session:</span>
                  <select
                    value={selectedInterviewId || ''}
                    onChange={e => { setSelectedInterviewId(parseInt(e.target.value, 10)); setTranscript(null) }}
                    style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--slate-300)', color: 'var(--slate-900)', background: 'var(--bg-surface)' }}
                  >
                    {aiInterviews.map(i => (
                      <option key={i.id} value={i.id}>{formatDate(i.created)}</option>
                    ))}
                  </select>
                </div>
              )}
              {transcriptLoading ? <div style={{ padding: 20 }}><Spinner center /></div> :
              !transcript || transcript.length === 0 ? (
                <EmptyState message="No transcript available for this session." />
              ) : (
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand-500)', marginBottom: 16 }}>AI voice screen transcript</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {transcript.map((qa, i) => (
                      <div key={i} style={{ paddingBottom: 16, borderBottom: i < transcript.length - 1 ? '1px solid var(--slate-100)' : '0' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-500)', marginBottom: 8 }}>Q{i + 1}: {qa.question}</div>
                        <div style={{ fontSize: 14, color: 'var(--slate-700)', lineHeight: 1.6 }}>{qa.answer_text || <span style={{ color: 'var(--slate-400)', fontStyle: 'italic' }}>No answer recorded.</span>}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* Notes tab */}
        {tab === 'notes' && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
            {notesLoading ? <Spinner center /> : notes.length === 0 ? null : (
              <div style={{ marginBottom: 16 }}>
                {notes.map(n => (
                  <div key={n.id} style={{ padding: '12px 0 12px 16px', borderLeft: '3px solid var(--brand-500)', background: 'var(--brand-50)', borderRadius: '0 8px 8px 0', marginBottom: 10 }}>
                    <div style={{ fontSize: 13, color: 'var(--slate-700)', lineHeight: 1.6 }}>{n.note}</div>
                    <span style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 4, display: 'block' }}>{formatDate(n.created)}</span>
                  </div>
                ))}
              </div>
            )}
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add a note for the hiring team..."
              rows={3}
              style={{ width: '100%', padding: 12, border: '1px solid var(--slate-300)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = 'var(--brand-500)'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--slate-300)'; e.target.style.boxShadow = 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                disabled={saving || !newNote.trim()}
                onClick={async () => {
                  setSaving(true)
                  try { await api.addMemberNote(id, newNote); setNewNote(''); const r = await api.getMemberNotes(id); setNotes(r.data || []) }
                  catch {} finally { setSaving(false) }
                }}
                style={{ padding: '8px 16px', background: !newNote.trim() || saving ? 'var(--slate-200)' : 'var(--brand-500)', color: !newNote.trim() || saving ? 'var(--slate-400)' : 'var(--bg-surface)', border: 0, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: !newNote.trim() || saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Saving...' : 'Post note'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right rail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 80 }}>
        {/* Resume card */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-900)' }}>Resume</div>
            {member.resume_url && (
              <a href={member.resume_url} download target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 6, background: 'var(--bg-surface)', border: '1px solid var(--slate-300)', borderRadius: 8, color: 'var(--slate-900)', cursor: 'pointer' }}>
                <Download size={12} />
              </a>
            )}
          </div>
          {member.resume_url ? (
            <>
              <div style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 8, padding: 12 }}>
                {[65,45,100,92,78,100,85,60,100,72,55].map((w, i) => (
                  <div key={i} style={{ height: i % 4 === 0 ? 7 : 5, background: i % 4 === 0 ? 'var(--slate-400)' : 'var(--slate-300)', borderRadius: 9999, width: `${w}%`, marginBottom: 5 }} />
                ))}
              </div>
              <a href={member.resume_url} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 12, color: 'var(--brand-500)', fontWeight: 500, cursor: 'pointer', textDecoration: 'none' }}>Open full screen</a>
            </>
          ) : (
            <div style={{ border: '1px dashed var(--slate-300)', borderRadius: 8, padding: '14px 12px', textAlign: 'center', fontSize: 13, color: 'var(--slate-400)', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
              <FileText size={15} style={{ marginBottom: 4 }} /> Upload resume (PDF)
            </div>
          )}
          <input type="file" accept=".pdf" style={{ display: 'none' }} ref={fileInputRef} onChange={handleResumeUpload} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ width: '100%', marginTop: 10, padding: '7px 0', background: 'var(--bg-surface)', border: '1px solid var(--slate-300)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', cursor: 'pointer' }}>
            {uploading ? 'Uploading...' : member.resume_url ? 'Replace resume' : 'Upload resume'}
          </button>
          {uploadError && <div style={{ color: 'var(--danger-700)', fontSize: 12, marginTop: 8, textAlign: 'center' }}>{uploadError}</div>}
        </div>

        {/* Assessment status */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand-500)', marginBottom: 10 }}>Assessment status</div>
          <AssessBadge lastAssessed={member.last_assessed} />
          <button onClick={() => setScheduleOpen(true)} style={{ width: '100%', marginTop: 12, padding: '8px 0', background: 'var(--brand-500)', color: 'var(--bg-surface)', border: 0, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <CalendarPlus size={12} /> Schedule assessment
          </button>
        </div>
      </div>

      <ScheduleModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} member={member} onDone={load} />
      <EditMemberModal open={editOpen} member={member} onClose={() => setEditOpen(false)} onDone={load} />
    </div>
  )
}

export default MemberProfilePage

