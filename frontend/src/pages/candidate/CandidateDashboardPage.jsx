import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, CheckCircle2, TrendingUp, Repeat2, Info, UploadCloud } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

const AV_COLORS = [
  {bg:'#EDE9FE',fg:'#5B21B6'},{bg:'#FED7AA',fg:'#9A3412'},{bg:'#A7F3D0',fg:'#065F46'},
  {bg:'#BFDBFE',fg:'#1E40AF'},{bg:'#FBCFE8',fg:'#9D174D'},{bg:'#FDE68A',fg:'#854D0E'},
  {bg:'#C7D2FE',fg:'#3730A3'},{bg:'#FCA5A5',fg:'#7F1D1D'},
]
function V2Av({ name = '', size = 32 }) {
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase() || '?'
  const c = AV_COLORS[name.charCodeAt(0) % AV_COLORS.length]
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: c.bg, color: c.fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

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
  const [resumeTags, setResumeTags] = useState([])
  const [status, setStatus] = useState(user.status || 'bench')

  async function handleResumeUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setResumeUploading(true)
    try {
      await new Promise(r => setTimeout(r, 1000))
      setResumeTags(['React', 'Node.js', 'TypeScript'])
    } catch {
      alert('Upload failed')
    } finally {
      setResumeUploading(false)
    }
  }

  async function handleStatusChange(s) {
    setStatus(s)
    try { await api.updateCandidateProfile({ status: s }) } catch {}
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
  const avgScore  = completed.length ? (completed.reduce((s, c) => s + (c.score || 0), 0) / completed.length).toFixed(1) : 'N/A'
  const firstName = user.name ? user.name.split(' ')[0] : 'there'

  if (loading) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
  if (error) return <div style={{ padding: 40, color: '#EF4444', fontSize: 14 }}>{error}</div>

  return (
    <div style={{ padding: '1.5rem 1.75rem', maxWidth: '75rem', width: '100%', margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Welcome back, {firstName}!</h1>
        <p style={{ fontSize: 14, color: '#64748B', marginTop: 4, marginBottom: 0 }}>Here&apos;s your interview overview</p>
      </div>

      <div style={{ background: '#DBEAFE', border: '1px solid #93C5FD', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Info size={16} color="#1E40AF" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: 13, color: '#1E40AF', margin: 0 }}>
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
          <div key={i} style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#64748B', margin: 0, lineHeight: 1.4 }}>{s.label}</p>
              <s.icon size={16} color="#94A3B8" />
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>{s.value}</p>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Upcoming Interviews</h2>
          {upcoming.length === 0 ? (
            <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '32px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>No upcoming interviews.</p>
            </div>
          ) : upcoming.map(u => (
            <div key={u.id} style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: 16, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>{u.job_title || 'Interview'}</p>
                  <p style={{ fontSize: 12, color: '#64748B', margin: '3px 0 0' }}>{u.company_name || ''}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: '#EFEDFD', color: '#5B4FE9' }}>Scheduled</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: '#EFEDFD', color: '#5B4FE9', fontWeight: 600 }}>
                  {u.type === 'ai_voice' ? 'AI Voice' : u.type === 'exam' ? 'Coding Exam' : 'Interview'}
                </span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: '#F1F5F9', color: '#475569', fontWeight: 500 }}>
                  {u.duration || '45 min'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>
                {formatDate(u.scheduled_at || u.created)}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => navigate(`/interview/${u.token || u.magic_token}/device-check`)} style={{ flex: 1, padding: '8px 14px', background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                  Device Check
                </button>
                <button onClick={() => navigate(`/interview/${u.token || u.magic_token}`)} style={{ flex: 2, padding: '8px 14px', background: '#0F172A', border: 0, borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#FFF', cursor: 'pointer' }}>
                  Start Interview →
                </button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Recent Performance</h2>
          <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: 16, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            {completed.length === 0 ? (
              <p style={{ fontSize: 13, color: '#94A3B8', margin: 0, textAlign: 'center', padding: '20px 0' }}>No reports available yet</p>
            ) : completed.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < completed.length - 1 ? '1px solid #F1F5F9' : 0 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>
                    {c.type === 'ai_voice' ? 'AI Screening' : 'Exam'}
                  </p>
                  <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>{formatDate(c.created)}</p>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: (c.score || 0) >= 4 ? '#059669' : '#D97706' }}>
                  {c.score || '—'}
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Profile Settings</h2>
          <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: 16, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: '0 0 8px' }}>Current Status</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {['bench', 'client-side'].map(s => (
                  <button key={s} onClick={() => handleStatusChange(s)} style={{ flex: 1, padding: '8px', border: `1px solid ${status === s ? '#5B4FE9' : '#E2E8F0'}`, background: status === s ? '#EFEDFD' : '#FFF', color: status === s ? '#3A31A3' : '#64748B', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
                    {s === 'bench' ? 'In Bench' : 'Client Side'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: '0 0 8px' }}>Resume & Skills</p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px', border: '1px dashed #CBD5E1', borderRadius: 8, cursor: 'pointer', background: '#F8FAFC' }}>
                <UploadCloud size={16} color="#64748B" />
                <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{resumeUploading ? 'Uploading...' : 'Upload new resume (PDF)'}</span>
                <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleResumeUpload} disabled={resumeUploading} />
              </label>
              {resumeTags.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 11, color: '#64748B', marginBottom: 6 }}>Extracted tags:</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {resumeTags.map(t => (
                      <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: '#E0E7FF', color: '#4338CA', fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Interview Preparation Tips</h2>
          {PREP_TIPS.map((t, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>{t.phase}</p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {t.items.map((it, j) => <li key={j} style={{ fontSize: 12, color: '#475569', lineHeight: 1.8 }}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CandidateDashboardPage
