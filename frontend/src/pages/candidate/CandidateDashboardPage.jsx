import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, CheckCircle2, TrendingUp, Repeat2, Info, UploadCloud } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

import Avatar from '../../components/shared/Avatar'

const PREP_TIPS = [
  { phase: 'Before Interview', items: ['Run device check', 'Test microphone in a quiet room', 'Review your resume and key projects', 'Research the company and role'] },
  { phase: 'During Interview', items: ['Stay focused — do not switch tabs', 'Speak clearly and take your time', 'Ask for clarification if needed', 'Structure answers with examples'] },
  { phase: 'After Interview',  items: ['Review your feedback report', 'Work on highlighted improvement areas', 'Prepare for the next round'] },
]

function CandidateDashboardPage() {
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  let user = {}
  try { user = JSON.parse(localStorage.getItem('user') || '{}') } catch {}

  const [resumeUploading, setResumeUploading] = useState(false)
  const [uploadError, setUploadError]         = useState(null)
  const [resumeTags, setResumeTags] = useState([])
  const [availability, setAvailability] = useState(user.availability || 'bench')

  async function handleResumeUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setResumeUploading(true)
    setUploadError(null)
    try {
      const res = await api.uploadOwnResume(file)
      // The background job extracts tags; they won't appear immediately.
      // We could poll or just let the user see them on next login.
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setResumeUploading(false)
      e.target.value = ''
    }
  }

  async function handleAvailabilityChange(s) {
    setAvailability(s)
    try { await api.updateCandidateProfile({ availability: s }) } catch {}
  }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getCandidateInterviews()
      setInterviews(res.data || [])
    } catch {
      setError('Could not load your interviews.')
    } finally {
      setLoading(false)
    }
  }

  const upcoming  = interviews.filter(i => i.status === 'scheduled' || i.status === 'in_progress')
  const completed = interviews.filter(i => i.status === 'completed')
  const avgScore  = completed.length ? (completed.reduce((s, c) => s + (Number(c.overall_score) || 0), 0) / completed.length).toFixed(1) : 'N/A'
  const firstName = user.first_name || user.name?.split(' ')[0] || 'there'

  if (loading) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
  if (error) return <div style={{ padding: 40, color: 'var(--danger-600)', fontSize: 14 }}>{error}</div>

  return (
    <div style={{ padding: '1.5rem 1.75rem', maxWidth: '75rem', width: '100%', margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--slate-900)', letterSpacing: '-0.02em', margin: 0 }}>Welcome back, {firstName}!</h1>
        <p style={{ fontSize: 14, color: 'var(--slate-500)', marginTop: 4, marginBottom: 0 }}>Here&apos;s your interview overview</p>
      </div>

      <div style={{ background: 'var(--info-50)', border: '1px solid var(--slate-200)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Info size={16} color="var(--info-600)" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: 13, color: 'var(--info-600)', margin: 0 }}>
          You have {upcoming.length} upcoming scheduled interview{upcoming.length !== 1 ? 's' : ''}. Make sure to complete the device check before starting.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))', gap: '0.875rem', marginBottom: '1.75rem' }}>
        {[
          { icon: Calendar,     label: 'Upcoming Interviews', value: upcoming.length,   sub: 'Scheduled for you' },
          { icon: CheckCircle2, label: 'Completed',           value: completed.length,  sub: 'Interviews finished' },
          { icon: TrendingUp,   label: 'Average Score',       value: avgScore,          sub: 'Your performance' },
          { icon: Repeat2,      label: 'Total Attempts',      value: `${completed.length}/${interviews.length}`, sub: 'Practice sessions' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--slate-500)', margin: 0, lineHeight: 1.4 }}>{s.label}</p>
              <s.icon size={16} color="var(--slate-400)" />
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>{s.value}</p>
            <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', marginBottom: 16 }}>Upcoming Interviews</h2>
          {upcoming.length === 0 ? (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 10, padding: '32px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: 0 }}>No upcoming interviews.</p>
            </div>
          ) : upcoming.map(u => (
            <div key={u.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 10, padding: 16, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>{u.job_title || 'Interview'}</p>
                  <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: '3px 0 0' }}>{u.company_name || ''}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'var(--brand-50)', color: 'var(--brand-500)' }}>Scheduled</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: 'var(--brand-50)', color: 'var(--brand-500)', fontWeight: 600 }}>
                  {u.type === 'ai_voice' ? 'AI Voice' : u.type === 'exam' ? 'Coding Exam' : 'Interview'}
                </span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: 'var(--slate-100)', color: 'var(--slate-600)', fontWeight: 500 }}>
                  {u.duration || '45 min'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--slate-600)', marginBottom: 12 }}>
                {formatDate(u.scheduled_at || u.created)}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => navigate(`/interview/${u.token || u.magic_token}/device-check`)} style={{ flex: 1, padding: '8px 14px', background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 7, fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', cursor: 'pointer' }}>
                  Device Check
                </button>
                <button onClick={() => navigate(`/interview/${u.token || u.magic_token}`)} style={{ flex: 2, padding: '8px 14px', background: 'var(--slate-900)', border: 0, borderRadius: 7, fontSize: 12, fontWeight: 600, color: 'var(--bg-surface)', cursor: 'pointer' }}>
                  Start Interview →
                </button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', marginBottom: 16 }}>Recent Performance</h2>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 10, padding: 16, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            {completed.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: 0, textAlign: 'center', padding: '20px 0' }}>No reports available yet</p>
            ) : completed.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < completed.length - 1 ? '1px solid var(--slate-100)' : 0 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-900)', margin: 0 }}>
                    {c.type === 'ai_voice' ? 'AI Screening' : 'Exam'}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '2px 0 0' }}>{formatDate(c.created)}</p>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: (Number(c.overall_score) || 0) >= 5.5 ? 'var(--success-500)' : 'var(--warning-500)' }}>
                  {c.overall_score != null ? Number(c.overall_score).toFixed(1) : '—'}
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', marginBottom: 16 }}>Profile Settings</h2>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 10, padding: 16, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 8 }}>Availability</label>
              <div style={{ display: 'flex', gap: 16 }}>
                <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--slate-900)' }}>
                  <input type="radio" name="availability" value="bench" checked={availability === 'bench'} onChange={e => handleAvailabilityChange(e.target.value)} style={{ accentColor: 'var(--brand-500)' }} />
                  On bench
                </label>
                <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--slate-900)' }}>
                  <input type="radio" name="availability" value="client_side" checked={availability === 'client_side'} onChange={e => handleAvailabilityChange(e.target.value)} style={{ accentColor: 'var(--brand-500)' }} />
                  Client side
                </label>
              </div>
            </div>

            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-900)', margin: '0 0 8px' }}>Resume & Skills</p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px', border: '1px dashed var(--slate-300)', borderRadius: 8, cursor: 'pointer', background: 'var(--slate-50)' }}>
                <UploadCloud size={16} color="var(--slate-500)" />
                <span style={{ fontSize: 12, color: 'var(--slate-600)', fontWeight: 500 }}>{resumeUploading ? 'Uploading...' : 'Upload new resume (PDF)'}</span>
                <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleResumeUpload} disabled={resumeUploading} />
              </label>
              {uploadError && <div style={{ fontSize: 12, color: 'var(--danger-700)', marginTop: 8 }}>{uploadError}</div>}
              {resumeTags.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--slate-500)', marginBottom: 6 }}>Extracted tags:</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {resumeTags.map(t => (
                      <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--brand-50)', color: 'var(--brand-700)', fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', marginBottom: 12 }}>Interview Preparation Tips</h2>
          {PREP_TIPS.map((t, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 6px' }}>{t.phase}</p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {t.items.map((it, j) => <li key={j} style={{ fontSize: 12, color: 'var(--slate-600)', lineHeight: 1.8 }}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CandidateDashboardPage
