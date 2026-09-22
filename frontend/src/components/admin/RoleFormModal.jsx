// RoleFormModal - create or edit a Role for the selected company.
// Same modal handles both: pass `role` to edit, omit it to create.

import { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import Input from '../shared/Input'
import Select from '../shared/Select'
import FormActions from '../shared/FormActions'
import FormError from '../shared/FormError'
import * as api from '../../services/api'

const PORTAL_OPTIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'bde', label: 'BDE' },
  { value: 'candidate', label: 'Candidate' },
]

function RoleFormModal({ open, onClose, companyId, role, onDone }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [portal, setPortal] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isEdit = !!role

  useEffect(() => {
    if (!open) return
    setName(role?.name || '')
    setDescription(role?.description || '')
    setPortal(role?.portal || '')
    setError(null)
  }, [open, role])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = { companyId, name, description, portal }
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
          <Select
            label="Portal"
            required
            value={portal}
            onChange={e => setPortal(e.target.value)}
            placeholder="Select which portal this role is for…"
            options={PORTAL_OPTIONS}
            helperText="Which app a user holding this role logs into."
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
