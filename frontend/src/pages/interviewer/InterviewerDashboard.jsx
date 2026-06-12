import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Video, CheckSquare, AlertCircle, CalendarDays } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import * as api from '../../services/api'
import { formatDate, formatDateTime } from '../../utils/helpers'

import Avatar from '../../components/shared/Avatar'
const card = { background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }

function InterviewerDashboard() {
  const navigate = useNavigate()
  const [schedule, setSchedule]     = useState([])
  const [scorecards, setScorecards] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  const today = new Date()
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - today.getDay() + 1 + i)
    return { d: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i], n: d.getDate(), today: d.toDateString() === today.toDateString() }
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [schedRes, scoreRes] = await Promise.all([
        api.getInterviewerSchedule(),
        api.getPendingScorecards(),
      ])
      setSchedule(schedRes.data || [])
      setScorecards(scoreRes.data || [])
    } catch (err) {
      setError('Could not load dashboard.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Spinner center />
  if (error) return <ErrorMessage message={error} />

  const todayLabel = today.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
  const hasPending = scorecards.length > 0

  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay() + 1); weekStart.setHours(0, 0, 0, 0)
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7)
  const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0)
  const todayEnd   = new Date(today); todayEnd.setHours(23, 59, 59, 999)

  const upcoming  = schedule.filter(iv => iv.status === 'scheduled' || iv.status === 'in_progress')
  const todayList = upcoming.filter(iv => {
    const t = new Date(iv.scheduled_start || iv.created)
    return t >= todayStart && t <= todayEnd
  })
  const weekCount = upcoming.filter(iv => {
    const t = new Date(iv.scheduled_start || iv.created)
    return t >= weekStart && t < weekEnd
  }).length

  const statCards = [
    { icon: CalendarDays, bg: 'var(--brand-50)', color: 'var(--brand-500)', value: upcoming.length || '—',  label: 'Upcoming interviews' },
    { icon: CheckSquare,  bg: hasPending ? 'var(--danger-50)' : 'var(--success-50)', color: hasPending ? 'var(--danger-500)' : 'var(--success-500)', value: scorecards.length || '0', label: 'Pending scorecards' },
    { icon: Video,        bg: 'var(--success-50)', color: 'var(--success-500)', value: weekCount || '—', label: 'This week' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Page header */}
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>My Schedule</h1>
        <p style={{ color: 'var(--slate-500)', fontSize: 13, margin: 0 }}>View upcoming interviews and fill pending scorecards.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))', gap: '0.875rem' }}>
        {statCards.map((s, i) => (
          <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, padding: 18 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={20} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--slate-900)', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's interviews */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)' }}>Today — {todayLabel}</span>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: 'var(--brand-50)', color: 'var(--brand-500)' }}>{todayList.length} interviews</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--slate-400)', fontWeight: 500 }}>Showing assigned</span>
        </div>

        {todayList.length === 0 ? (
          <EmptyState message="No interviews scheduled for today." />
        ) : (
          todayList.map((iv, i) => {
            const name = `${iv.first_name || ''} ${iv.last_name || ''}`.trim() || 'Candidate'
            const isNext = i === 0
            return (
              <div key={iv.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderTop: i === 0 ? '0' : '1px solid var(--slate-100)' }}>
                <div style={{ width: 90, flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: 'var(--slate-900)' }}>{formatDateTime(iv.scheduled_start || iv.created)}</div>
                  {isNext && <div style={{ fontSize: 11, color: 'var(--success-500)', fontWeight: 600, marginTop: 2 }}>Upcoming</div>}
                </div>
                <Avatar name={name} size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate-900)' }}>{name}</div>
                  <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 1 }}>{iv.status || 'Scheduled'}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 9999, background: 'var(--brand-50)', color: 'var(--brand-700)' }}>Interview</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => navigate(`/interviewer/live/${iv.id}`)}
                    style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--slate-300)', color: 'var(--slate-900)', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <BookOpen size={13} /> Prep
                  </button>
                  <button
                    disabled={!isNext}
                    onClick={() => navigate(`/interview/${iv.token || iv.magic_token}`)}
                    style={{ padding: '7px 16px', borderRadius: 8, border: 0, background: isNext ? 'var(--success-500)' : 'var(--slate-200)', color: isNext ? 'var(--bg-surface)' : 'var(--slate-400)', fontWeight: 600, fontSize: 13, cursor: isNext ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Video size={13} /> Join
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pending scorecards */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)' }}>Pending scorecards</span>
          {scorecards.length > 0 && (
            <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: 'var(--danger-50)', color: 'var(--danger-700)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <AlertCircle size={12} /> {scorecards.length} overdue
            </span>
          )}
        </div>
        {scorecards.length === 0 ? (
          <EmptyState message="No pending scorecards. You're all caught up!" />
        ) : (
          scorecards.map((s, i) => {
            const name = `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Candidate'
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderTop: i === 0 ? '0' : '1px solid var(--slate-100)' }}>
                <Avatar name={name} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate-900)' }}>{name}</div>
                  <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{formatDate(s.created)}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning-600)' }}>Overdue</span>
                <button
                  onClick={() => navigate(`/interviewer/scorecard/${s.id}`)}
                  style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--brand-500)', color: 'var(--bg-surface)', border: 0, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <CheckSquare size={13} /> Fill scorecard
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* This week mini calendar */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)' }}>This week</span>
          <span style={{ fontSize: 12, color: 'var(--slate-400)', fontWeight: 500 }}>Calendar sync planned</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(4rem, 1fr))', gap: '0.5rem' }}>
          {weekDays.map((d, i) => (
            <div key={i} style={{ padding: '12px 4px', textAlign: 'center', borderRadius: 10, background: d.today ? 'var(--brand-50)' : 'var(--slate-50)', border: `1px solid ${d.today ? 'var(--brand-500)' : 'var(--slate-100)'}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: d.today ? 'var(--brand-500)' : 'var(--slate-400)' }}>{d.d}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: d.today ? 'var(--brand-500)' : 'var(--slate-900)', marginTop: 2 }}>{d.n}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

export default InterviewerDashboard
