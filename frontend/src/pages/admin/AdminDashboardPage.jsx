import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../../services/api'

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [brokenStates, setBrokenStates] = useState(null)
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState([])
  const [bdeForm, setBdeForm] = useState({ companyId: '', firstName: '', lastName: '', email: '' })
  const [bdeSaving, setBdeSaving] = useState(false)
  const [bdeMessage, setBdeMessage] = useState(null)

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
    api.get('/api/admin/companies').then(res => setCompanies(res.data || [])).catch(() => setCompanies([]))
  }, [loadDashboardData])

  async function createBde() {
    setBdeSaving(true)
    setBdeMessage(null)
    try {
      if (!bdeForm.companyId) throw new Error('Select a company')
      if (!bdeForm.email.trim()) throw new Error('Email is required')
      await api.post('/api/admin/users/bde', {
        companyId: Number(bdeForm.companyId),
        firstName: bdeForm.firstName.trim(),
        lastName: bdeForm.lastName.trim(),
        email: bdeForm.email.trim(),
      })
      setBdeMessage({ text: 'BDE user created. A password-reset email has been sent.', type: 'success' })
      setBdeForm({ companyId: '', firstName: '', lastName: '', email: '' })
    } catch (err) {
      setBdeMessage({ text: err.message || 'Could not create BDE user.', type: 'error' })
    } finally {
      setBdeSaving(false)
    }
  }

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

      {/* Create BDE user */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Create BDE user</h2>
        <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.875rem' }}>
          BDE users can create client mandates and assign them to a manager in the same company.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', color: '#374151' }}>
            Company
            <select
              value={bdeForm.companyId}
              onChange={e => setBdeForm(f => ({ ...f, companyId: e.target.value }))}
              style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db', minWidth: 180 }}
            >
              <option value="">Select company...</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', color: '#374151' }}>
            First name
            <input value={bdeForm.firstName} onChange={e => setBdeForm(f => ({ ...f, firstName: e.target.value }))}
              style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', color: '#374151' }}>
            Last name
            <input value={bdeForm.lastName} onChange={e => setBdeForm(f => ({ ...f, lastName: e.target.value }))}
              style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', color: '#374151' }}>
            Email
            <input type="email" value={bdeForm.email} onChange={e => setBdeForm(f => ({ ...f, email: e.target.value }))}
              style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db', minWidth: 220 }} />
          </label>
          <button
            onClick={createBde}
            disabled={bdeSaving}
            style={{
              padding: '0.6rem 1.25rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: bdeSaving ? 'default' : 'pointer',
              fontWeight: 500,
              opacity: bdeSaving ? 0.7 : 1,
            }}
          >
            {bdeSaving ? 'Creating...' : 'Create BDE user'}
          </button>
        </div>
        {bdeMessage && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.6rem 0.9rem',
            borderRadius: 6,
            fontSize: '0.85rem',
            backgroundColor: bdeMessage.type === 'error' ? '#fef2f2' : '#ecfdf5',
            color: bdeMessage.type === 'error' ? '#dc2626' : '#047857',
          }}>
            {bdeMessage.text}
          </div>
        )}
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

