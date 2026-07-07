import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Calendar, CheckCircle2, BriefcaseBusiness, Clock, Play, ArrowRight, Lightbulb } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import * as api from '../../services/api'
import { formatDate, parseStoredArray } from '../../utils/helpers'

const INTERVIEW_TYPE_LABEL = {
  ai_voice: 'AI Voice', exam: 'Coding Exam', human: 'Video Interview',
  offline: 'Offline Interview', client: 'Client Interview',
}
const TYPE_COLOR = { ai_voice: 'var(--brand-500)', exam: 'var(--info-500)', human: 'var(--success-500)', offline: 'var(--warning-500)' }
const TYPE_BG    = { ai_voice: 'var(--brand-50)',  exam: 'var(--info-50)',  human: 'var(--success-50)', offline: 'var(--warning-50)' }

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

function CandidateOverviewPage() {
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState([])
  const [clientMandates, setClientMandates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [launchingId, setLaunchingId] = useState(null)
  const [latestReport, setLatestReport] = useState(null)

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [interviewRes, profileRes, mandateRes, reportRes] = await Promise.all([
        api.getCandidateInterviews(),
        api.getProfile(),
        api.getCandidateClientMandates().catch(() => ({ data: [] })),
        api.getCandidateOwnReport().catch(() => ({ data: null })),
      ])
      setInterviews(interviewRes.data || [])
      setClientMandates(mandateRes.data || [])
      setLatestReport(reportRes.data || null)
      const profile = profileRes.data || {}
      let stored = {}
      try { stored = JSON.parse(localStorage.getItem('user') || '{}') } catch { stored = {} }
      localStorage.setItem('user', JSON.stringify({ ...stored, ...profile }))
    } catch { setError('Could not load your overview.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  async function launchInterview(interview) {
    setLaunchingId(interview.id)
    try {
      const response = await api.launchCandidateInterview(interview.id)
      const launch = response.data
      localStorage.setItem('interviewAccessToken', launch.sessionToken)
      localStorage.setItem('interviewSession', JSON.stringify({
        interviewId: launch.interview.id,
        token: launch.launchToken,
        type: launch.interview.type,
        mode: launch.interview.interviewMode,
        candidateName: launch.interview.candidateName,
        sessionToken: launch.sessionToken,
      }))
      navigate(`/interview/${launch.launchToken}/device-check`)
    } catch (err) { setError(err.message || 'Could not launch this interview.') }
    finally { setLaunchingId(null) }
  }

  const upcoming = interviews.filter(i => ['scheduled', 'in_progress'].includes(i.status) && i.type !== 'offline' && i.type !== 'client')
  const completed = interviews.filter(i => i.status === 'completed')
  const feedbackTips = parseStoredArray(latestReport?.strengths)
  const firstName = user.first_name || user.name?.split(' ')[0] || 'there'
  const initials = [user.first_name, user.last_name].filter(Boolean).map(n => n[0]?.toUpperCase()).join('') || firstName[0]?.toUpperCase() || '?'
  const nextLaunchable = upcoming.find(i => i.type === 'ai_voice' || i.type === 'exam')

  if (loading) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>

  return (
    <div style={{ padding: '1.5rem 1.75rem', maxWidth: '72rem', margin: '0 auto' }}>

      {/* Greeting */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{initials}</span>
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

      {/* Next-up spotlight */}
      {nextLaunchable && (
        <div style={{ background: 'linear-gradient(135deg, var(--brand-50) 0%, var(--bg-surface) 100%)', border: '1px solid var(--brand-200)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Play size={18} color="white" />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-600)', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ready to Start</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>{nextLaunchable.context_title || nextLaunchable.job_title || 'Interview'}</p>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '2px 0 0' }}>
                {INTERVIEW_TYPE_LABEL[nextLaunchable.type]} · {formatDate(nextLaunchable.scheduled_at || nextLaunchable.created)}
              </p>
            </div>
          </div>
          <button onClick={() => launchInterview(nextLaunchable)} disabled={launchingId === nextLaunchable.id}
            style={{ padding: '10px 22px', background: 'var(--brand-500)', border: 0, borderRadius: 8, fontSize: 13, fontWeight: 700, color: 'white', cursor: launchingId === nextLaunchable.id ? 'not-allowed' : 'pointer', opacity: launchingId === nextLaunchable.id ? 0.7 : 1, flexShrink: 0 }}>
            {launchingId === nextLaunchable.id ? 'Preparing…' : 'Start Now →'}
          </button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))', gap: '0.875rem', marginBottom: '1.75rem' }}>
        <StatCard icon={Calendar}          label="Upcoming"  value={upcoming.length}       sub="Scheduled interviews"  accentBg="var(--brand-50)"   accentColor="var(--brand-500)" />
        <StatCard icon={CheckCircle2}      label="Completed" value={completed.length}       sub="Interviews finished"   accentBg="var(--success-50)" accentColor="var(--success-500)" />
        <StatCard icon={Lightbulb}         label="Feedback"  value={latestReport ? 'Ready' : 'Pending'} sub="Improvement tips" accentBg="var(--warning-50)" accentColor="var(--warning-500)" />
        <StatCard icon={BriefcaseBusiness} label="Mandates"  value={clientMandates.length} sub="Client opportunities"  accentBg="var(--info-50)"    accentColor="var(--info-500)" />
      </div>

      {latestReport && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '16px 18px', marginBottom: '1.75rem', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
            <Lightbulb size={15} color="var(--warning-500)" />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>Latest Feedback</h2>
          </div>
          {latestReport.summary && (
            <p style={{ fontSize: 13, color: 'var(--fg-body)', lineHeight: 1.6, margin: '0 0 10px' }}>{latestReport.summary}</p>
          )}
          {feedbackTips.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {feedbackTips.slice(0, 5).map(tip => (
                <span key={tip} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 999, background: 'var(--warning-50)', color: 'var(--warning-700)', fontWeight: 600 }}>
                  {tip}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming preview */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>Upcoming Interviews</h2>
        <Link to="/candidate/interviews"
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-500)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '32px 20px', textAlign: 'center', boxShadow: 'var(--shadow-xs)' }}>
          <Calendar size={22} color="var(--fg-subtle)" style={{ marginBottom: 10 }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)', margin: '0 0 4px' }}>No upcoming interviews</p>
          <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: 0 }}>Your manager will schedule interviews and they'll appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {upcoming.slice(0, 3).map(u => {
            const tColor = TYPE_COLOR[u.type] || 'var(--border-strong)'
            const tBg    = TYPE_BG[u.type]    || 'var(--bg-surface-alt)'
            const canLaunch = u.type === 'ai_voice' || u.type === 'exam'
            return (
              <div key={u.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderLeft: `3px solid ${tColor}`, borderRadius: 10, boxShadow: 'var(--shadow-xs)', overflow: 'hidden' }}>
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
                    {u.difficulty && (
                      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: 'var(--bg-surface-alt)', color: 'var(--fg-muted)', fontWeight: 500, textTransform: 'capitalize' }}>
                        {u.difficulty}
                      </span>
                    )}
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
              </div>
            )
          })}
          {upcoming.length > 3 && (
            <Link to="/candidate/interviews"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 13, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, fontSize: 13, fontWeight: 600, color: 'var(--fg-muted)', textDecoration: 'none', boxShadow: 'var(--shadow-xs)' }}>
              View {upcoming.length - 3} more interview{upcoming.length - 3 !== 1 ? 's' : ''} <ArrowRight size={13} />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

export default CandidateOverviewPage
