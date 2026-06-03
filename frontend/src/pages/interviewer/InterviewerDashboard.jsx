// pages/interviewer/InterviewerDashboard.jsx
// Interviewer dashboard — today's schedule, pending scorecards.

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, FileText, Video } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import Avatar from '../../components/shared/Avatar'
import Button from '../../components/shared/Button'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

function StatCard({ icon: Icon, value, label, badge }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <Icon size={18} color="var(--brand-500)" />
        {badge > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--danger-500)', color: '#fff', borderRadius: 99, width: 16, height: 16, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {badge}
          </span>
        )}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>{value ?? '—'}</div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  )
}

function InterviewerDashboard() {
  const navigate = useNavigate()
  const [schedule, setSchedule]     = useState([])
  const [scorecards, setScorecards] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

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

  if (loading) return <div style={{ padding: 40 }}><Spinner /></div>
  if (error) return <ErrorMessage message={error} />

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Interviewer Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard icon={Calendar} value={schedule.length}   label="Today's Interviews" />
        <StatCard icon={FileText} value={scorecards.length} label="Pending Scorecards" badge={scorecards.length} />
        <StatCard icon={Calendar} value={schedule.length}   label="This Week" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Today's Interviews</h2>
          {schedule.length === 0 ? (
            <EmptyState message="No interviews scheduled for today." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {schedule.map(i => (
                <div key={i.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Avatar name={`${i.first_name} ${i.last_name}`} size={36} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{i.first_name} {i.last_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{formatDate(i.created)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button size="sm" variant="secondary">Prep</Button>
                    <Button size="sm" onClick={() => navigate(`/interviewer/live/${i.id}`)}>
                      <Video size={13} /> Join
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Pending Scorecards</h2>
          {scorecards.length === 0 ? (
            <EmptyState message="No pending scorecards." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {scorecards.map(s => (
                <div key={s.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{s.first_name} {s.last_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{formatDate(s.created)}</div>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/interviewer/scorecard/${s.id}`)}>Fill Scorecard</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InterviewerDashboard
