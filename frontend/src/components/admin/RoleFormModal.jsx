// RoleFormModal - create or edit a Role for the selected company.
// Same modal handles both: pass `role` to edit, omit it to create.

import { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import Input from '../shared/Input'
import FormActions from '../shared/FormActions'
import FormError from '../shared/FormError'
import * as api from '../../services/api'

function RoleFormModal({ open, onClose, companyId, role, onDone }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isEdit = !!role

  useEffect(() => {
    if (!open) return
    setName(role?.name || '')
    setDescription(role?.description || '')
    setError(null)
  }, [open, role])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = { companyId, name, description }
      if (isEdit) await api.updateRole(role.id, payload)
      else await api.createRole(payload)
      await onDone?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save role')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Role' : 'Add Role'} size="sm">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Role name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Manager"
          />
          <Input
            label="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional - what this role is for"
          />
          <FormError message={error} />
          <FormActions onCancel={onClose} saving={saving} submitLabel={isEdit ? 'Save Changes' : 'Add Role'} />
        </div>
      </form>
    </Modal>
  )
}

export default RoleFormModal
