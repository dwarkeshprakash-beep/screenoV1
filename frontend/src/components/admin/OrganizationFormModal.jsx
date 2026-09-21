// OrganizationFormModal - create or edit an Organization (the companies table -
// the tenant boundary every other RBAC module is scoped under).

import { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import Input from '../shared/Input'
import * as api from '../../services/api'

function OrganizationFormModal({ open, onClose, organization, onDone }) {
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isEdit = !!organization

  useEffect(() => {
    if (!open) return
    setName(organization?.name || '')
    setLogoUrl(organization?.logo_url || '')
    setError(null)
  }, [open, organization])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = { name, logoUrl }
      if (isEdit) await api.updateOrganization(organization.id, payload)
      else await api.createOrganization(payload)
      await onDone?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save organization')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Organization' : 'Add Organization'} size="sm">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Organization name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Acme Corp"
          />
          <Input
            label="Logo URL"
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            placeholder="Optional - https://…"
          />
          {error && <p style={{ fontSize: 12, color: 'var(--danger-500)', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>{isEdit ? 'Save Changes' : 'Add Organization'}</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default OrganizationFormModal
