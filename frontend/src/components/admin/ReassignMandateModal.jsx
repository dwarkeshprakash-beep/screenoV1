// ReassignMandateModal - admin override that moves a mandate to another manager
// (by user ID). The backend checks the target can own client mandates and is in
// the same company.

import { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import Input from '../shared/Input'
import FormActions from '../shared/FormActions'
import FormError from '../shared/FormError'
import * as api from '../../services/api'

function ReassignMandateModal({ mandate, onClose, onDone }) {
  const [newManagerId, setNewManagerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setNewManagerId('')
    setError(null)
  }, [mandate])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!newManagerId) return
    setSaving(true)
    setError(null)
    try {
      await api.patch(`/api/admin/mandates/${mandate.id}/reassign`, {
        newManagerId: parseInt(newManagerId, 10),
      })
      onDone(`Mandate "${mandate.client_name}" reassigned.`)
    } catch (err) {
      setError(`Failed to reassign: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (!mandate) return null

  return (
    <Modal open size="sm" title="Reassign Mandate" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-muted)' }}>
          Reassigning <strong style={{ color: 'var(--fg-primary)' }}>{mandate.client_name}</strong>.
          Current manager: {mandate.manager_first_name} {mandate.manager_last_name} (ID: {mandate.manager_id})
        </p>
        <Input
          label="New manager ID"
          type="number"
          required
          value={newManagerId}
          onChange={e => setNewManagerId(e.target.value)}
          placeholder="Enter manager user ID"
        />
        <FormError message={error} />
        <FormActions onCancel={onClose} saving={saving} submitLabel="Reassign" />
      </form>
    </Modal>
  )
}

export default ReassignMandateModal
