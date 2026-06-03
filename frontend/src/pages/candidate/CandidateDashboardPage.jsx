// pages/candidate/CandidateDashboardPage.jsx
// Candidate self-service dashboard.

import { useState, useEffect } from 'react'
import { Calendar, CheckCircle, Star, RotateCcw } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

function StatCard({ icon: Icon, value, label }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color="var(--brand-500)" />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>{value ?? '—'}</div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  )
}

function CandidateDashboardPage() {
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  let user = {}
  try { user = JSON.parse(localStorage.getItem('user') || '{}') } catch {}

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getCandidateInterviews()
      setInterviews(res.data || [])
    } catch (err) {
      setError('Could not load your interviews.')
    } finally {
      setLoading(false)
    }
  }

  const upcoming  = interviews.filter(i => i.status === 'scheduled')
  const completed = interviews.filter(i => i.status === 'completed')

  if (loading) return <div style={{ padding: 40 }}><Spinner /></div>
  if (error) return <ErrorMessage message={error} />

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}!</h1>
      <p style={{ color: 'var(--fg-muted)', fontSize: 14, marginBottom: 24 }}>Here's your interview overview.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard icon={Calendar}     value={upcoming.length}  label="Upcoming" />
        <StatCard icon={CheckCircle}  value={completed.length} label="Completed" />
        <StatCard icon={Star}         value="—"                label="Avg Score" />
        <StatCard icon={RotateCcw}    value={interviews.length} label="Total Attempts" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Upcoming Interviews</h2>
          {upcoming.length === 0 ? (
            <EmptyState message="No upcoming interviews." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcoming.map(i => (
                <div key={i.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{i.type === 'ai_voice' ? 'AI Interview' : 'Exam'}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>Scheduled · {formatDate(i.created)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Completed Interviews</h2>
          {completed.length === 0 ? (
            <EmptyState message="No completed interviews yet." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {completed.map(i => (
                <div key={i.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{i.type === 'ai_voice' ? 'AI Interview' : 'Exam'}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>Completed · {formatDate(i.created)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CandidateDashboardPage
