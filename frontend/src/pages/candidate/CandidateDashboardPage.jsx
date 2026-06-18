import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BriefcaseBusiness, Calendar, CheckCircle2, ChevronDown, ChevronUp,
  Clock, FileText, TrendingUp, UploadCloud, XCircle, AlertTriangle,
  Play, MapPin, Zap,
} from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

const INTERVIEW_TYPE_LABEL = {
  ai_voice: 'AI Voice',
  exam:     'Coding Exam',
  human:    'Video Interview',
  offline:  'Offline Interview',
  client:   'Client Interview',
}

const TYPE_COLOR = {
  ai_voice: 'var(--brand-500)',
  exam:     'var(--info-500)',
  human:    'var(--success-500)',
  offline:  'var(--warning-500)',
}

const TYPE_BG = {
  ai_voice: 'var(--brand-50)',
  exam:     'var(--info-50)',
  human:    'var(--success-50)',
  offline:  'var(--warning-50)',
}

const OUTCOME_CONFIG = {
  passed:  { label: 'Passed',        color: 'var(--success-600)', bg: 'var(--success-50)' },
  failed:  { label: 'Did not clear', color: 'var(--danger-600)',  bg: 'var(--danger-50)' },
  on_hold: { label: 'On hold',       color: 'var(--warning-600)', bg: 'var(--warning-50)' },
  pending: { label: 'Pending',       color: 'var(--fg-muted)',    bg: 'var(--bg-surface-alt)' },
}

function StatCard({ icon: Icon, label, value, sub, accentBg, accentColor }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={accentColor} />
        </div>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'right' }}>{label}</p>
      </div>
      <p style={{ fontSize: 30, fontWeight: 700, color: 'var(--fg-primary)', margin: '0 0 2px', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: 0 }}>{sub}</p>
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow-xs)', ...style }}>
      {children}
    </div>
  )
}

function SectionHeading({ title, count, countBg, countColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>{title}</h2>
      {count !== undefined && (
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: countBg || 'var(--bg-surface-alt)', color: countColor || 'var(--fg-muted)' }}>{count}</span>
      )}
    </div>
  )
}

