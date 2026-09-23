import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Users, CheckSquare, CalendarPlus, Play, ArrowRight, Clock } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import Button from '../../components/shared/Button'
import * as api from '../../services/api'
import { formatDate, formatDateTime, interviewAvailability } from '../../utils/helpers'
import { useAccess } from '../../context/AccessContext'

const card = { background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }

const INTERVIEW_TYPE_LABEL = {
  ai_voice: 'AI Voice', exam: 'Coding Exam', human: 'Video Interview',
  offline: 'Offline Interview', client: 'Client Interview',
}

// Every logged-in user lands here, regardless of which modules their role has -
// each section below only renders (and only fetches its data) if the caller has
// the module it's built on, so this page is never blank and never team-only.
function DashboardPage() {
  const navigate = useNavigate()
  const { hasModule, loading: accessLoading } = useAccess()
  const showTeam = hasModule('team')
  const showInterviews = hasModule('interviews')

  const [stats, setStats]       = useState(null)
  const [activity, setActivity] = useState([])
  const [teamLoading, setTeamLoading] = useState(true)
  const [teamError, setTeamError]     = useState(null)

  const [interviews, setInterviews]     = useState([])
  const [launchingId, setLaunchingId]   = useState(null)
  const [interviewsLoading, setInterviewsLoading] = useState(true)
  const [interviewsError, setInterviewsError]     = useState(null)

  const loadTeam = useCallback(async () => {
    setTeamLoading(true)
    setTeamError(null)
    try {
      const [statsRes, activityRes] = await Promise.all([
        api.getTeamStats(),
        api.getTeamActivity(),
      ])
      setStats(statsRes.data)
      setActivity(activityRes.data || [])
    } catch {
      setTeamError('Could not load dashboard. Please try again.')
    } finally {
      setTeamLoading(false)
    }
  }, [])

  const loadInterviews = useCallback(async () => {
    setInterviewsLoading(true)
    setInterviewsError(null)
    try {
      const res = await api.getCandidateInterviews()
      setInterviews(res.data || [])
    } catch {
      setInterviewsError('Could not load your interviews.')
    } finally {
      setInterviewsLoading(false)
    }
  }, [])

  useEffect(() => { if (!accessLoading && showTeam) void loadTeam() }, [accessLoading, showTeam, loadTeam])
  useEffect(() => { if (!accessLoading && showInterviews) void loadInterviews() }, [accessLoading, showInterviews, loadInterviews])

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
        durationMinutes: launch.interview.durationMinutes,
        scheduledAt: launch.interview.scheduledAt,
        candidateName: launch.interview.candidateName,
        sessionToken: launch.sessionToken,
      }))
      navigate(`/interview/${launch.launchToken}/device-check`)
    } catch (err) { setInterviewsError(err.message || 'Could not launch this interview.') }
    finally { setLaunchingId(null) }
  }

  if (accessLoading) return <Spinner center />

  const statCards = [
    { icon: Users,        bg: 'var(--brand-50)', color: 'var(--brand-500)', value: stats?.totalMembers ?? '-',        label: 'Team members',         link: 'View team →',  to: '/workspace/team' },
    { icon: CheckSquare,  bg: 'var(--success-50)', color: 'var(--success-500)', value: stats?.candidatesEvaluated ?? '-', label: 'Interviews completed',  link: 'This quarter', to: null },
    { icon: CalendarPlus, bg: 'var(--warning-50)', color: 'var(--warning-500)', value: stats?.pendingScorecard ?? '-',    label: 'Pending scorecards',    link: 'Review now →', to: '/workspace/reports' },
  ]

  const upcoming = interviews.filter(i => ['scheduled', 'in_progress'].includes(i.status) && i.type !== 'offline' && i.type !== 'client')
  const launchableUpcoming = upcoming.filter(i => i.type === 'ai_voice' || i.type === 'exam')
  const nextLaunchable = launchableUpcoming.find(i => interviewAvailability(i).canStart)
    || launchableUpcoming.find(i => interviewAvailability(i).state !== 'expired')
    || launchableUpcoming[0]
  const nextAvailability = nextLaunchable ? interviewAvailability(nextLaunchable) : null

  return (
    <div className="workspace-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, minHeight: 0 }}>

      {!showTeam && !showInterviews && (
        <div style={{ ...card, textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-bold)', color: 'var(--fg-primary)', margin: '0 0 0.375rem' }}>Welcome</h2>
          <p style={{ color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)', margin: 0 }}>Nothing's assigned to your role yet - check with your admin if you're expecting to see something here.</p>
        </div>
      )}

      {showInterviews && (
        <>
          {interviewsError && <ErrorMessage message={interviewsError} />}
          {interviewsLoading ? <Spinner center /> : (
            <>
              {nextLaunchable && (
                <div style={{ background: 'linear-gradient(135deg, var(--brand-50) 0%, var(--bg-surface) 100%)', border: '1px solid var(--brand-200)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Play size={18} color="white" />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-600)', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {nextAvailability?.canStart ? 'Ready to Start' : nextAvailability?.state === 'expired' ? 'Expired' : 'Scheduled'}
                      </p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>{nextLaunchable.context_title || nextLaunchable.job_title || 'Interview'}</p>
                      <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '2px 0 0' }}>
                        {INTERVIEW_TYPE_LABEL[nextLaunchable.type]} · {nextLaunchable.scheduled_at ? formatDateTime(nextLaunchable.scheduled_at) : formatDate(nextLaunchable.created)}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => launchInterview(nextLaunchable)} disabled={launchingId === nextLaunchable.id || !nextAvailability?.canStart}
                    style={{ padding: '10px 22px', background: nextAvailability?.canStart ? 'var(--brand-500)' : 'var(--slate-300)', border: 0, borderRadius: 8, fontSize: 13, fontWeight: 700, color: 'white', cursor: launchingId === nextLaunchable.id || !nextAvailability?.canStart ? 'not-allowed' : 'pointer', opacity: launchingId === nextLaunchable.id ? 0.7 : 1, flexShrink: 0 }}>
                    {launchingId === nextLaunchable.id ? 'Preparing…' : 'Start Now →'}
                  </button>
                </div>
              )}

              <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-bold)', color: 'var(--fg-primary)' }}>Upcoming Interviews</div>
                  <Link to="/workspace/interviews" style={{ fontSize: 'var(--fs-xs)', color: 'var(--brand-500)', fontWeight: 'var(--fw-medium)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    View all <ArrowRight size={12} />
                  </Link>
                </div>
                {upcoming.length === 0 ? (
                  <p style={{ color: 'var(--fg-subtle)', fontSize: 13, textAlign: 'center', padding: '20px 0', margin: 0 }}>No upcoming interviews.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {upcoming.slice(0, 3).map(u => (
                      <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, background: 'var(--bg-surface-alt)' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)' }}>{u.context_title || u.job_title || 'Interview'}</div>
                          <div style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Clock size={11} />{u.scheduled_at ? formatDateTime(u.scheduled_at) : formatDate(u.created)}
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)' }}>{INTERVIEW_TYPE_LABEL[u.type] || u.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {showTeam && (
        teamLoading ? <Spinner center /> : teamError ? <ErrorMessage message={teamError} /> : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-bold)', color: 'var(--fg-primary)', margin: '0 0 0.25rem', letterSpacing: 'var(--tracking-tight)' }}>Hiring operations</h2>
                <p style={{ color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)', margin: 0 }}>Track your team's assessment progress and hiring activity.</p>
              </div>
              <Button onClick={() => navigate('/workspace/team')}>
                <Users size={14} /> My Team
              </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))', gap: '0.875rem' }}>
              {statCards.map((s, i) => (
                <div
                  key={i}
                  style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, padding: 18, cursor: s.to ? 'pointer' : 'default' }}
                  onClick={() => s.to && navigate(s.to)}
                >
                  <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.625rem', background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <s.icon size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'var(--fw-bold)', color: 'var(--fg-primary)', letterSpacing: 'var(--tracking-tight)', lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-muted)', marginTop: '0.1875rem' }}>{s.label}</div>
                    {s.to && <span style={{ color: 'var(--brand-500)', fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-medium)', marginTop: '0.25rem', display: 'block' }}>{s.link}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1rem', flex: 1, minHeight: 0, maxHeight: '50vh' }}>
              <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-bold)', color: 'var(--fg-primary)' }}>Assessment Flow</div>
                  <span onClick={() => navigate('/workspace/team')} style={{ fontSize: 'var(--fs-xs)', color: 'var(--brand-500)', fontWeight: 'var(--fw-medium)', cursor: 'pointer' }}>View Team →</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', gap: '0.75rem' }}>
                  {[
                    ['1', 'Add team members', 'Create or import internal candidates.'],
                    ['2', 'Schedule assessments', 'Send AI voice or exam invites.'],
                    ['3', 'Review reports', 'Use completed attempts and scorecards for decisions.'],
                  ].map(([num, title, text]) => (
                    <div key={num} style={{ border: '1px solid var(--slate-100)', borderRadius: 'var(--radius-md)', padding: '0.875rem', background: 'var(--bg-page)' }}>
                      <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: 'var(--radius-full)', background: 'var(--brand-50)', color: 'var(--brand-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-bold)' }}>{num}</div>
                      <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', color: 'var(--fg-primary)', marginTop: '0.625rem' }}>{title}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-muted)', lineHeight: 'var(--lh-normal)', marginTop: '0.25rem' }}>{text}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...card, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', marginBottom: 14, flexShrink: 0 }}>Hiring Activity</div>
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  {activity.length === 0 ? (
                    <div style={{ color: 'var(--slate-400)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No recent activity.</div>
                  ) : activity.map((a, i) => (
                    <div key={i} style={{ borderTop: i === 0 ? '0' : '1px solid var(--slate-100)', padding: '12px 0' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--slate-900)' }}>{a.what}</div>
                      <div style={{ fontSize: 12, color: 'var(--brand-500)', marginTop: 2 }}>{a.sub}</div>
                      <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 2 }}>{formatDate(a.when)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )
      )}
    </div>
  )
}

export default DashboardPage
