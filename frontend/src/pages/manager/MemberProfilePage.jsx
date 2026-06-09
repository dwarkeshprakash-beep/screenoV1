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

const AV_COLORS = [
  { bg: '#EDE9FE', fg: '#5B21B6' }, { bg: '#FED7AA', fg: '#9A3412' },
  { bg: '#A7F3D0', fg: '#065F46' }, { bg: '#BFDBFE', fg: '#1E40AF' },
  { bg: '#FBCFE8', fg: '#9D174D' }, { bg: '#FDE68A', fg: '#854D0E' },
  { bg: '#C7D2FE', fg: '#3730A3' }, { bg: '#FCA5A5', fg: '#7F1D1D' },
]
const SKILL_COLORS = {
  '.NET': { bg: '#EDE9FE', fg: '#5B21B6' }, 'C#': { bg: '#EDE9FE', fg: '#5B21B6' },
  'React': { bg: '#CFFAFE', fg: '#155E75' }, 'SQL': { bg: '#DCFCE7', fg: '#166534' },
  'Docker': { bg: '#DBEAFE', fg: '#1E40AF' }, 'TypeScript': { bg: '#EFF6FF', fg: '#1D4ED8' },
  'Node.js': { bg: '#DCFCE7', fg: '#166534' }, 'Java': { bg: '#FEF3C7', fg: '#92400E' },
  'Azure': { bg: '#DBEAFE', fg: '#1E40AF' }, 'AWS': { bg: '#FEF3C7', fg: '#92400E' },
}

function avHash(s) { let h = 0; for (let i = 0; i < (s||'').length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h) }

function Avatar({ name = '?', size = 64, ring }) {
  const c = AV_COLORS[avHash(name) % AV_COLORS.length]
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: 9999, flexShrink: 0, background: c.bg, color: c.fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: Math.round(size * 0.38), letterSpacing: '-0.01em', boxShadow: ring ? `0 0 0 2px #FFF, 0 0 0 4px ${ring}` : undefined }}>
      {initials}
    </div>
  )
}

function SkillTag({ label }) {
  const c = SKILL_COLORS[label] || { bg: '#F1F5F9', fg: '#475569' }
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 9999, fontSize: 12, fontWeight: 600, background: c.bg, color: c.fg }}>{label}</span>
}

