import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../../services/api'

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [brokenStates, setBrokenStates] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      const [mandatesRes, interviewsRes, brokenRes] = await Promise.all([
        api.get('/api/admin/mandates'),
        api.get('/api/admin/interviews'),
        api.get('/api/admin/broken-states')
      ])

      // Calculate stats
      const mandates = mandatesRes.data
      const interviews = interviewsRes.data
      const broken = brokenRes.data

      setStats({
        totalMandates: mandates.length,
        activeMandates: mandates.filter(m => !m.archived_at).length,
        archivedMandates: mandates.filter(m => m.archived_at).length,
        totalInterviews: interviews.length,
        inProgressInterviews: interviews.filter(i => i.status === 'in_progress').length,
        completedInterviews: interviews.filter(i => i.status === 'completed').length,
      })

      setBrokenStates(broken)
    } catch (err) {
      console.error('Failed to load admin dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboardData()
  }, [loadDashboardData])

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading admin dashboard...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Admin Dashboard
        </h1>
        <p style={{ color: '#666' }}>System-wide overview and emergency controls</p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <StatCard 
            title="Total Mandates" 
            value={stats.totalMandates}
            subtitle={`${stats.activeMandates} active, ${stats.archivedMandates} archived`}
            color="#3b82f6"
          />
          <StatCard 
            title="Total Interviews" 
            value={stats.totalInterviews}
            subtitle={`${stats.inProgressInterviews} in progress`}
            color="#8b5cf6"
          />
          <StatCard 
            title="Completed Interviews" 
            value={stats.completedInterviews}
            color="#10b981"
          />
          {brokenStates && (
            <StatCard 
              title="Broken States Detected" 
              value={brokenStates.issueCount}
              subtitle={brokenStates.issueCount > 0 ? 'Requires attention' : 'All systems operational'}
              color={brokenStates.issueCount > 0 ? '#ef4444' : '#10b981'}
            />
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '1.5rem', 
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
          Quick Actions
        </h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/admin/mandates')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Manage Mandates
          </button>
          <button
            onClick={() => navigate('/admin/interviews')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Manage Interviews
          </button>
          <button
            onClick={() => navigate('/admin/broken-states')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: brokenStates?.issueCount > 0 ? '#ef4444' : '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Fix Broken States ({brokenStates?.issueCount || 0})
          </button>
        </div>
      </div>

      {/* Broken States Summary */}
      {brokenStates && brokenStates.issueCount > 0 && (
        <div style={{ 
          backgroundColor: '#fef2f2', 
          padding: '1.5rem', 
          borderRadius: '8px',
          border: '1px solid #fecaca'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#dc2626' }}>
            ⚠️ Issues Detected
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {brokenStates.issues.map((issue, idx) => (
              <div key={idx} style={{ 
                padding: '1rem', 
                backgroundColor: 'white', 
                borderRadius: '6px',
                border: '1px solid #fee2e2'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  {issue.description}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>
                  {issue.count} item(s) affected
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, subtitle, color }) {
  return (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '1.5rem', 
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
        {title}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color, marginBottom: '0.25rem' }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.875rem', color: '#999' }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}

