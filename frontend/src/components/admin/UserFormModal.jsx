// UserFormModal — create or edit a user for the selected company, and manage their
// RBAC role assignments. The legacy single-role field is no longer shown here — see
// user.service.js for why it still exists under the hood (not yet safe to remove).

import { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import Input from '../shared/Input'
import MultiSelect from '../shared/MultiSelect'
import * as api from '../../services/api'

function UserFormModal({ open, onClose, companyId, roles, user, onDone }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [roleIds, setRoleIds] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isEdit = !!user

  useEffect(() => {
    if (!open) return
    setFirstName(user?.first_name || '')
    setLastName(user?.last_name || '')
    setEmail(user?.email || '')
    setRoleIds((user?.roles || []).map(r => r.id))
    setError(null)
  }, [open, user])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = { companyId, firstName, lastName, email, roleIds }
      if (isEdit) {
        await api.updateUser(user.id, payload)
      } else {
        await api.createUser(payload)
      }
      await onDone?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit User' : 'Add User'} size="sm">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="First name" required value={firstName} onChange={e => setFirstName(e.target.value)} />
            <Input label="Last name" value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
          <Input label="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          {!isEdit && (
            <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: 0 }}>
              An email will be sent to this address with a link to set their password.
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-primary)' }}>Roles</label>
            <MultiSelect
              options={roles}
              selectedIds={roleIds}
              onChange={setRoleIds}
              placeholder="Select roles…"
              emptyMessage="No roles exist yet for this company."
            />
          </div>

          {error && <p style={{ fontSize: 12, color: 'var(--danger-500)', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>{isEdit ? 'Save Changes' : 'Add User'}</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default UserFormModal
