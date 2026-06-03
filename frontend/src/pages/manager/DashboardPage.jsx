// pages/manager/DashboardPage.jsx
// Team Overview — stat cards, openings table, and hiring activity feed.

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, UserCheck, Clock, Briefcase, Activity } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

function StatCard({ icon: Icon, value, label, link, color = 'var(--brand-500)' }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 16,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        width: 44, height: 44,
        borderRadius: 10,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--fg-primary)', lineHeight: 1.1 }}>{value ?? '—'}</div>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>{label}</div>
        {link && <div style={{ fontSize: 12, color: 'var(--brand-500)', marginTop: 4, fontWeight: 500 }}>{link}</div>}
      </div>
    </div>
  )
}

/**
 * Manager Team Overview dashboard.
 */
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

  if (loading) return <div style={{ padding: 40 }}><Spinner /></div>
  if (error) return <ErrorMessage message={error} />

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand-500)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            MANAGER · TEAM
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>
            Team Hiring
          </h1>
          <p style={{ fontSize: 14, color: 'var(--fg-muted)', marginTop: 6 }}>
            Manage your team's active interviews, review candidate reports, and make final decisions.
          </p>
        </div>
        <button
          onClick={() => navigate('/manager/team')}
          style={{
            padding: '10px 20px',
            background: 'var(--brand-500)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          View Team
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard
          icon={Briefcase}
          value={stats?.openRoles}
          label="Active Interviews"
          link="View all"
          color="var(--brand-500)"
        />
        <StatCard
          icon={UserCheck}
          value={stats?.candidatesEvaluated}
          label="Candidates Evaluated"
          link="See reports"
          color="var(--success-500)"
        />
        <StatCard
          icon={Clock}
          value={stats?.pendingScorecard}
          label="Pending Scorecards"
          link="Review now"
          color="var(--warning-500)"
        />
      </div>

      {/* Bottom two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Team overview */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} color="var(--brand-500)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)' }}>Team Members</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {stats?.totalMembers > 0 ? (
              <div style={{ padding: '12px 20px', color: 'var(--fg-muted)', fontSize: 14 }}>
                {stats.totalMembers} active team members
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 14 }}>
                No team members yet.{' '}
                <span
                  onClick={() => navigate('/manager/team')}
                  style={{ color: 'var(--brand-500)', cursor: 'pointer', fontWeight: 500 }}
                >
                  Add your first member →
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Hiring activity */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} color="var(--brand-500)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)' }}>Hiring Activity</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {activity.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 14 }}>
                No recent activity.
              </div>
            ) : (
              activity.map((item, i) => (
                <div key={i} style={{
                  padding: '10px 20px',
                  borderBottom: i < activity.length - 1 ? '1px solid var(--border-default)' : 'none',
                }}>
                  <div style={{ fontSize: 13, color: 'var(--fg-body)' }}>{item.what}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: 'var(--brand-500)', fontWeight: 500 }}>{item.sub}</span>
                    <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{formatDate(item.when)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
