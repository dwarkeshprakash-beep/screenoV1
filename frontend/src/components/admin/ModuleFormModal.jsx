// ModuleFormModal - rename a Module. The key is fixed at seed time and shown
// read-only; only the display name can be changed. See docs/rbac-multi-tenant-plan.md.

import { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import Input from '../shared/Input'
import FormActions from '../shared/FormActions'
import FormError from '../shared/FormError'
import * as api from '../../services/api'

function ModuleFormModal({ open, onClose, module, onDone }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setName(module?.name || '')
    setError(null)
  }, [open, module])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.updateModule(module.id, { name })
      await onDone?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save module')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Module" size="sm">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-primary)' }}>Key</label>
            <div style={{ padding: '10px 12px', fontSize: 14, color: 'var(--fg-muted)', background: 'var(--bg-surface-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', fontFamily: 'var(--font-mono)' }}>
              {module?.key}
            </div>
          </div>

          <Input
            label="Module name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Client Mandates"
          />

          <FormError message={error} />
          <FormActions onCancel={onClose} saving={saving} submitLabel="Save Changes" />
        </div>
      </form>
    </Modal>
  )
}

export default ModuleFormModal
