// pages/manager/MemberProfilePage.jsx
// 5-tab profile: Overview, Analysis, Transcript, Exam, Notes.

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, Download, ArrowLeft } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import Avatar from '../../components/shared/Avatar'
import Button from '../../components/shared/Button'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'
import ScheduleModal from '../../components/manager/ScheduleModal'

const TABS = ['Overview', 'Analysis', 'Transcript', 'Exam', 'Notes']

function AssessBadge({ lastAssessed }) {
  if (!lastAssessed) return <span style={{ padding: '3px 10px', borderRadius: 99, background: 'var(--slate-100)', color: 'var(--fg-muted)', fontSize: 12, fontWeight: 600 }}>Never assessed</span>
  const daysAgo = (Date.now() - new Date(lastAssessed).getTime()) / (1000 * 60 * 60 * 24)
  if (daysAgo > 90) return <span style={{ padding: '3px 10px', borderRadius: 99, background: 'var(--warning-100)', color: 'var(--warning-700)', fontSize: 12, fontWeight: 600 }}>Overdue</span>
  return <span style={{ padding: '3px 10px', borderRadius: 99, background: 'var(--success-50)', color: 'var(--success-700)', fontSize: 12, fontWeight: 600 }}>Up to date</span>
}

function ScoreBar({ label, value, max = 10 }) {
  const pct = value ? Math.round((value / max) * 100) : 0
  const color = pct >= 70 ? 'var(--success-500)' : pct >= 50 ? 'var(--warning-500)' : 'var(--danger-500)'
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: 'var(--fg-body)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{value != null ? `${value}/10` : '—'}</span>
      </div>
      <div style={{ height: 6, background: 'var(--slate-100)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

/**
 * Member profile page with 5 tabs.
 */
function MemberProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [member, setMember]   = useState(null)
  const [report, setReport]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [tab, setTab]         = useState(0)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  // Notes tab state
  const [notes, setNotes]           = useState([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [newNote, setNewNote]       = useState('')
  const [saving, setSaving]         = useState(false)

  // Transcript tab state
  const [transcript, setTranscript]         = useState(null)
  const [transcriptLoading, setTranscriptLoading] = useState(false)

  // Exam tab state
  const [examResults, setExamResults]     = useState(null)
  const [examLoading, setExamLoading]     = useState(false)

  useEffect(() => { load() }, [id])

  // Fetch notes when Notes tab is active
  useEffect(() => {
    if (tab !== 4) return
    setNotesLoading(true)
    api.getMemberNotes(id).then(r => setNotes(r.data)).catch(() => {}).finally(() => setNotesLoading(false))
  }, [tab, id])

  // Fetch transcript when Transcript tab is active
  useEffect(() => {
    if (tab !== 2 || transcript !== null) return
    setTranscriptLoading(true)
    api.getMemberInterviews(id)
      .then(r => {
        const aiInterview = (r.data || []).find(i => i.type === 'ai_voice' && i.status === 'completed')
        if (!aiInterview) { setTranscript([]); return }
        return api.getInterviewTranscript(aiInterview.id)
      })
      .then(r => { if (r) setTranscript(r.data || []) })
      .catch(() => setTranscript([]))
      .finally(() => setTranscriptLoading(false))
  }, [tab, id])

  // Fetch exam results when Exam tab is active
  useEffect(() => {
    if (tab !== 3 || examResults !== null) return
    setExamLoading(true)
    api.getMemberInterviews(id)
      .then(r => {
        const exam = (r.data || []).find(i => i.type === 'exam' && i.status === 'completed')
        if (!exam) { setExamResults([]); return }
        return api.getInterviewTranscript(exam.id)
      })
      .then(r => { if (r) setExamResults(r.data || []) })
      .catch(() => setExamResults([]))
      .finally(() => setExamLoading(false))
  }, [tab, id])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [memberRes, reportRes] = await Promise.all([
        api.getMember(id),
        api.getCandidateReport(id),
      ])
      setMember(memberRes.data)
      setReport(reportRes.data)
    } catch (err) {
      setError('Could not load profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Upload a PDF resume to Cloudinary and refresh member data
  async function handleResumeUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      await api.uploadResume(member.id, file)
      await load()
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const strengthsList = (() => {
    try { return JSON.parse(report?.strengths || '[]') } catch { return [] }
  })()
  const tipsList = (() => {
    try { return JSON.parse(report?.tips || '[]') } catch { return [] }
  })()

  if (loading) return <div style={{ padding: 40 }}><Spinner /></div>
  if (error) return <ErrorMessage message={error} />
  if (!member) return <EmptyState message="Member not found." />

  const tabButtonStyle = (i) => ({
    padding: '10px 16px',
    background: 'none',
    border: 'none',
    borderBottom: `2px solid ${tab === i ? 'var(--brand-500)' : 'transparent'}`,
    color: tab === i ? 'var(--brand-500)' : 'var(--fg-muted)',
    fontSize: 14,
    fontWeight: tab === i ? 600 : 400,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  })

  return (
    <div>
      {/* Back */}
      <button onClick={() => navigate('/manager/team')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 13, marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back to team
      </button>

      {/* Header card */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', boxShadow: 'var(--shadow-sm)' }}>
        <Avatar name={`${member.first_name} ${member.last_name}`} size={48} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-primary)' }}>{member.first_name} {member.last_name}</div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 2 }}>{member.email}</div>
          <div style={{ marginTop: 6 }}><AssessBadge lastAssessed={member.last_assessed} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => setScheduleOpen(true)}>
            <Calendar size={13} /> Schedule Interview
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', marginBottom: 0, overflowX: 'auto' }}>
        {TABS.map((t, i) => <button key={t} style={tabButtonStyle(i)} onClick={() => setTab(i)}>{t}</button>)}
      </div>

      {/* Tab content */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderTop: 'none', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>

        {/* Overview */}
        {tab === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>Resume</div>
              {member.resume_url ? (
                <div>
                  <iframe src={member.resume_url} title="Resume" style={{ width: '100%', height: 400, border: '1px solid var(--border-default)', borderRadius: 8 }} />
                  <a href={member.resume_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13, color: 'var(--brand-500)', textDecoration: 'none', fontWeight: 500 }}>
                    <Download size={13} /> Download CV
                  </a>
                </div>
              ) : (
                <EmptyState message="No resume uploaded yet." />
              )}
              {/* Resume upload / replace button */}
              <div style={{ marginTop: 10 }}>
                <input
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                  onChange={handleResumeUpload}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading…' : member.resume_url ? 'Replace CV' : 'Upload CV'}
                </Button>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>Assessment History</div>
              {report ? (
                <div style={{ padding: 14, background: 'var(--bg-surface-alt)', borderRadius: 10, fontSize: 13 }}>
                  <div style={{ color: 'var(--fg-muted)', marginBottom: 4 }}>Last assessed: {formatDate(report.report_date || report.created)}</div>
                  <div>Overall score: <strong>{report.overall_score}/10</strong></div>
                </div>
              ) : (
                <EmptyState message="No assessments yet." />
              )}
            </div>
          </div>
        )}

        {/* Analysis */}
        {tab === 1 && (
          report ? (
            <div style={{ maxWidth: 500 }}>
              <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 16 }}>Assessment Scores</div>
              <ScoreBar label="Confidence" value={report.confidence} />
              <ScoreBar label="Technical Knowledge" value={report.tech_knowledge} />
              <ScoreBar label="Communication" value={report.communication} />
              <ScoreBar label="Overall" value={report.overall_score} />
              {strengthsList.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 10 }}>Strengths</div>
                  {strengthsList.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                      <span style={{ color: 'var(--success-500)', flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: 13, color: 'var(--fg-body)' }}>{s}</span>
                    </div>
                  ))}
                </div>
              )}
              {report.summary && (
                <div style={{ marginTop: 20, padding: 14, background: 'var(--bg-surface-alt)', borderRadius: 10 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Summary</div>
                  <p style={{ fontSize: 13, color: 'var(--fg-body)', lineHeight: 1.6, margin: 0 }}>{report.summary}</p>
                </div>
              )}
              {report.pdf_url && (
                <div style={{ marginTop: 20 }}>
                  <a
                    href={report.pdf_url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--brand-500)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
                  >
                    <Download size={13} /> Download Report PDF
                  </a>
                </div>
              )}
            </div>
          ) : <EmptyState message="No report available yet. Schedule an interview to generate one." />
        )}

        {/* Transcript */}
        {tab === 2 && (
          transcriptLoading ? <Spinner /> :
          !transcript || transcript.length === 0 ? (
            <EmptyState message="No transcript available. An AI interview must be completed first." />
          ) : (
            <div style={{ maxWidth: 700 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Interview Transcript</div>
              {transcript.map((qa, i) => (
                <div key={i} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: i < transcript.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-600)', marginBottom: 6 }}>
                    Q{i + 1}: {qa.question}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--fg-body)', lineHeight: 1.6, padding: '10px 14px', background: 'var(--bg-surface-alt)', borderRadius: 8 }}>
                    {qa.answer_text || <span style={{ color: 'var(--fg-muted)', fontStyle: 'italic' }}>No answer recorded.</span>}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Exam */}
        {tab === 3 && (
          examLoading ? <Spinner /> :
          !examResults || examResults.length === 0 ? (
            <EmptyState message="No exam results yet. An exam must be completed first." />
          ) : (
            <div style={{ maxWidth: 700 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Exam Results</div>
              {examResults.map((qa, i) => (
                <div key={i} style={{ marginBottom: 16, padding: '14px 16px', border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--bg-surface-alt)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    Q{i + 1}: {qa.question}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                    Answer: <span style={{ color: 'var(--fg-body)', fontWeight: 500 }}>{qa.answer_text || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Notes */}
        {tab === 4 && (
          <div style={{ maxWidth: 600 }}>
            {/* Notes list */}
            {notesLoading ? (
              <Spinner />
            ) : notes.length === 0 ? (
              <EmptyState message="No notes yet." />
            ) : (
              <div style={{ marginBottom: 24 }}>
                {notes.map(n => (
                  <div key={n.id} style={{ padding: '12px 16px', background: 'var(--bg-surface-alt)', border: '1px solid var(--border-default)', borderRadius: 8, marginBottom: 10 }}>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-body)', lineHeight: 1.6 }}>{n.note}</p>
                    <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--fg-muted)' }}>{formatDate(n.created)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Add note form */}
            <div style={{ marginTop: 8 }}>
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Write a note…"
                rows={4}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 14, color: 'var(--fg-body)', background: 'var(--bg-surface)', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <div style={{ marginTop: 8 }}>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={saving || newNote.trim() === ''}
                  onClick={async () => {
                    setSaving(true)
                    try {
                      await api.addMemberNote(id, newNote)
                      setNewNote('')
                      setNotesLoading(true)
                      const r = await api.getMemberNotes(id)
                      setNotes(r.data)
                    } catch {
                      // silently ignore — user can retry
                    } finally {
                      setSaving(false)
                      setNotesLoading(false)
                    }
                  }}
                >
                  {saving ? 'Saving…' : 'Add Note'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ScheduleModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} member={member} onDone={load} />
    </div>
  )
}

export default MemberProfilePage
