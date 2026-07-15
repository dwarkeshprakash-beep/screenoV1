import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, MapPin, Search } from 'lucide-react'
import InterviewerAssignmentsPanel from '../../components/shared/InterviewerAssignmentsPanel'
import Spinner from '../../components/shared/Spinner'
import * as api from '../../services/api'
import { formatDate, formatDateTime, interviewAvailability } from '../../utils/helpers'

const INTERVIEW_TYPE_LABEL = {
  ai_voice: 'AI Voice', exam: 'Coding Exam', human: 'Video Interview',
  offline: 'Offline Interview', client: 'Client Interview',
}
const TYPE_COLOR = { ai_voice: 'var(--brand-500)', exam: 'var(--info-500)', human: 'var(--success-500)', offline: 'var(--warning-500)' }
const TYPE_BG = { ai_voice: 'var(--brand-50)', exam: 'var(--info-50)', human: 'var(--success-50)', offline: 'var(--warning-50)' }

function InterviewCard({ interview, onLaunch, onJoinHuman, launchingId }) {
  const color = TYPE_COLOR[interview.type] || 'var(--border-strong)'
  const background = TYPE_BG[interview.type] || 'var(--bg-surface-alt)'
  const availability = interviewAvailability(interview)
  const launchable = interview.type === 'ai_voice' || interview.type === 'exam'
  const canLaunch = launchable && ['scheduled', 'in_progress'].includes(interview.status) && availability.canStart
  const canJoinHuman = interview.type === 'human' && ['scheduled', 'in_progress'].includes(interview.status) && availability.canStart
  const awaitingInterviewerFeedback = ['human', 'offline'].includes(interview.type)
    && ['scheduled', 'in_progress'].includes(interview.status)
    && availability.state === 'expired'

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderLeft: `3px solid ${color}`, borderRadius: 10, boxShadow: 'var(--shadow-xs)', padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>{interview.context_title || interview.job_title || 'Interview'}</p>
          {interview.company_name && <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '2px 0 0' }}>{interview.company_name}</p>}
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background, color }}>{INTERVIEW_TYPE_LABEL[interview.type] || interview.type}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: canLaunch || canJoinHuman ? 12 : 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}><Clock size={11} />{interview.scheduled_at ? formatDateTime(interview.scheduled_at) : formatDate(interview.created)}</span>
        {interview.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}><MapPin size={11} />{interview.location}</span>}
        <span className={`status-pill${interview.status === 'completed' ? ' status-pill--success' : ' status-pill--brand'}`}>{interview.status}</span>
        {interview.candidate_result && (
          <span className={`status-pill${interview.candidate_result === 'pass' ? ' status-pill--success' : ' status-pill--danger'}`}>
            Result: {interview.candidate_result === 'pass' ? 'Passed' : 'Failed'}
          </span>
        )}
      </div>
      {canLaunch && <button disabled={launchingId === interview.id} onClick={() => onLaunch(interview)} className="product-button product-button--primary product-button--md" style={{ width: '100%' }}>{launchingId === interview.id ? 'Preparing…' : 'Start Interview'}</button>}
      {canJoinHuman && <button disabled={launchingId === interview.id} onClick={() => onJoinHuman(interview)} className="product-button product-button--secondary product-button--md" style={{ width: '100%' }}>{launchingId === interview.id ? 'Joining…' : 'Join Meeting'}</button>}
      {launchable && ['scheduled', 'in_progress'].includes(interview.status) && !canLaunch && availability.label && <p style={{ fontSize: 12, color: availability.state === 'expired' ? 'var(--danger-700)' : 'var(--fg-muted)', margin: 0 }}><Clock size={11} /> {availability.label}</p>}
      {awaitingInterviewerFeedback && <p style={{ fontSize: 12, color: 'var(--warning-700)', margin: 0 }}><Clock size={11} /> Interview completed. Awaiting interviewer feedback.</p>}
      {interview.type === 'human' && ['scheduled', 'in_progress'].includes(interview.status) && !canJoinHuman && !awaitingInterviewerFeedback && <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>Meeting link will be active closer to the scheduled time.</p>}
    </div>
  )
}

