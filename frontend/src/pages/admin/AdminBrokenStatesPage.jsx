import { useState, useEffect } from 'react'
import * as api from '../../services/api'

export default function AdminBrokenStatesPage() {
  const [brokenStates, setBrokenStates] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBrokenStates()
  }, [])

  async function loadBrokenStates() {
    try {
      setLoading(true)
      const res = await api.get('/api/admin/broken-states')
      setBrokenStates(res.data)
    } catch (err) {
      console.error('Failed to load broken states:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>Scanning for broken states...</div>
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Broken States Detection
        </h1>
        <p style={{ color: '#666' }}>
          Automated detection of data integrity issues and broken references
        </p>
      </div>

      {brokenStates && brokenStates.issueCount === 0 ? (
        <div style={{ 
          backgroundColor: '#dcfce7', 
          padding: '2rem', 
          borderRadius: '8px',
          border: '1px solid #86efac',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#166534', marginBottom: '0.5rem' }}>
            All Systems Operational
          </h2>
          <p style={{ color: '#15803d' }}>
            No data integrity issues detected
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {brokenStates?.issues.map((issue, idx) => (
            <div 
              key={idx} 
              style={{ 
                backgroundColor: 'white', 
                padding: '1.5rem', 
                borderRadius: '8px',
                border: '2px solid #fecaca'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '1rem'
              }}>
                <div>
                  <h3 style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: 600, 
                    color: '#dc2626',
                    marginBottom: '0.5rem'
                  }}>
                    {issue.description}
                  </h3>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    Type: <code style={{ 
                      backgroundColor: '#f3f4f6', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px' 
                    }}>
                      {issue.type}
                    </code>
                  </div>
                </div>
                <div style={{ 
                  padding: '0.5rem 1rem', 
                  backgroundColor: '#fee2e2',
                  borderRadius: '12px',
                  fontWeight: 600,
                  color: '#dc2626'
                }}>
                  {issue.count} affected
                </div>
              </div>

              {/* Issue-specific actions and details */}
              {issue.type === 'orphaned_mandates' && (
                <OrphanedMandatesIssue items={issue.items} onReload={loadBrokenStates} />
              )}
              {issue.type === 'invalid_requirements' && (
                <InvalidRequirementsIssue items={issue.items} onReload={loadBrokenStates} />
              )}
              {issue.type === 'stuck_interviews' && (
                <StuckInterviewsIssue items={issue.items} onReload={loadBrokenStates} />
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button
          onClick={loadBrokenStates}
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
          🔄 Re-scan for Issues
        </button>
      </div>
    </div>
  )
}

function OrphanedMandatesIssue({ items, onReload }) {
  const [fixing, setFixing] = useState(false)

  async function fixMandate(mandateId, action) {
    if (!window.confirm(`Are you sure you want to ${action} this orphaned mandate?`)) return

    setFixing(true)
    try {
      if (action === 'delete') {
        const mandate = items.find(i => i.id === mandateId)
        await api.delete(`/api/admin/mandates/${mandateId}/force-delete`, {
          data: { confirmText: mandate.client_name }
        })
      } else if (action === 'archive') {
        await api.patch(`/api/admin/mandates/${mandateId}/force-status`, { archived: true })
      }
      alert(`Mandate ${action}d successfully`)
      onReload()
    } catch (err) {
      alert(`Failed: ${err.response?.data?.error || err.message}`)
    } finally {
      setFixing(false)
    }
  }

  return (
    <div>
      <p style={{ marginBottom: '1rem', color: '#666' }}>
        These mandates have missing or deleted manager references. They should be reassigned or deleted.
      </p>
      <div style={{ maxHeight: '300px', overflow: 'auto' }}>
        <table style={{ width: '100%', fontSize: '0.875rem' }}>
          <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
            <tr>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>ID</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Client Name</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Missing Manager ID</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.5rem' }}>{item.id}</td>
                <td style={{ padding: '0.5rem' }}>{item.client_name}</td>
                <td style={{ padding: '0.5rem' }}>{item.manager_id}</td>
                <td style={{ padding: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => fixMandate(item.id, 'archive')}
                      disabled={fixing}
                      style={smallButtonStyle('#f59e0b')}
                    >
                      Archive
                    </button>
                    <button
                      onClick={() => fixMandate(item.id, 'delete')}
                      disabled={fixing}
                      style={smallButtonStyle('#ef4444')}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InvalidRequirementsIssue({ items, onReload }) {
  const [fixing, setFixing] = useState(false)

  async function fixInvalidRequirement(ctId) {
    if (!window.confirm('Clear invalid requirement reference?')) return

    setFixing(true)
    try {
      await api.post(`/api/admin/client-teams/${ctId}/reassign-requirement`, {
        requirementId: null
      })
      alert('Requirement reference cleared')
      onReload()
    } catch (err) {
      alert(`Failed: ${err.response?.data?.error || err.message}`)
    } finally {
      setFixing(false)
    }
  }

  return (
    <div>
      <p style={{ marginBottom: '1rem', color: '#666' }}>
        These client team members reference requirements that don't exist. Clear or reassign them.
      </p>
      <div style={{ maxHeight: '300px', overflow: 'auto' }}>
        <table style={{ width: '100%', fontSize: '0.875rem' }}>
          <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
            <tr>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>CT ID</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Mandate ID</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>User ID</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Invalid Req ID</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.5rem' }}>{item.id}</td>
                <td style={{ padding: '0.5rem' }}>{item.mandate_id}</td>
                <td style={{ padding: '0.5rem' }}>{item.user_id}</td>
                <td style={{ padding: '0.5rem' }}>{item.requirement_id}</td>
                <td style={{ padding: '0.5rem' }}>
                  <button
                    onClick={() => fixInvalidRequirement(item.id)}
                    disabled={fixing}
                    style={smallButtonStyle('#3b82f6')}
                  >
                    Clear Reference
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StuckInterviewsIssue({ items, onReload }) {
  const [fixing, setFixing] = useState(false)

  async function fixStuckInterview(interviewId, action) {
    setFixing(true)
    try {
      const status = action === 'complete' ? 'completed' : 'cancelled'
      await api.patch(`/api/admin/interviews/${interviewId}/force-status`, {
        status,
        reason: `Stuck interview auto-resolved by admin`
      })
      alert(`Interview marked as ${status}`)
      onReload()
    } catch (err) {
      alert(`Failed: ${err.response?.data?.error || err.message}`)
    } finally {
      setFixing(false)
    }
  }

  return (
    <div>
      <p style={{ marginBottom: '1rem', color: '#666' }}>
        These interviews have been in "in_progress" state for over 7 days. They may have crashed or been abandoned.
      </p>
      <div style={{ maxHeight: '300px', overflow: 'auto' }}>
        <table style={{ width: '100%', fontSize: '0.875rem' }}>
          <thead style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
            <tr>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>ID</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>User ID</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Type</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Created</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.5rem' }}>{item.id}</td>
                <td style={{ padding: '0.5rem' }}>{item.user_id}</td>
                <td style={{ padding: '0.5rem' }}>{item.type}</td>
                <td style={{ padding: '0.5rem' }}>
                  {new Date(item.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => fixStuckInterview(item.id, 'complete')}
                      disabled={fixing}
                      style={smallButtonStyle('#10b981')}
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => fixStuckInterview(item.id, 'cancel')}
                      disabled={fixing}
                      style={smallButtonStyle('#ef4444')}
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function smallButtonStyle(color) {
  return {
    padding: '0.25rem 0.75rem',
    backgroundColor: color,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 500
  }
}

