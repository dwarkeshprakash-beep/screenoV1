import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, MapPin } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import * as api from '../../services/api'
import { formatDate, formatDateTime, interviewAvailability } from '../../utils/helpers'

const INTERVIEW_TYPE_LABEL = {
  ai_voice: 'AI Voice', exam: 'Coding Exam', human: 'Video Interview',
  offline: 'Offline Interview', client: 'Client Interview',
}
const TYPE_COLOR = { ai_voice: 'var(--brand-500)', exam: 'var(--info-500)', human: 'var(--success-500)', offline: 'var(--warning-500)' }
const TYPE_BG    = { ai_voice: 'var(--brand-50)',  exam: 'var(--info-50)',  human: 'var(--success-50)', offline: 'var(--warning-50)' }

function InterviewCard({ iv, onLaunch, launchingId }) {
  const tColor = TYPE_COLOR[iv.type] || 'var(--border-strong)'
  const tBg    = TYPE_BG[iv.type]    || 'var(--bg-surface-alt)'
  const availability = interviewAvailability(iv)
  const launchableType = iv.type === 'ai_voice' || iv.type === 'exam'
  const canLaunch = launchableType && ['scheduled', 'in_progress'].includes(iv.status) && availability.canStart

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderLeft: `3px solid ${tColor}`, borderRadius: 10, boxShadow: 'var(--shadow-xs)' }}>
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {iv.context_title || iv.job_title || 'Interview'}
            </p>
            {iv.company_name && <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '2px 0 0' }}>{iv.company_name}</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: tBg, color: tColor }}>
              {INTERVIEW_TYPE_LABEL[iv.type] || iv.type}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: canLaunch ? 12 : 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
            <Clock size={11} />{iv.scheduled_at ? formatDateTime(iv.scheduled_at) : formatDate(iv.created)}
          </span>
          {iv.location && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
              <MapPin size={11} />{iv.location}
            </span>
          )}
          {iv.difficulty && (
            <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: 'var(--bg-surface-alt)', color: 'var(--fg-muted)', fontWeight: 500, textTransform: 'capitalize' }}>
              {iv.difficulty}
            </span>
          )}
        </div>

        {canLaunch && (
          <button disabled={launchingId === iv.id} onClick={() => onLaunch(iv)}
            style={{ width: '100%', padding: '9px 14px', background: 'var(--fg-primary)', border: 0, borderRadius: 7, fontSize: 12, fontWeight: 700, color: 'var(--bg-surface)', cursor: launchingId === iv.id ? 'not-allowed' : 'pointer', opacity: launchingId === iv.id ? 0.6 : 1 }}>
            {launchingId === iv.id ? 'Preparing…' : 'Start Interview'}
          </button>
        )}
        {launchableType && ['scheduled', 'in_progress'].includes(iv.status) && !canLaunch && availability.label && (
          <p style={{ fontSize: 12, color: availability.state === 'expired' ? 'var(--danger-700)' : 'var(--fg-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} />{availability.label}
          </p>
        )}
        {iv.type === 'human' && ['scheduled', 'in_progress'].includes(iv.status) && (
          <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} />Your interviewer will share the video link via email.
          </p>
        )}
      </div>
    </div>
  )
}

function CandidateInterviewsPage() {
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [launchingId, setLaunchingId] = useState(null)
  const [tab, setTab] = useState('upcoming')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getCandidateInterviews()
      setInterviews(res.data || [])
    } catch { setError('Could not load interviews.') }
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
        durationMinutes: launch.interview.durationMinutes,
        scheduledAt: launch.interview.scheduledAt,
        candidateName: launch.interview.candidateName,
        sessionToken: launch.sessionToken,
      }))
      navigate(`/interview/${launch.launchToken}/device-check`)
    } catch (err) { setError(err.message || 'Could not launch interview.') }
    finally { setLaunchingId(null) }
  }

  const upcoming  = interviews.filter(i => ['scheduled', 'in_progress'].includes(i.status) && i.type !== 'offline' && i.type !== 'client')
  const completed = interviews.filter(i => i.status === 'completed')
  const inPerson  = interviews.filter(i => i.type === 'offline')

  const TABS = [
    { key: 'upcoming',  label: 'Upcoming',  count: upcoming.length },
    { key: 'completed', label: 'Completed', count: completed.length },
    { key: 'inperson',  label: 'In-Person', count: inPerson.length },
  ]

  const activeList = tab === 'upcoming' ? upcoming : tab === 'completed' ? completed : inPerson
  const EMPTY_MESSAGES = {
    upcoming:  { title: 'No upcoming interviews', sub: 'Your manager will schedule interviews and they\'ll appear here.' },
    completed: { title: 'No completed interviews yet', sub: 'Finished interviews will show up here with feedback status.' },
    inperson:  { title: 'No in-person interviews', sub: 'Offline interviews scheduled for you will appear here.' },
  }

  if (loading) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>

  return (
    <div style={{ padding: '1.5rem 1.75rem', maxWidth: '52rem', margin: '0 auto' }}>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-primary)', letterSpacing: '-0.02em', margin: 0 }}>Interviews</h1>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4, marginBottom: 0 }}>All your scheduled and completed interviews</p>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--danger-50)', color: 'var(--danger-700)', fontSize: 13, marginBottom: 20, border: '1px solid var(--danger-100)' }}>
          {error}
        </div>
      )}

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, marginBottom: 20, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            style={{ padding: '7px 14px', borderRadius: 8, border: 0, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: tab === t.key ? 'var(--brand-500)' : 'transparent', color: tab === t.key ? 'white' : 'var(--fg-muted)' }}>
            {t.label}
            <span style={{ fontSize: 11, padding: '1px 5px', borderRadius: 4, fontWeight: 600, background: tab === t.key ? 'rgba(255,255,255,0.22)' : 'var(--bg-surface-alt)', color: tab === t.key ? 'white' : 'var(--fg-subtle)' }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Interview list */}
      {activeList.length === 0 ? (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '40px 20px', textAlign: 'center', boxShadow: 'var(--shadow-xs)' }}>
          <Calendar size={22} color="var(--fg-subtle)" style={{ marginBottom: 10 }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)', margin: '0 0 4px' }}>{EMPTY_MESSAGES[tab].title}</p>
          <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: 0 }}>{EMPTY_MESSAGES[tab].sub}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeList.map(iv => (
            <InterviewCard key={iv.id} iv={iv} onLaunch={launchInterview} launchingId={launchingId} />
          ))}
        </div>
      )}
    </div>
  )
}

export default CandidateInterviewsPage
