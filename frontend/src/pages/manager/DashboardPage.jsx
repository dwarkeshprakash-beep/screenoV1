import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, CheckSquare, CalendarPlus } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

const card = { background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }

function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats]       = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, activityRes] = await Promise.all([
        api.getTeamStats(),
        api.getTeamActivity(),
      ])
      setStats(statsRes.data)
      setActivity(activityRes.data || [])
    } catch (err) {
      setError('Could not load dashboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Spinner center />
  if (error) return <ErrorMessage message={error} />

  const statCards = [
    { icon: Users,        bg: '#EFEDFD', color: '#5B4FE9', value: stats?.totalMembers ?? '—',        label: 'Team members',         link: 'View team →',  to: '/manager/team' },
    { icon: CheckSquare,  bg: '#ECFDF5', color: '#059669', value: stats?.candidatesEvaluated ?? '—', label: 'Interviews completed',  link: 'This quarter', to: null },
    { icon: CalendarPlus, bg: '#FFFBEB', color: '#D97706', value: stats?.pendingScorecard ?? '—',    label: 'Pending scorecards',    link: 'Review now →', to: '/manager/reports' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, minHeight: 0 }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Dashboard</h1>
          <p style={{ color: '#6B7280', fontSize: 13, margin: 0 }}>Track your team's assessment progress and hiring activity.</p>
        </div>
        <button
          onClick={() => navigate('/manager/team')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#5B4FE9', color: '#FFF', border: 0, borderRadius: 8, fontWeight: 600, padding: '8px 14px', fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(91,79,233,0.2)' }}
        >
          <Users size={14} /> My Team
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {statCards.map((s, i) => (
          <div
            key={i}
            style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, padding: 18, cursor: s.to ? 'pointer' : 'default' }}
            onClick={() => s.to && navigate(s.to)}
            onMouseEnter={e => { if (s.to) e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,42,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.04)' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={20} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>{s.label}</div>
              {s.to && <span style={{ color: '#5B4FE9', fontSize: 12, fontWeight: 500, marginTop: 4, display: 'block' }}>{s.link}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom row — flex:1 so it fills remaining viewport height */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, flex: 1, minHeight: 0 }}>

        {/* Assessment flow */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Assessment Flow</div>
            <span onClick={() => navigate('/manager/team')} style={{ fontSize: 12, color: '#5B4FE9', fontWeight: 500, cursor: 'pointer' }}>View Team →</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              ['1', 'Add team members', 'Create or import internal candidates.'],
              ['2', 'Schedule assessments', 'Send AI, exam, or human interview invites.'],
              ['3', 'Review reports', 'Use completed attempts and scorecards for decisions.'],
            ].map(([num, title, text]) => (
              <div key={num} style={{ border: '1px solid #F1F5F9', borderRadius: 10, padding: 14, background: '#F8FAFC' }}>
                <div style={{ width: 24, height: 24, borderRadius: 9999, background: '#EFEDFD', color: '#5B4FE9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{num}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginTop: 10 }}>{title}</div>
                <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.45, marginTop: 4 }}>{text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hiring activity */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 14, flexShrink: 0 }}>Hiring Activity</div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {activity.length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No recent activity.</div>
            ) : activity.map((a, i) => (
              <div key={i} style={{ borderTop: i === 0 ? '0' : '1px solid #F1F5F9', padding: '12px 0' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{a.what}</div>
                <div style={{ fontSize: 12, color: '#5B4FE9', marginTop: 2 }}>{a.sub}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{formatDate(a.when)}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

export default DashboardPage
