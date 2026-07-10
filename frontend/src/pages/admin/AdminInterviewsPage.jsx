import { useCallback, useEffect, useState } from 'react'
import * as api from '../../services/api'

export default function AdminInterviewsPage() {
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedInterview, setSelectedInterview] = useState(null)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [reason, setReason] = useState('')
  const [filter, setFilter] = useState('all')

  const loadInterviews = useCallback(async () => {
    try {
      setLoading(true)
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const res = await api.get(`/api/admin/interviews${params}`)
      setInterviews(res.data)
    } catch (err) {
      console.error('Failed to load interviews:', err)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void loadInterviews()
  }, [loadInterviews])

  async function handleForceStatus() {
    if (!selectedInterview || !newStatus) return

    try {
      await api.patch(`/api/admin/interviews/${selectedInterview.id}/force-status`, {
        status: newStatus,
        reason
      })
      alert('Interview status updated successfully')
      setShowStatusModal(false)
      setSelectedInterview(null)
      setNewStatus('')
      setReason('')
      await loadInterviews()
    } catch (err) {
      alert(`Failed: ${err.response?.data?.error || err.message}`)
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading interviews...</div>
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Interview Management
        </h1>
        <p style={{ color: '#666' }}>Force status changes for broken or stuck interviews</p>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['all', 'scheduled', 'in_progress', 'completed', 'cancelled', 'expired'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: filter === f ? '#3b82f6' : '#f3f4f6',
              color: filter === f ? 'white' : '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              textTransform: 'capitalize'
            }}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Interviews Table */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        border: '1px solid #e5e7eb',
        overflow: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead style={{ backgroundColor: '#f9fafb' }}>
            <tr>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Candidate</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Context</th>
              <th style={thStyle}>Scheduled</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {interviews.map((interview) => (
              <tr key={interview.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={tdStyle}>{interview.id}</td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>
                    {interview.first_name} {interview.last_name}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    {interview.email}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#999' }}>
                    {interview.company_name}
                  </div>
                </td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    backgroundColor: '#e0e7ff',
                    color: '#3730a3'
                  }}>
                    {interview.type}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    ...getStatusStyle(interview.status)
                  }}>
                    {interview.status}
                  </span>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontSize: '0.875rem' }}>
                    {interview.context_type === 'client_template' && interview.mandate_name ? (
                      <>
                        <div style={{ fontWeight: 500 }}>{interview.mandate_name}</div>
                        <div style={{ color: '#666' }}>Mandate</div>
                      </>
                    ) : (
                      <div style={{ color: '#666' }}>{interview.context_type}</div>
                    )}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontSize: '0.875rem' }}>
                    {interview.scheduled_at ? 
                      new Date(interview.scheduled_at).toLocaleDateString() : 
                      'Not scheduled'
                    }
                  </div>
                </td>
                <td style={tdStyle}>
                  <button
                    onClick={() => {
                      setSelectedInterview(interview)
                      setNewStatus(interview.status)
                      setShowStatusModal(true)
                    }}
                    style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 500
                    }}
                  >
                    Change Status
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {interviews.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            No interviews found
          </div>
        )}
      </div>

      {/* Status Change Modal */}
      {showStatusModal && selectedInterview && (
        <Modal onClose={() => {
          setShowStatusModal(false)
          setSelectedInterview(null)
          setNewStatus('')
          setReason('')
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
            Force Status Change
          </h2>
          <div style={{ 
            backgroundColor: '#fef3c7', 
            padding: '1rem', 
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            ⚠️ This is an emergency override. Normal workflow validations will be bypassed.
          </div>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            Interview ID: <strong>{selectedInterview.id}</strong><br />
            Candidate: {selectedInterview.first_name} {selectedInterview.last_name}<br />
            Current status: <strong>{selectedInterview.status}</strong>
          </p>
          <label style={{ display: 'block', marginBottom: '1rem' }}>
            <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              New Status:
            </span>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            >
              <option value="">-- Select Status --</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </label>
          <label style={{ display: 'block', marginBottom: '1rem' }}>
            <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Reason (for audit log):
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this status change is being forced..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                resize: 'vertical'
              }}
            />
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setShowStatusModal(false)
                setSelectedInterview(null)
                setNewStatus('')
                setReason('')
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleForceStatus}
              disabled={!newStatus}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: newStatus ? '#f59e0b' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: newStatus ? 'pointer' : 'not-allowed',
                fontWeight: 500
              }}
            >
              Force Update
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ children, onClose }) {
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function getStatusStyle(status) {
  const styles = {
    scheduled: { backgroundColor: '#dbeafe', color: '#1e40af' },
    in_progress: { backgroundColor: '#fef3c7', color: '#92400e' },
    completed: { backgroundColor: '#dcfce7', color: '#166534' },
    cancelled: { backgroundColor: '#fee2e2', color: '#991b1b' },
    expired: { backgroundColor: '#f3f4f6', color: '#374151' }
  }
  return styles[status] || styles.expired
}

const thStyle = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#374151'
}

const tdStyle = {
  padding: '1rem',
  fontSize: '0.875rem'
}

