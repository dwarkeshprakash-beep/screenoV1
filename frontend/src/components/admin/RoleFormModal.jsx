// RoleFormModal - create or edit a Role for the selected company.
// Same modal handles both: pass `role` to edit, omit it to create.

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import Input from '../shared/Input'
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

  const selectStyle = {
    appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
    padding: '10px 32px 10px 12px', fontSize: 14, border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', color: 'var(--fg-primary)',
    width: '100%', fontFamily: 'inherit', cursor: 'pointer',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-primary)' }}>
              Portal<span style={{ color: 'var(--danger-500)', marginLeft: 2 }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <select required value={portal} onChange={e => setPortal(e.target.value)} style={selectStyle}>
                <option value="" disabled>Select which portal this role is for…</option>
                {PORTAL_OPTIONS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: '2px 0 0' }}>
              Which app a user holding this role logs into.
            </p>
          </div>
          <Input
            label="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional - what this role is for"
          />
          {error && <p style={{ fontSize: 12, color: 'var(--danger-500)', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>{isEdit ? 'Save Changes' : 'Add Role'}</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default RoleFormModal