function AssessBadge({ lastAssessed }) {
  if (!lastAssessed) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 9999, background: '#FEF2F2', color: '#EF4444', fontSize: 12, fontWeight: 600 }}>Never assessed</span>
  const daysAgo = (Date.now() - new Date(lastAssessed).getTime()) / (1000 * 60 * 60 * 24)
  if (daysAgo > 30) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 9999, background: '#FFFBEB', color: '#D97706', fontSize: 12, fontWeight: 600 }}>Overdue · {Math.round(daysAgo)} days</span>
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 9999, background: '#ECFDF5', color: '#059669', fontSize: 12, fontWeight: 600 }}>Up to date</span>
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
      const candidateId = loadedMember?.candidate_id
      const [reportRes, historyRes] = candidateId
        ? await Promise.all([
          api.getCandidateReport(candidateId),
          api.getCandidateReportHistory(candidateId),
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
    try { await api.uploadResume(member.id, file); await load() }
    catch (err) { alert('Upload failed: ' + err.message) }
    finally { setUploading(false); e.target.value = '' }
  }

  const strengthsList = (() => { try { return JSON.parse(report?.strengths || '[]') } catch { return [] } })()
  const tipsList      = (() => { try { return JSON.parse(report?.tips || '[]') } catch { return [] } })()

  if (loading) return <Spinner center />
  if (error)   return <ErrorMessage message={error} />
  if (!member) return <EmptyState message="Member not found." />

  const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim()
  const skills   = member.skills || []
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
        <button onClick={() => navigate('/manager/team')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 0, color: '#5B4FE9', fontWeight: 500, fontSize: 13, cursor: 'pointer', alignSelf: 'flex-start' }}>
          <ArrowLeft size={16} /> Back to team
        </button>

        {/* Hero card */}
        <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <Avatar name={fullName} size={64} ring="#DEDAFB" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <h1 style={{ fontFamily: "var(--font-display,'Inter')", fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>{fullName}</h1>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 9999, background: '#ECFDF5', color: '#047857' }}>Team Member</span>
              </div>
              <div style={{ display: 'flex', gap: 18, fontSize: 12, color: '#94A3B8', flexWrap: 'wrap', marginBottom: 6 }}>
                {member.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Mail size={12} />{member.email}</span>}
                {member.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Phone size={12} />{member.phone}</span>}
                {member.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><MapPin size={12} />{member.location}</span>}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748B', flexWrap: 'wrap' }}>
                {member.employee_id && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><BadgeCheck size={12} color="#5B4FE9" />ID: {member.employee_id}</span>}
                {member.department && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Building2 size={12} color="#5B4FE9" />{member.department}</span>}
                {member.current_position && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Briefcase size={12} color="#5B4FE9" />{member.current_position}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setEditOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#FFF', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
                <Pencil size={12} /> Edit
              </button>
              <button onClick={() => setScheduleOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#5B4FE9', border: 0, borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#FFF', cursor: 'pointer' }}>
                <CalendarPlus size={12} /> Schedule
              </button>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E2E8F0' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background: 'transparent', border: 0, padding: '10px 14px', fontSize: 13, fontWeight: tab === t.id ? 600 : 500, color: tab === t.id ? '#3A31A3' : '#6B7280', borderBottom: tab === t.id ? '2px solid #5B4FE9' : '2px solid transparent', marginBottom: -1, cursor: 'pointer', fontFamily: 'inherit', transition: 'color 120ms' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5B4FE9', marginBottom: 14 }}>Performance summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                  { label: 'Last score',   value: report?.overall_score ? `${Number(report.overall_score).toFixed(1)}/10` : '—' },
                  { label: 'Assessments',  value: assessmentCount || '0' },
                  { label: 'Best score',   value: bestScore > 0 ? `${bestScore.toFixed(1)}/10` : '—' },
                  { label: 'Days since',   value: member.last_assessed ? `${Math.round((Date.now() - new Date(member.last_assessed).getTime()) / 86400000)}d` : '—' },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '12px 8px', background: '#F8FAFC', borderRadius: 8 }}>
                    <div style={{ fontFamily: "var(--font-display,'Inter')", fontSize: 22, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.015em' }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {strengthsList.length > 0 && (
              <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <ThumbsUp size={15} color="#047857" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Strengths</span>
                </div>
                {strengthsList.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#374151', lineHeight: 1.5, padding: '7px 0', borderTop: i ? '1px solid #F1F5F9' : '0' }}>
                    <Check size={14} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />{s}
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
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Interview session:</span>
                  <select
                    value={selectedReportId || ''}
                    onChange={e => setSelectedReportId(parseInt(e.target.value, 10))}
                    style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, border: '1px solid #CBD5E1', color: '#0F172A', background: '#FFF' }}
                  >
                    {reportHistory.map(r => (
                      <option key={r.id} value={r.id}>{formatDate(r.created)}{r.interview_type ? ` · ${r.interview_type}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5B4FE9', marginBottom: 14 }}>Competency breakdown</div>
                {[
                  { k: 'confidence',     label: 'Confidence',          v: selectedReport.confidence },
                  { k: 'tech_knowledge', label: 'Technical knowledge',  v: selectedReport.tech_knowledge },
                  { k: 'communication',  label: 'Communication',        v: selectedReport.communication },
                  { k: 'overall_score',  label: 'Overall',              v: selectedReport.overall_score },
                ].map((s, i) => s.v != null && (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{s.label}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: s.v >= 7 ? '#047857' : s.v >= 5 ? '#B45309' : '#B53618' }}>{s.v}/10</span>
                    </div>
                    <div style={{ height: 6, background: '#F1F5F9', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(s.v / 10) * 100}%`, background: '#5B4FE9', borderRadius: 9999, transition: 'width 600ms cubic-bezier(0.2,0,0,1)' }} />
                    </div>
                  </div>
                ))}
                {selectedReport.summary && (
                  <div style={{ marginTop: 16, padding: 14, background: '#F8FAFC', borderRadius: 8 }}>
                    <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>{selectedReport.summary}</p>
                  </div>
                )}
                {selectedReport.pdf_url && (
                  <a href={selectedReport.pdf_url} download target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, padding: '8px 14px', background: '#5B4FE9', color: '#FFF', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
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
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Interview session:</span>
                  <select
                    value={selectedInterviewId || ''}
                    onChange={e => { setSelectedInterviewId(parseInt(e.target.value, 10)); setTranscript(null) }}
                    style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, border: '1px solid #CBD5E1', color: '#0F172A', background: '#FFF' }}
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
                <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5B4FE9', marginBottom: 16 }}>AI voice screen transcript</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {transcript.map((qa, i) => (
                      <div key={i} style={{ paddingBottom: 16, borderBottom: i < transcript.length - 1 ? '1px solid #F1F5F9' : '0' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#5B4FE9', marginBottom: 8 }}>Q{i + 1}: {qa.question}</div>
                        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{qa.answer_text || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>No answer recorded.</span>}</div>
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
          <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
            {notesLoading ? <Spinner center /> : notes.length === 0 ? null : (
              <div style={{ marginBottom: 16 }}>
                {notes.map(n => (
                  <div key={n.id} style={{ padding: '12px 0 12px 16px', borderLeft: '3px solid #5B4FE9', background: '#FAFAFE', borderRadius: '0 8px 8px 0', marginBottom: 10 }}>
                    <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{n.note}</div>
                    <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, display: 'block' }}>{formatDate(n.created)}</span>
                  </div>
                ))}
              </div>
            )}
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add a note for the hiring team..."
              rows={3}
              style={{ width: '100%', padding: 12, border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = '#5B4FE9'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }}
              onBlur={e => { e.target.style.borderColor = '#CBD5E1'; e.target.style.boxShadow = 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                disabled={saving || !newNote.trim()}
                onClick={async () => {
                  setSaving(true)
                  try { await api.addMemberNote(id, newNote); setNewNote(''); const r = await api.getMemberNotes(id); setNotes(r.data || []) }
                  catch {} finally { setSaving(false) }
                }}
                style={{ padding: '8px 16px', background: !newNote.trim() || saving ? '#E2E8F0' : '#5B4FE9', color: !newNote.trim() || saving ? '#94A3B8' : '#FFF', border: 0, borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: !newNote.trim() || saving ? 'not-allowed' : 'pointer' }}
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
        <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Resume</div>
            {member.resume_url && (
              <a href={member.resume_url} download target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 6, background: '#FFF', border: '1px solid #CBD5E1', borderRadius: 8, color: '#0F172A', cursor: 'pointer' }}>
                <Download size={12} />
              </a>
            )}
          </div>
          {member.resume_url ? (
            <>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
                {[65,45,100,92,78,100,85,60,100,72,55].map((w, i) => (
                  <div key={i} style={{ height: i % 4 === 0 ? 7 : 5, background: i % 4 === 0 ? '#94A3B8' : '#CBD5E1', borderRadius: 9999, width: `${w}%`, marginBottom: 5 }} />
                ))}
              </div>
              <a href={member.resume_url} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 12, color: '#5B4FE9', fontWeight: 500, cursor: 'pointer', textDecoration: 'none' }}>Open full screen</a>
            </>
          ) : (
            <div style={{ border: '1px dashed #CBD5E1', borderRadius: 8, padding: '14px 12px', textAlign: 'center', fontSize: 13, color: '#94A3B8', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
              <FileText size={15} style={{ marginBottom: 4 }} /> Upload resume (PDF)
            </div>
          )}
          <input type="file" accept=".pdf" style={{ display: 'none' }} ref={fileInputRef} onChange={handleResumeUpload} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ width: '100%', marginTop: 10, padding: '7px 0', background: '#FFF', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
            {uploading ? 'Uploading...' : member.resume_url ? 'Replace resume' : 'Upload resume'}
          </button>
        </div>

        {/* Assessment status */}
        <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5B4FE9', marginBottom: 10 }}>Assessment status</div>
          <AssessBadge lastAssessed={member.last_assessed} />
          <button onClick={() => setScheduleOpen(true)} style={{ width: '100%', marginTop: 12, padding: '8px 0', background: '#5B4FE9', color: '#FFF', border: 0, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
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

