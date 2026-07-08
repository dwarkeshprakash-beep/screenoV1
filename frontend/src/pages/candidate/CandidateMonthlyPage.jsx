import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Calendar, Clock, Play } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import * as api from '../../services/api'
import { formatDate, formatDateTime, interviewAvailability, parseStoredArray } from '../../utils/helpers'

function CandidateMonthlyPage() {
  const navigate = useNavigate()
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [launchingId, setLaunchingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getCandidateInterviews()
      setAssessments((res.data || []).filter(item => item.monthly_assessment_id))
    } catch {
      setError('Could not load monthly assessments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function launchAssessment(assessment) {
    setLaunchingId(assessment.id)
    setError(null)
    try {
      const response = await api.launchCandidateInterview(assessment.id)
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
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4, marginBottom: 0 }}>Scheduled monthly assessment links and study focus</p>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--danger-50)', color: 'var(--danger-700)', fontSize: 13, marginBottom: 20, border: '1px solid var(--danger-100)' }}>
          {error}
        </div>
      )}

      {assessments.length === 0 ? (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '40px 20px', textAlign: 'center', boxShadow: 'var(--shadow-xs)' }}>
          <BookOpen size={24} color="var(--fg-subtle)" style={{ marginBottom: 10 }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)', margin: '0 0 4px' }}>No monthly assessments</p>
          <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: 0 }}>Assigned monthly assessments will appear here with their scheduled time.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {assessments.map(assessment => {
            const availability = interviewAvailability(assessment)
            const canLaunch = ['scheduled', 'in_progress'].includes(assessment.status) && availability.canStart
            const focusAreas = parseStoredArray(assessment.context_focus_areas)
            return (
              <div key={assessment.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderLeft: '3px solid var(--info-500)', borderRadius: 10, boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>{assessment.context_title || 'Monthly Assessment'}</p>
                      <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '3px 0 0' }}>{assessment.company_name || 'Screeno'}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: 'var(--info-50)', color: 'var(--info-500)', textTransform: 'capitalize' }}>
                      {assessment.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: focusAreas.length || canLaunch ? 12 : 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
                      <Calendar size={11} />{assessment.scheduled_at ? formatDateTime(assessment.scheduled_at) : formatDate(assessment.created)}
                    </span>
                    {assessment.duration_minutes && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
                        <Clock size={11} />{assessment.duration_minutes} min
                      </span>
                    )}
                  </div>

                  {focusAreas.length > 0 && (
                    <div className="tag-list" style={{ marginBottom: canLaunch ? 12 : 0 }}>
                      {focusAreas.slice(0, 6).map(area => <span className="tag" key={area}>{area}</span>)}
                    </div>
                  )}

                  {canLaunch && (
                    <button disabled={launchingId === assessment.id} onClick={() => launchAssessment(assessment)}
                      style={{ width: '100%', padding: '9px 14px', background: 'var(--fg-primary)', border: 0, borderRadius: 7, fontSize: 12, fontWeight: 700, color: 'var(--bg-surface)', cursor: launchingId === assessment.id ? 'not-allowed' : 'pointer', opacity: launchingId === assessment.id ? 0.6 : 1 }}>
                      <Play size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                      {launchingId === assessment.id ? 'Preparing...' : 'Start Assessment'}
                    </button>
                  )}
                  {['scheduled', 'in_progress'].includes(assessment.status) && !canLaunch && availability.label && (
                    <p style={{ fontSize: 12, color: availability.state === 'expired' ? 'var(--danger-700)' : 'var(--fg-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} />{availability.label}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CandidateMonthlyPage
