import { useState, useEffect } from 'react'
import * as api from '../../services/api'

export default function AdminMandatesPage() {
  const [mandates, setMandates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMandate, setSelectedMandate] = useState(null)
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [newManagerId, setNewManagerId] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [filter, setFilter] = useState('all') // 'all', 'active', 'archived'

  useEffect(() => {
    loadMandates()
  }, [])

  async function loadMandates() {
    try {
      setLoading(true)
      const res = await api.get('/api/admin/mandates')
      setMandates(res.data)
    } catch (err) {
      console.error('Failed to load mandates:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleReassign() {
    if (!selectedMandate || !newManagerId) return
    
    try {
      await api.patch(`/api/admin/mandates/${selectedMandate.id}/reassign`, {
        newManagerId: parseInt(newManagerId, 10)
      })
      alert(`Mandate reassigned successfully`)
      setShowReassignModal(false)
      setSelectedMandate(null)
      setNewManagerId('')
      loadMandates()
    } catch (err) {
      alert(`Failed to reassign: ${err.response?.data?.error || err.message}`)
    }
  }

  async function handleForceArchive(mandate, archived) {
    if (!window.confirm(`Force ${archived ? 'archive' : 'restore'} mandate "${mandate.client_name}"?`)) {
      return
    }

    try {
      await api.patch(`/api/admin/mandates/${mandate.id}/force-status`, { archived })
      alert(`Mandate ${archived ? 'archived' : 'restored'} successfully`)
      loadMandates()
    } catch (err) {
      alert(`Failed: ${err.response?.data?.error || err.message}`)
    }
  }

  async function handleForceDelete() {
    if (!selectedMandate) return
    if (deleteConfirmText !== selectedMandate.client_name) {
      alert('Confirmation text does not match mandate name')
      return
    }

    try {
      const res = await api.delete(`/api/admin/mandates/${selectedMandate.id}/force-delete`, {
        data: { confirmText: deleteConfirmText }
      })
      alert(`Mandate permanently deleted. ${res.data?.warning || ''}`)
      setShowDeleteModal(false)
      setSelectedMandate(null)
      setDeleteConfirmText('')
      loadMandates()
    } catch (err) {
      alert(`Failed to delete: ${err.response?.data?.error || err.message}`)
    }
  }

  const filteredMandates = mandates.filter(m => {
    if (filter === 'active') return !m.archived_at
    if (filter === 'archived') return m.archived_at
    return true
  })

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading mandates...</div>
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Mandate Management
        </h1>
        <p style={{ color: '#666' }}>Force reassignment, archive, and deletion controls</p>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: filter === 'all' ? '#3b82f6' : '#f3f4f6',
            color: filter === 'all' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          All ({mandates.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: filter === 'active' ? '#3b82f6' : '#f3f4f6',
            color: filter === 'active' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Active ({mandates.filter(m => !m.archived_at).length})
        </button>
        <button
          onClick={() => setFilter('archived')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: filter === 'archived' ? '#3b82f6' : '#f3f4f6',
            color: filter === 'archived' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Archived ({mandates.filter(m => m.archived_at).length})
        </button>
      </div>

      {/* Mandates Table */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb' }}>
            <tr>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Client Name</th>
              <th style={thStyle}>Manager</th>
              <th style={thStyle}>Company</th>
              <th style={thStyle}>Candidates</th>
              <th style={thStyle}>Interviews</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMandates.map((mandate) => (
              <tr key={mandate.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={tdStyle}>{mandate.id}</td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>{mandate.client_name}</div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    {mandate.requirements || 'No role specified'}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div>{mandate.manager_first_name} {mandate.manager_last_name}</div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    ID: {mandate.manager_id}
                  </div>
                </td>
                <td style={tdStyle}>{mandate.company_name}</td>
                <td style={tdStyle}>{mandate.candidate_count}</td>
                <td style={tdStyle}>
                  {mandate.interview_count}
                  {mandate.active_interview_count > 0 && (
                    <span style={{ 
                      marginLeft: '0.5rem', 
                      color: '#f59e0b',
                      fontSize: '0.875rem'
                    }}>
                      ({mandate.active_interview_count} active)
                    </span>
                  )}
                </td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    backgroundColor: mandate.archived_at ? '#fee2e2' : '#dcfce7',
                    color: mandate.archived_at ? '#dc2626' : '#16a34a'
                  }}>
                    {mandate.archived_at ? 'Archived' : 'Active'}
                  </span>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        setSelectedMandate(mandate)
                        setShowReassignModal(true)
                      }}
                      style={actionButtonStyle('#3b82f6')}
                    >
                      Reassign
                    </button>
                    <button
                      onClick={() => handleForceArchive(mandate, !mandate.archived_at)}
                      style={actionButtonStyle(mandate.archived_at ? '#10b981' : '#f59e0b')}
                    >
                      {mandate.archived_at ? 'Restore' : 'Archive'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMandate(mandate)
                        setShowDeleteModal(true)
                      }}
                      style={actionButtonStyle('#ef4444')}
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

      {/* Reassign Modal */}
      {showReassignModal && selectedMandate && (
        <Modal onClose={() => {
          setShowReassignModal(false)
          setSelectedMandate(null)
          setNewManagerId('')
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
            Reassign Mandate
          </h2>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            Reassigning: <strong>{selectedMandate.client_name}</strong>
          </p>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            Current manager: {selectedMandate.manager_first_name} {selectedMandate.manager_last_name} (ID: {selectedMandate.manager_id})
          </p>
          <label style={{ display: 'block', marginBottom: '1rem' }}>
            <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              New Manager ID:
            </span>
            <input
              type="number"
              value={newManagerId}
              onChange={(e) => setNewManagerId(e.target.value)}
              placeholder="Enter manager user ID"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setShowReassignModal(false)
                setSelectedMandate(null)
                setNewManagerId('')
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
              onClick={handleReassign}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Reassign
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedMandate && (
        <Modal onClose={() => {
          setShowDeleteModal(false)
          setSelectedMandate(null)
          setDeleteConfirmText('')
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: '#dc2626' }}>
            ⚠️ Force Delete Mandate
          </h2>
          <div style={{ 
            backgroundColor: '#fee2e2', 
            padding: '1rem', 
            borderRadius: '6px',
            marginBottom: '1rem'
          }}>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Warning: This action is permanent!</p>
            <p style={{ fontSize: '0.875rem' }}>
              This will delete the mandate, all assignments, interviews, reports, and mandate-specific resumes.
            </p>
          </div>
          <p style={{ marginBottom: '1rem' }}>
            Mandate: <strong>{selectedMandate.client_name}</strong><br />
            Candidates: {selectedMandate.candidate_count}<br />
            Interviews: {selectedMandate.interview_count}
            {selectedMandate.active_interview_count > 0 && (
              <span style={{ color: '#dc2626' }}> (including {selectedMandate.active_interview_count} in progress!)</span>
            )}
          </p>
          <label style={{ display: 'block', marginBottom: '1rem' }}>
            <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Type the mandate name to confirm:
            </span>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={selectedMandate.client_name}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setShowDeleteModal(false)
                setSelectedMandate(null)
                setDeleteConfirmText('')
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
              onClick={handleForceDelete}
              disabled={deleteConfirmText !== selectedMandate.client_name}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: deleteConfirmText === selectedMandate.client_name ? '#dc2626' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: deleteConfirmText === selectedMandate.client_name ? 'pointer' : 'not-allowed',
                fontWeight: 500
              }}
            >
              Permanently Delete
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

function actionButtonStyle(color) {
  return {
    padding: '0.25rem 0.75rem',
    backgroundColor: color,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500
  }
}

