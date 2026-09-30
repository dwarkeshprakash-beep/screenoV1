// AdminDashboardPage - platform-admin overview: headline mandate/interview counts,
// broken-state summary, shortcuts to the repair screens, and cross-company user creation.

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../../services/api'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import Button from '../../components/shared/Button'
import AdminStatCard from '../../components/admin/AdminStatCard'
import CreateCompanyUserPanel from '../../components/admin/CreateCompanyUserPanel'

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [brokenStates, setBrokenStates] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const issueCount = brokenStates?.issueCount || 0

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mandatesRes, interviewsRes, brokenRes] = await Promise.all([
        api.get('/api/admin/mandates'),
        api.get('/api/admin/interviews'),
        api.get('/api/admin/broken-states'),
      ])
      const mandates = mandatesRes.data || []
      const interviews = interviewsRes.data || []
      setStats({
        totalMandates: mandates.length,
        activeMandates: mandates.filter(m => !m.archived_at).length,
        archivedMandates: mandates.filter(m => m.archived_at).length,
        totalInterviews: interviews.length,
        inProgressInterviews: interviews.filter(i => i.status === 'in_progress').length,
        completedInterviews: interviews.filter(i => i.status === 'completed').length,
      })
      setBrokenStates(brokenRes.data)
    } catch (err) {
      setError(err.message || 'Could not load the admin dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDashboardData() }, [loadDashboardData])

  return (
    <div className="workspace-page workspace-stack">
      {loading ? <Spinner center /> : error ? (
        <div className="admin-panel"><ErrorMessage message={error} onRetry={loadDashboardData} /></div>
      ) : stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <AdminStatCard
            title="Total Mandates"
            value={stats.totalMandates}
            subtitle={`${stats.activeMandates} active, ${stats.archivedMandates} archived`}
            color="var(--info-500)"
          />
          <AdminStatCard
            title="Total Interviews"
            value={stats.totalInterviews}
            subtitle={`${stats.inProgressInterviews} in progress`}
            color="var(--brand-500)"
          />
          <AdminStatCard title="Completed Interviews" value={stats.completedInterviews} color="var(--success-500)" />
          {brokenStates && (
            <AdminStatCard
              title="Broken States Detected"
              value={issueCount}
              subtitle={issueCount > 0 ? 'Requires attention' : 'All systems operational'}
              color={issueCount > 0 ? 'var(--danger-500)' : 'var(--success-500)'}
            />
          )}
        </div>
      )}

      <div className="admin-panel admin-panel__body">
        <h2 className="admin-panel__title" style={{ marginBottom: 12 }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button onClick={() => navigate('/admin/mandates')}>Manage Mandates</Button>
          <Button onClick={() => navigate('/admin/interviews')}>Manage Interviews</Button>
          <Button variant={issueCount > 0 ? 'danger' : 'secondary'} onClick={() => navigate('/admin/broken-states')}>
            Fix Broken States ({issueCount})
          </Button>
        </div>
      </div>

      <CreateCompanyUserPanel />

      {issueCount > 0 && (
        <div className="admin-panel admin-panel__body" style={{ background: 'var(--danger-50)', borderColor: 'var(--danger-100)' }}>
          <h2 className="admin-panel__title" style={{ color: 'var(--danger-600)', marginBottom: 12 }}>Issues Detected</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {brokenStates.issues.map(issue => (
              <div key={issue.type} className="admin-panel admin-panel__body" style={{ padding: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{issue.description}</div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-muted)' }}>{issue.count} item(s) affected</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