function CandidateInterviewsPage() {
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState([])
  const [assignments, setAssignments] = useState([])
  const [section, setSection] = useState('interviews')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [resultFilter, setResultFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [launchingId, setLaunchingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const interviewResponse = await api.getCandidateInterviews()
      setInterviews(interviewResponse.data || [])
      try {
        const assignmentResponse = await api.getMyInterviewerAssignments()
        setAssignments(assignmentResponse.data || [])
      } catch (assignmentError) {
        console.error('Could not load interviewer assignments', assignmentError)
        setAssignments([])
      }
    } catch {
      setError('Could not load interviews.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const refreshOnFocus = () => { void load() }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [load])

  async function launchInterview(interview) {
    setLaunchingId(interview.id)
    try {
      const response = await api.launchCandidateInterview(interview.id)
      const launch = response.data
      localStorage.setItem('interviewAccessToken', launch.sessionToken)
      localStorage.setItem('interviewSession', JSON.stringify({
        interviewId: launch.interview.id, token: launch.launchToken,
        type: launch.interview.type, mode: launch.interview.interviewMode,
        durationMinutes: launch.interview.durationMinutes, scheduledAt: launch.interview.scheduledAt,
        candidateName: launch.interview.candidateName, sessionToken: launch.sessionToken,
      }))
      navigate(`/interview/${launch.launchToken}/device-check`)
    } catch (err) {
      setError(err.message || 'Could not launch interview.')
    } finally {
      setLaunchingId(null)
    }
  }

  async function joinHumanInterview(interview) {
    setLaunchingId(interview.id)
    try {
      const response = await api.joinCandidateInterview(interview.id)
      if (response.data?.meetingUrl) window.open(response.data.meetingUrl, '_blank')
      else setError('No meeting link available.')
    } catch (err) {
      setError(err.message || 'Could not join meeting.')
    } finally {
      setLaunchingId(null)
    }
  }

  const visibleInterviews = interviews.filter(interview => {
    if (filter === 'in_person') return interview.type === 'offline'
    if (filter === 'upcoming') return ['scheduled', 'in_progress'].includes(interview.status)
    if (filter === 'completed') return interview.status === 'completed'
    return interview.status !== 'cancelled'
  }).filter(interview => {
    const normalizedQuery = query.trim().toLowerCase()
    const matchesQuery = !normalizedQuery || [interview.context_title, interview.job_title, interview.company_name]
      .some(value => String(value || '').toLowerCase().includes(normalizedQuery))
    const matchesType = typeFilter === 'all' || interview.type === typeFilter
    const matchesResult = resultFilter === 'all' || interview.candidate_result === resultFilter
    return matchesQuery && matchesType && matchesResult
  })
  const filters = [
    ['all', 'All'], ['in_person', 'In person'], ['upcoming', 'Upcoming'], ['completed', 'Completed'],
  ]

  if (loading) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>

  return (
    <div style={{ padding: '1.5rem 1.75rem', maxWidth: '52rem', margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}><h1 style={{ fontSize: 20, margin: 0 }}>Interviews</h1><p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>Your interviews and interviews assigned for you to conduct</p></div>
      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--danger-50)', color: 'var(--danger-700)', marginBottom: 20 }}>{error}</div>}
      <div className="workspace-tabs" style={{ width: 'fit-content', marginBottom: 16 }}>
        <button className={`workspace-tabs__button${section === 'interviews' ? ' is-active' : ''}`} onClick={() => setSection('interviews')}>Interviews</button>
        <button className={`workspace-tabs__button${section === 'conducting' ? ' is-active' : ''}`} onClick={() => setSection('conducting')}>I’m Interviewing ({assignments.filter(item => item.status !== 'completed').length})</button>
      </div>
      {section === 'interviews' ? (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>{filters.map(([value, label]) => <button key={value} className={`product-button product-button--sm ${filter === value ? 'product-button--primary' : 'product-button--secondary'}`} onClick={() => setFilter(value)}>{label}</button>)}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
            <label style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--fg-subtle)' }} />
              <input className="form-input" style={{ paddingLeft: 34 }} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search client or role..." />
            </label>
            <select className="form-input" value={typeFilter} onChange={event => setTypeFilter(event.target.value)} aria-label="Interview type">
              <option value="all">All types</option><option value="ai_voice">AI Voice</option><option value="exam">Exam</option><option value="human">Video</option><option value="offline">In person</option>
            </select>
            <select className="form-input" value={resultFilter} onChange={event => setResultFilter(event.target.value)} aria-label="Interview result">
              <option value="all">All results</option><option value="pass">Passed</option><option value="fail">Failed</option>
            </select>
          </div>
          {visibleInterviews.length === 0 ? <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, padding: 40, textAlign: 'center' }}><Calendar size={22} color="var(--fg-subtle)" /><p>No interviews in this filter.</p></div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{visibleInterviews.map(interview => <InterviewCard key={interview.id} interview={interview} onLaunch={launchInterview} onJoinHuman={joinHumanInterview} launchingId={launchingId} />)}</div>}
        </>
      ) : <InterviewerAssignmentsPanel assignments={assignments} onCompleted={load} />}
    </div>
  )
}

export default CandidateInterviewsPage
