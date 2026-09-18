// PermissionFormModal - create or edit a Permission. Permissions are global
// (not per-company) - see docs/rbac-multi-tenant-plan.md.

import { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import Input from '../shared/Input'
import * as api from '../../services/api'

function PermissionFormModal({ open, onClose, permission, onDone }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isEdit = !!permission

  useEffect(() => {
    if (!open) return
    setName(permission?.name || '')
    setDescription(permission?.description || '')
    setError(null)
  }, [open, permission])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = { name, description }
      if (isEdit) await api.updatePermission(permission.id, payload)
      else await api.createPermission(payload)
      await onDone?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save permission')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Permission' : 'Add Permission'} size="sm">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Permission name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Read"
          />
          <Input
            label="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional - what this permission allows"
          />
          {error && <p style={{ fontSize: 12, color: 'var(--danger-500)', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>{isEdit ? 'Save Changes' : 'Add Permission'}</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default PermissionFormModal
