import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, CheckSquare, CalendarPlus } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

const card = { background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }

function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats]       = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, activityRes] = await Promise.all([
        api.getTeamStats(),
        api.getTeamActivity(),
      ])
      setStats(statsRes.data)
      setActivity(activityRes.data || [])
    } catch {
      setError('Could not load dashboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <Spinner center />
  if (error) return <ErrorMessage message={error} />

  const statCards = [
    { icon: Users,        bg: 'var(--brand-50)', color: 'var(--brand-500)', value: stats?.totalMembers ?? '—',        label: 'Team members',         link: 'View team →',  to: '/manager/team' },
    { icon: CheckSquare,  bg: 'var(--success-50)', color: 'var(--success-500)', value: stats?.candidatesEvaluated ?? '—', label: 'Interviews completed',  link: 'This quarter', to: null },
    { icon: CalendarPlus, bg: 'var(--warning-50)', color: 'var(--warning-500)', value: stats?.pendingScorecard ?? '—',    label: 'Pending scorecards',    link: 'Review now →', to: '/manager/reports' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, minHeight: 0 }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 'var(--fs-3xl)', fontWeight: 'var(--fw-bold)', color: 'var(--fg-primary)', margin: '0 0 0.25rem', letterSpacing: 'var(--tracking-tight)' }}>Dashboard</h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)', margin: 0 }}>Track your team's assessment progress and hiring activity.</p>
        </div>
        <button
          onClick={() => navigate('/manager/team')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'var(--brand-500)', color: 'var(--fg-on-brand)', border: 0, borderRadius: 'var(--radius-md)', fontWeight: 'var(--fw-semibold)', padding: '0.5rem 0.875rem', fontSize: 'var(--fs-sm)', cursor: 'pointer', boxShadow: '0 4px 12px rgba(91,79,233,0.2)' }}
        >
          <Users size={14} /> My Team
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))', gap: '0.875rem' }}>
        {statCards.map((s, i) => (
          <div
            key={i}
            style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, padding: 18, cursor: s.to ? 'pointer' : 'default' }}
            onClick={() => s.to && navigate(s.to)}
            onMouseEnter={e => { if (s.to) e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,42,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.04)' }}
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

      {/* Bottom row — flex:1 so it fills remaining viewport height */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1rem', flex: 1, minHeight: 0 }}>

        {/* Assessment flow */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-bold)', color: 'var(--fg-primary)' }}>Assessment Flow</div>
            <span onClick={() => navigate('/manager/team')} style={{ fontSize: 'var(--fs-xs)', color: 'var(--brand-500)', fontWeight: 'var(--fw-medium)', cursor: 'pointer' }}>View Team →</span>
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

        {/* Hiring activity */}
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
    </div>
  )
}

export default DashboardPage
