// ForceDeleteMandateModal - permanent admin delete of a mandate and everything under
// it. The admin must type the exact client name; the backend re-checks it.

import { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import Input from '../shared/Input'
import Button from '../shared/Button'
import FormError from '../shared/FormError'
import Notice from '../shared/Notice'
import * as api from '../../services/api'

function ForceDeleteMandateModal({ mandate, onClose, onDone }) {
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  const nameMatches = !!mandate && confirmText === mandate.client_name

  useEffect(() => {
    setConfirmText('')
    setError(null)
  }, [mandate])

  async function handleDelete() {
    if (!nameMatches) return
    setDeleting(true)
    setError(null)
    try {
      await api.delete(`/api/admin/mandates/${mandate.id}/force-delete`, {
        data: { confirmText },
      })
      onDone(`Mandate "${mandate.client_name}" permanently deleted.`)
    } catch (err) {
      setError(`Failed to delete: ${err.message}`)
    } finally {
      setDeleting(false)
    }
  }

  if (!mandate) return null

  return (
    <Modal open size="sm" title="Force Delete Mandate" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Notice
          type="error"
          message="This is permanent. It deletes the mandate, all assignments, interviews, reports, and mandate-specific resumes."
        />
        <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-body)', lineHeight: 1.6 }}>
          Mandate: <strong>{mandate.client_name}</strong><br />
          Candidates: {mandate.candidate_count}<br />
          Interviews: {mandate.interview_count}
          {mandate.active_interview_count > 0 && (
            <span style={{ color: 'var(--danger-600)' }}> (including {mandate.active_interview_count} in progress!)</span>
          )}
        </p>
        <Input
          label="Type the mandate name to confirm"
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          placeholder={mandate.client_name}
        />
        <FormError message={error} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={!nameMatches} loading={deleting}>
            Permanently Delete
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default ForceDeleteMandateModal
