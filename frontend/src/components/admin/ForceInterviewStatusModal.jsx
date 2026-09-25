// ForceInterviewStatusModal - emergency override of an interview's status. Bypasses
// the normal workflow checks, so it is only reachable from the admin repair screens.

import { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import Select from '../shared/Select'
import FormActions from '../shared/FormActions'
import FormError from '../shared/FormError'
import Notice from '../shared/Notice'
import * as api from '../../services/api'

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
]

function ForceInterviewStatusModal({ interview, onClose, onDone }) {
  const [newStatus, setNewStatus] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setNewStatus(interview?.status || '')
    setReason('')
    setError(null)
  }, [interview])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!newStatus) return
    setSaving(true)
    setError(null)
    try {
      await api.patch(`/api/admin/interviews/${interview.id}/force-status`, { status: newStatus, reason })
      onDone(`Interview ${interview.id} status updated to ${newStatus}.`)
    } catch (err) {
      setError(`Failed: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (!interview) return null

  return (
    <Modal open size="sm" title="Force Status Change" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Notice type="warning" message="This is an emergency override. Normal workflow validations will be bypassed." />
        <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
          Interview ID: <strong>{interview.id}</strong><br />
          Candidate: {interview.first_name} {interview.last_name}<br />
          Current status: <strong>{interview.status}</strong>
        </p>
        <Select
          label="New status"
          required
          value={newStatus}
          onChange={e => setNewStatus(e.target.value)}
          placeholder="Select status"
          options={STATUS_OPTIONS}
        />
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 500, color: 'var(--fg-primary)' }}>
          Reason
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Explain why this status change is being forced..."
            rows={3}
            style={{
              padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical',
              border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)', color: 'var(--fg-primary)',
            }}
          />
        </label>
        <FormError message={error} />
        <FormActions onCancel={onClose} saving={saving} submitLabel="Force Update" />
      </form>
    </Modal>
  )
}

export default ForceInterviewStatusModal
