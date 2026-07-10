import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Calendar, CheckCircle2, Clock, Play, XCircle } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import * as api from '../../services/api'
import { formatDateTime, parseStoredArray } from '../../utils/helpers'

const STATE_LABELS = {
  upcoming: { label: 'Upcoming', color: 'var(--fg-muted)', bg: 'var(--bg-subtle)' },
  open: { label: 'Open', color: 'var(--success-700)', bg: 'var(--success-50)' },
  completed: { label: 'Completed', color: 'var(--info-600)', bg: 'var(--info-50)' },
  expired: { label: 'Expired', color: 'var(--danger-700)', bg: 'var(--danger-50)' },
  cancelled: { label: 'Cancelled', color: 'var(--fg-subtle)', bg: 'var(--bg-subtle)' },
}

function OccurrenceRow({ occ, onLaunch, launchingId }) {
  const state = STATE_LABELS[occ.availability_state] || STATE_LABELS.upcoming
  const launching = launchingId === occ.interview_id

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      padding: '12px 16px', borderRadius: 8, background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)', marginBottom: 8,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)' }}>
            {occ.period_month
              ? new Date(occ.period_month + 'T00:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
              : '—'}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 5,
            background: state.bg, color: state.color,
          }}>
            {state.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {occ.available_from && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
              <Calendar size={11} />Opens {formatDateTime(occ.available_from)}
            </span>
          )}
          {occ.due_at && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
              <Clock size={11} />Due {formatDateTime(occ.due_at)}
            </span>
          )}
          {occ.duration_minutes && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
              {occ.duration_minutes} min
            </span>
          )}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {occ.can_launch && (
          <button
            onClick={() => onLaunch(occ.interview_id)}
            disabled={launching}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', background: 'var(--fg-primary)', border: 0,
              borderRadius: 7, fontSize: 12, fontWeight: 700, color: 'var(--bg-surface)',
              cursor: launching ? 'not-allowed' : 'pointer', opacity: launching ? 0.6 : 1,
            }}
          >
            <Play size={12} />
            {launching ? 'Preparing…' : 'Start'}
          </button>
        )}
        {occ.availability_state === 'completed' && (
          <CheckCircle2 size={18} color="var(--success-600)" />
        )}
        {occ.availability_state === 'cancelled' && (
          <XCircle size={18} color="var(--fg-subtle)" />
        )}
      </div>
    </div>
  )
}

function PlanCard({ plan, onLaunch, launchingId }) {
  const [expanded, setExpanded] = useState(false)
  const topics = parseStoredArray(plan.sub_topics)
  const completedCount = (plan.occurrences || []).filter(o => o.availability_state === 'completed').length
  const total = plan.duration_months || (plan.occurrences || []).length
  const nextOpen = (plan.occurrences || []).find(o => o.can_launch)
  const hasOpen = !!nextOpen

  return (
    <div style={{
      background: 'var(--bg-surface)', border: `1px solid ${hasOpen ? 'var(--success-300)' : 'var(--border-default)'}`,
      borderLeft: `3px solid ${hasOpen ? 'var(--success-500)' : 'var(--info-500)'}`,
      borderRadius: 10, boxShadow: 'var(--shadow-xs)',
    }}>
      <div style={{ padding: '16px 18px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>
              {plan.subject_name || 'Monthly Assessment'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '3px 0 0' }}>
              {plan.company_name || 'Your organization'} · {total} month plan
            </p>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap',
            background: hasOpen ? 'var(--success-50)' : 'var(--info-50)',
            color: hasOpen ? 'var(--success-700)' : 'var(--info-600)',
            textTransform: 'capitalize',
          }}>
            {hasOpen ? 'Assessment Open' : `${completedCount}/${total} done`}
          </span>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ height: 4, borderRadius: 4, background: 'var(--border-default)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: 'var(--info-500)', width: `${Math.round((completedCount / total) * 100)}%`,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <p style={{ fontSize: 11, color: 'var(--fg-subtle)', margin: '4px 0 0' }}>
              {completedCount} of {total} occurrences completed
            </p>
          </div>
        )}

        {/* Study topics */}
        {topics.length > 0 && (
          <div className="tag-list" style={{ marginBottom: 12 }}>
            {topics.slice(0, 6).map(area => <span className="tag" key={area}>{area}</span>)}
          </div>
        )}

        {/* Occurrences toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 12, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 4,
            marginBottom: expanded ? 12 : 0,
          }}
        >
          {expanded ? '▲ Hide schedule' : '▼ Show monthly schedule'}
        </button>

        {expanded && (
          <div>
            {(plan.occurrences || []).map(occ => (
              <OccurrenceRow
                key={occ.id}
                occ={occ}
                onLaunch={onLaunch}
                launchingId={launchingId}
              />
            ))}
            {(plan.occurrences || []).length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>No occurrences scheduled yet.</p>
            )}
          </div>
        )}

        {/* Quick-launch the currently open occurrence */}
        {nextOpen && !expanded && (
          <button
            disabled={launchingId === nextOpen.interview_id}
            onClick={() => onLaunch(nextOpen.interview_id)}
            style={{
              width: '100%', padding: '9px 14px', background: 'var(--fg-primary)', border: 0,
              borderRadius: 7, fontSize: 12, fontWeight: 700, color: 'var(--bg-surface)',
              cursor: launchingId === nextOpen.interview_id ? 'not-allowed' : 'pointer',
              opacity: launchingId === nextOpen.interview_id ? 0.6 : 1, marginTop: 10,
            }}
          >
            <Play size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
            {launchingId === nextOpen.interview_id ? 'Preparing…' : 'Start This Month\'s Assessment'}
          </button>
        )}
      </div>
    </div>
  )
}

function CandidateMonthlyPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [launchingId, setLaunchingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getCandidateMonthlyAssessments()
      setPlans(res.data || [])
    } catch {
      setError('Could not load monthly assessments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function launchAssessment(interviewId) {
    setLaunchingId(interviewId)
    setError(null)
    try {
      const response = await api.launchCandidateInterview(interviewId)
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
    } catch (err) {
      setError(err.message || 'Could not launch this assessment.')
    } finally {
      setLaunchingId(null)
    }
  }

  if (loading) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>

  return (
    <div style={{ padding: '1.5rem 1.75rem', maxWidth: '52rem', margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-primary)', letterSpacing: '-0.02em', margin: 0 }}>Monthly Assessments</h1>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4, marginBottom: 0 }}>
          Your recurring assessment plans, schedules, and study focus areas
        </p>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--danger-50)', color: 'var(--danger-700)', fontSize: 13, marginBottom: 20, border: '1px solid var(--danger-100)' }}>
          {error}
        </div>
      )}

      {plans.length === 0 ? (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '40px 20px', textAlign: 'center', boxShadow: 'var(--shadow-xs)' }}>
          <BookOpen size={24} color="var(--fg-subtle)" style={{ marginBottom: 10 }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)', margin: '0 0 4px' }}>No monthly assessments</p>
          <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: 0 }}>Your manager will assign monthly assessment plans here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {plans.map(plan => (
            <PlanCard
              key={plan.enrollment_id}
              plan={plan}
              onLaunch={launchAssessment}
              launchingId={launchingId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default CandidateMonthlyPage
