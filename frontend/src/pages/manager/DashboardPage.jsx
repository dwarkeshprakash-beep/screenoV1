import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, CheckSquare, CalendarPlus } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

const cardStyle = { background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }
const eyebrowStyle = { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5B4FE9' }

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
    { icon: Users,       value: stats?.totalMembers ?? '—',          label: 'Team Members',          link: 'View My Team',    to: '/manager/team' },
    { icon: CheckSquare, value: stats?.candidatesEvaluated ?? '—',   label: 'Interviews Completed',  link: 'This quarter',    to: null },
    { icon: CalendarPlus,value: stats?.pendingScorecard ?? '—',      label: 'Pending Scorecards',    link: 'Review now',      to: '/manager/reports' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={eyebrowStyle}>MANAGER · TEAM</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', margin: '6px 0 4px', letterSpacing: '-0.02em' }}>Team Overview</h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>Monitor your team's assessments, schedule interviews, and review reports.</p>
        </div>
        <button
          onClick={() => navigate('/manager/team')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#5B4FE9', color: '#FFF', border: 0, borderRadius: 8, fontWeight: 600, padding: '8px 14px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(91,79,233,0.2)' }}
        >
          <Users size={14} /> My Team
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        {statCards.map((s, i) => (
          <div key={i} style={{ ...cardStyle, cursor: s.to ? 'pointer' : 'default' }}
            onClick={() => s.to && navigate(s.to)}
            onMouseEnter={e => { if (s.to) e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,42,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.04)' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#EFEDFD', color: '#5B4FE9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <s.icon size={18} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.025em', lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: '#6B7280', fontSize: 13, marginTop: 4 }}>{s.label}</div>
            {s.to && <a style={{ color: '#5B4FE9', fontSize: 12, fontWeight: 500, cursor: 'pointer', marginTop: 8, display: 'block' }}>{s.link}</a>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Assessment Flow</div>
            <a onClick={() => navigate('/manager/team')} style={{ fontSize: 12, color: '#5B4FE9', fontWeight: 500, cursor: 'pointer' }}>View Team →</a>
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

        <div style={cardStyle}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>Hiring Activity</div>
          {activity.length === 0 ? (
            <div style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No recent activity.</div>
          ) : activity.map((a, i) => (
            <div key={i} style={{ borderTop: i === 0 ? '0' : '1px solid #F9FAFB', padding: '12px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{a.what}</div>
              <div style={{ fontSize: 12, color: '#5B4FE9', marginTop: 2 }}>{a.sub}</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{formatDate(a.when)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DashboardPage