function CandidateDashboardPage() {
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState([])
  const [clientMandates, setClientMandates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [launchingId, setLaunchingId] = useState(null)
  const [availability, setAvailability] = useState('bench')
  const [resumeTags, setResumeTags] = useState([])
  const [resumeUploading, setResumeUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState(null)
  const [resumeSubmitting, setResumeSubmitting] = useState(null)
  const [expandedMandate, setExpandedMandate] = useState(null)

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  })()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [interviewRes, profileRes, mandateRes] = await Promise.all([
        api.getCandidateInterviews(),
        api.getProfile(),
        api.getCandidateClientMandates().catch(() => ({ data: [] })),
      ])
      setInterviews(interviewRes.data || [])
      setClientMandates(mandateRes.data || [])
      const profile = profileRes.data || {}
      setAvailability(profile.availability || 'bench')
      try { setResumeTags(JSON.parse(profile.tags || '[]')) } catch { setResumeTags([]) }
      let stored = {}
      try { stored = JSON.parse(localStorage.getItem('user') || '{}') } catch { stored = {} }
      localStorage.setItem('user', JSON.stringify({ ...stored, ...profile }))
    } catch { setError('Could not load your dashboard.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleAvailabilityChange(value) {
    setAvailability(value)
    try { await api.updateCandidateProfile({ availability: value }) } catch { /* non-critical */ }
  }

  async function handleResumeUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setResumeUploading(true)
    setUploadMessage(null)
    try {
      await api.uploadOwnResume(file)
      setUploadMessage({ type: 'success', text: 'Resume uploaded. Skills will be extracted shortly.' })
    } catch (err) { setUploadMessage({ type: 'error', text: err.message || 'Upload failed.' }) }
    finally { setResumeUploading(false); e.target.value = '' }
  }

  async function submitClientResume(ctId, file) {
    setResumeSubmitting(ctId)
    try {
      if (file) {
        await api.submitClientResume(ctId, file)
      } else {
        await api.useExistingResumeForClient(ctId)
      }
      setUploadMessage({ type: 'success', text: 'Resume submitted for this client mandate.' })
      await load()
    } catch (err) { setUploadMessage({ type: 'error', text: err.message || 'Could not submit resume.' }) }
    finally { setResumeSubmitting(null) }
  }

  async function launchInterview(interview) {
    setLaunchingId(interview.id)
    setError(null)
    try {
      const response = await api.launchCandidateInterview(interview.id)
      const launch = response.data
      localStorage.setItem('accessToken', launch.sessionToken)
      localStorage.setItem('interviewSession', JSON.stringify({
        interviewId: launch.interview.id,
        token: launch.launchToken,
        type: launch.interview.type,
        mode: launch.interview.interviewMode,
        candidateName: launch.interview.candidateName,
      }))
      navigate(`/interview/${launch.launchToken}`)
    } catch (err) { setError(err.message || 'Could not launch this interview.') }
    finally { setLaunchingId(null) }
  }

  const upcoming = interviews.filter(i => ['scheduled', 'in_progress'].includes(i.status) && i.type !== 'offline' && i.type !== 'client')
  const offlineInterviews = interviews.filter(i => i.type === 'offline')
  const completed = interviews.filter(i => i.status === 'completed')
  const avgScore = completed.length
    ? (completed.reduce((s, c) => s + (Number(c.overall_score) || 0), 0) / completed.length).toFixed(1)
    : 'N/A'
  const firstName = user.first_name || user.name?.split(' ')[0] || 'there'
  const initials = [user.first_name, user.last_name].filter(Boolean).map(n => n[0]?.toUpperCase()).join('') || firstName[0]?.toUpperCase() || '?'
  const nextLaunchable = upcoming.find(i => i.type === 'ai_voice' || i.type === 'exam')

  if (loading) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>

  return (
    <div style={{ padding: '1.5rem 1.75rem', maxWidth: '76rem', width: '100%', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>{initials}</span>
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-primary)', letterSpacing: '-0.02em', margin: 0 }}>Welcome back, {firstName}!</h1>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 2, marginBottom: 0 }}>Here&apos;s your interview overview</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--danger-50)', color: 'var(--danger-700)', fontSize: 13, marginBottom: 20, border: '1px solid var(--danger-100)' }}>
          {error}
        </div>
      )}
      {uploadMessage && (
        <div onClick={() => setUploadMessage(null)} style={{ padding: '10px 14px', borderRadius: 8, background: uploadMessage.type === 'success' ? 'var(--success-50)' : 'var(--danger-50)', color: uploadMessage.type === 'success' ? 'var(--success-700)' : 'var(--danger-700)', fontSize: 13, marginBottom: 20, border: `1px solid ${uploadMessage.type === 'success' ? 'var(--success-100)' : 'var(--danger-100)'}`, cursor: 'pointer' }}>
          {uploadMessage.text}
        </div>
      )}

      {/* Next-up spotlight — only shown when a launchable interview exists */}
      {nextLaunchable && (
        <div style={{ background: 'linear-gradient(135deg, var(--brand-50) 0%, var(--bg-surface) 100%)', border: '1px solid var(--brand-200)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Play size={18} color="white" />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-600)', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ready to Start</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>{nextLaunchable.context_title || nextLaunchable.job_title || 'Interview'}</p>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '2px 0 0' }}>{INTERVIEW_TYPE_LABEL[nextLaunchable.type]} · {formatDate(nextLaunchable.scheduled_at || nextLaunchable.created)}</p>
            </div>
          </div>
          <button onClick={() => launchInterview(nextLaunchable)} disabled={launchingId === nextLaunchable.id}
            style={{ padding: '10px 22px', background: 'var(--brand-500)', border: 0, borderRadius: 8, fontSize: 13, fontWeight: 700, color: 'white', cursor: launchingId === nextLaunchable.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: launchingId === nextLaunchable.id ? 0.7 : 1, flexShrink: 0 }}>
            {launchingId === nextLaunchable.id ? 'Preparing…' : 'Start Now →'}
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))', gap: '0.875rem', marginBottom: '1.75rem' }}>
        <StatCard icon={Calendar}          label="Upcoming"  value={upcoming.length}        sub="Scheduled interviews"  accentBg="var(--brand-50)"   accentColor="var(--brand-500)" />
        <StatCard icon={CheckCircle2}      label="Completed" value={completed.length}        sub="Interviews finished"   accentBg="var(--success-50)" accentColor="var(--success-500)" />
        <StatCard icon={TrendingUp}        label="Avg Score" value={avgScore}                sub="Your performance"      accentBg="var(--warning-50)" accentColor="var(--warning-500)" />
        <StatCard icon={BriefcaseBusiness} label="Mandates"  value={clientMandates.length}  sub="Client opportunities"  accentBg="var(--info-50)"    accentColor="var(--info-500)" />
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* Upcoming interviews */}
          <div>
            <SectionHeading title="Upcoming Interviews" count={upcoming.length > 0 ? upcoming.length : undefined} countBg="var(--brand-50)" countColor="var(--brand-600)" />
            {upcoming.length === 0 ? (
              <Card style={{ padding: '28px 20px', textAlign: 'center' }}>
                <Calendar size={20} color="var(--fg-subtle)" style={{ marginBottom: 8 }} />
                <p style={{ fontSize: 13, color: 'var(--fg-subtle)', margin: 0 }}>No upcoming interviews</p>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcoming.map(u => {
                  const tColor = TYPE_COLOR[u.type] || 'var(--border-strong)'
                  const tBg = TYPE_BG[u.type] || 'var(--bg-surface-alt)'
                  const canLaunch = u.type === 'ai_voice' || u.type === 'exam'
                  return (
                    <Card key={u.id} style={{ borderLeft: `3px solid ${tColor}` }}>
                      <div style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {u.context_title || u.job_title || 'Interview'}
                            </p>
                            {u.company_name && <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '2px 0 0' }}>{u.company_name}</p>}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: tBg, color: tColor, flexShrink: 0 }}>
                            {INTERVIEW_TYPE_LABEL[u.type] || u.type}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: canLaunch ? 12 : 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
                            <Clock size={11} />{formatDate(u.scheduled_at || u.created)}
                          </span>
                          <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: 'var(--bg-surface-alt)', color: 'var(--fg-muted)', fontWeight: 500, textTransform: 'capitalize' }}>
                            {u.difficulty || 'medium'}
                          </span>
                        </div>
                        {canLaunch && (
                          <button disabled={launchingId === u.id} onClick={() => launchInterview(u)}
                            style={{ width: '100%', padding: '9px 14px', background: 'var(--fg-primary)', border: 0, borderRadius: 7, fontSize: 12, fontWeight: 700, color: 'var(--bg-surface)', cursor: launchingId === u.id ? 'not-allowed' : 'pointer', opacity: launchingId === u.id ? 0.6 : 1 }}>
                            {launchingId === u.id ? 'Preparing…' : 'Start Interview'}
                          </button>
                        )}
                        {u.type === 'human' && (
                          <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} />Your interviewer will share the video link via email.
                          </p>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* In-person interviews */}
          {offlineInterviews.length > 0 && (
            <div>
              <SectionHeading title="In-Person Interviews" count={offlineInterviews.length} countBg="var(--warning-50)" countColor="var(--warning-600)" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {offlineInterviews.map(u => (
                  <Card key={u.id} style={{ borderLeft: '3px solid var(--warning-500)' }}>
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>{u.context_title || 'Offline Interview'}</p>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: 'var(--warning-50)', color: 'var(--warning-600)' }}>In-Person</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {u.scheduled_at && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}><Clock size={11} />{formatDate(u.scheduled_at)}</span>}
                        {u.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}><MapPin size={11} />{u.location}</span>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Recent performance */}
          <div>
            <SectionHeading title="Recent Performance" />
            <Card>
              {completed.length === 0 ? (
                <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                  <TrendingUp size={20} color="var(--fg-subtle)" style={{ marginBottom: 8 }} />
                  <p style={{ fontSize: 13, color: 'var(--fg-subtle)', margin: 0 }}>No completed interviews yet</p>
                </div>
              ) : completed.map((c, i) => {
                const score = Number(c.overall_score) || 0
                const passed = score >= 5.5
                const scoreColor = passed ? 'var(--success-500)' : 'var(--warning-500)'
                const scoreBg = passed ? 'var(--success-50)' : 'var(--warning-50)'
                const barWidth = `${Math.min((score / 10) * 100, 100)}%`
                return (
                  <div key={i} style={{ padding: '12px 16px', borderBottom: i < completed.length - 1 ? '1px solid var(--border-default)' : 0, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)', margin: '0 0 2px' }}>{INTERVIEW_TYPE_LABEL[c.type] || c.type}</p>
                      <p style={{ fontSize: 11, color: 'var(--fg-subtle)', margin: '0 0 8px' }}>{formatDate(c.created)}</p>
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-surface-alt)', overflow: 'hidden' }}>
                        <div style={{ width: barWidth, height: '100%', background: scoreColor, borderRadius: 2 }} />
                      </div>
                    </div>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: scoreBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor, letterSpacing: '-0.02em' }}>
                        {c.overall_score != null ? Number(c.overall_score).toFixed(1) : '—'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </Card>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* Profile & Resume */}
          <div>
            <SectionHeading title="Profile" />
            <Card>
              <div style={{ padding: '16px 16px 14px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Availability</p>
                <div style={{ display: 'flex', padding: 3, background: 'var(--bg-surface-alt)', borderRadius: 9, marginBottom: 20 }}>
                  {['bench', 'client_side'].map(val => (
                    <button key={val} type="button" onClick={() => handleAvailabilityChange(val)}
                      style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: 0, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: availability === val ? 'var(--bg-surface)' : 'transparent', color: availability === val ? 'var(--fg-primary)' : 'var(--fg-muted)', boxShadow: availability === val ? 'var(--shadow-xs)' : 'none', transition: `all var(--dur-fast) var(--ease-standard)` }}>
                      {val === 'bench' ? 'On Bench' : 'Client Side'}
                    </button>
                  ))}
                </div>

                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Main Resume</p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: '1.5px dashed var(--border-strong)', borderRadius: 9, cursor: 'pointer', background: 'var(--bg-page)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UploadCloud size={15} color="var(--brand-500)" />
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-primary)', margin: 0 }}>{resumeUploading ? 'Uploading…' : 'Upload Resume (PDF)'}</p>
                    <p style={{ fontSize: 11, color: 'var(--fg-subtle)', margin: 0 }}>Click to replace your main resume</p>
                  </div>
                  <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleResumeUpload} disabled={resumeUploading} />
                </label>

                {resumeTags.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Extracted Skills</p>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {resumeTags.map(t => (
                        <span key={t} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 999, background: 'var(--brand-50)', color: 'var(--brand-700)', fontWeight: 600, border: '1px solid var(--brand-100)' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Client mandates */}
          {clientMandates.length > 0 && (
            <div>
              <SectionHeading title="Client Mandates" count={clientMandates.length} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {clientMandates.map(mandate => {
                  const isExpanded = expandedMandate === mandate.id
                  const clientRecord = mandate.client_interview_record
                  const outcome = clientRecord?.outcome
                  const outcomeConf = OUTCOME_CONFIG[outcome] || OUTCOME_CONFIG.pending

                  return (
                    <Card key={mandate.id}>
                      <div style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>{mandate.client_name}</p>
                            <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '2px 0 0' }}>{mandate.mandate_role}</p>
                          </div>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--bg-surface-alt)', color: 'var(--fg-muted)', fontWeight: 500, textTransform: 'capitalize' }}>{mandate.status}</span>
                        </div>

                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: clientRecord || (!mandate.client_resume_url && mandate.jd_sent) ? 10 : 0 }}>
                          <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 999, background: mandate.jd_sent ? 'var(--success-50)' : 'var(--bg-surface-alt)', color: mandate.jd_sent ? 'var(--success-700)' : 'var(--fg-subtle)', fontWeight: 600 }}>
                            {mandate.jd_sent ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                            JD {mandate.jd_sent ? 'Received' : 'Pending'}
                          </span>
                          <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 999, background: mandate.client_resume_url ? 'var(--success-50)' : 'var(--bg-surface-alt)', color: mandate.client_resume_url ? 'var(--success-700)' : 'var(--fg-subtle)', fontWeight: 600 }}>
                            {mandate.client_resume_url ? <CheckCircle2 size={10} /> : <FileText size={10} />}
                            Resume {mandate.client_resume_url ? 'Submitted' : 'Pending'}
                          </span>
                          {clientRecord && (
                            <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 999, background: outcomeConf.bg, color: outcomeConf.color, fontWeight: 600 }}>
                              <AlertTriangle size={10} />{outcomeConf.label}
                            </span>
                          )}
                        </div>

                        {clientRecord && outcome !== 'pending' && (
                          <div style={{ padding: '10px 12px', borderRadius: 8, background: outcomeConf.bg, marginBottom: 10 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: outcomeConf.color, margin: '0 0 3px' }}>
                              {clientRecord.interview_date ? formatDate(clientRecord.interview_date) + ' · ' : ''}{outcomeConf.label}
                            </p>
                            {clientRecord.feedback && <p style={{ fontSize: 12, color: 'var(--fg-body)', margin: 0 }}>{clientRecord.feedback}</p>}
                          </div>
                        )}

                        {!mandate.client_resume_url && mandate.jd_sent && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button disabled={resumeSubmitting === mandate.id} onClick={() => submitClientResume(mandate.id, null)}
                              style={{ flex: 1, padding: '7px 10px', background: 'var(--bg-surface-alt)', border: '1px solid var(--border-default)', borderRadius: 7, fontSize: 11, fontWeight: 600, color: 'var(--fg-body)', cursor: 'pointer' }}>
                              {resumeSubmitting === mandate.id ? 'Submitting…' : 'Use Existing'}
                            </button>
                            <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 10px', background: 'var(--fg-primary)', borderRadius: 7, fontSize: 11, fontWeight: 600, color: 'var(--bg-surface)', cursor: 'pointer' }}>
                              <UploadCloud size={12} />Upload New
                              <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                                onChange={e => { const f = e.target.files?.[0]; if (f) submitClientResume(mandate.id, f); e.target.value = '' }}
                                disabled={resumeSubmitting === mandate.id} />
                            </label>
                          </div>
                        )}

                        {mandate.interviews?.length > 0 && (
                          <button type="button" onClick={() => setExpandedMandate(isExpanded ? null : mandate.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, background: 'transparent', border: 0, cursor: 'pointer', fontSize: 12, color: 'var(--fg-muted)', padding: 0 }}>
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {mandate.interviews.length} interview{mandate.interviews.length !== 1 ? 's' : ''}
                          </button>
                        )}
                      </div>

                      {isExpanded && mandate.interviews?.length > 0 && (
                        <div style={{ borderTop: '1px solid var(--border-default)', padding: '10px 16px', background: 'var(--bg-page)' }}>
                          {mandate.interviews.map(iv => (
                            <div key={iv.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border-default)', fontSize: 12, color: 'var(--fg-body)' }}>
                              <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 5, background: TYPE_BG[iv.type] || 'var(--bg-surface-alt)', color: TYPE_COLOR[iv.type] || 'var(--fg-muted)', fontWeight: 600 }}>{INTERVIEW_TYPE_LABEL[iv.type] || iv.type}</span>
                              {iv.scheduled_at && <span style={{ color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11 }}><Clock size={10} />{formatDate(iv.scheduled_at)}</span>}
                              {iv.location && <span style={{ color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11 }}><MapPin size={10} />{iv.location}</span>}
                              <span style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 7px', borderRadius: 5, background: iv.status === 'completed' ? 'var(--success-50)' : 'var(--bg-surface-alt)', color: iv.status === 'completed' ? 'var(--success-700)' : 'var(--fg-muted)', fontWeight: 600 }}>{iv.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Interview tips */}
          <div>
            <SectionHeading title="Interview Tips" />
            <Card>
              <div style={{ padding: '14px 16px' }}>
                {[
                  { phase: 'Before', accentColor: 'var(--brand-500)', accentBg: 'var(--brand-50)', items: ['Run device check first', 'Test your mic in a quiet room', 'Review your resume and key projects'] },
                  { phase: 'During', accentColor: 'var(--info-500)',  accentBg: 'var(--info-50)',  items: ['Stay focused — do not switch tabs', 'Speak clearly and take your time', 'Structure answers using the STAR method'] },
                  { phase: 'After',  accentColor: 'var(--success-500)', accentBg: 'var(--success-50)', items: ['Review your feedback report', 'Work on highlighted improvement areas', 'Prepare for the next round'] },
                ].map((t, i) => (
                  <div key={i} style={{ marginBottom: i < 2 ? 16 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: t.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Zap size={10} color={t.accentColor} />
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>{t.phase}</p>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 14 }}>
                      {t.items.map((item, j) => <li key={j} style={{ fontSize: 12, color: 'var(--fg-body)', lineHeight: 1.9 }}>{item}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CandidateDashboardPage
