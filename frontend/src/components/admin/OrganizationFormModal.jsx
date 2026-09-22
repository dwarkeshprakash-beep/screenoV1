// OrganizationFormModal - create or edit an Organization (the companies table -
// the tenant boundary every other RBAC module is scoped under).

import { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import Input from '../shared/Input'
import FormActions from '../shared/FormActions'
import FormError from '../shared/FormError'
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
          <FormError message={error} />
          <FormActions onCancel={onClose} saving={saving} submitLabel={isEdit ? 'Save Changes' : 'Add Organization'} />
        </div>
      </form>
    </Modal>
  )
}

export default OrganizationFormModal
