// AclFormModal - create or edit an ACL for the selected company. An ACL is created
// bare (just a name/description) and linked to a module afterward from the Modules
// screen (see AdminModulesPage) - not picked here.

import { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import Input from '../shared/Input'
import FormActions from '../shared/FormActions'
import FormError from '../shared/FormError'
import * as api from '../../services/api'

function AclFormModal({ open, onClose, companyId, acl, onDone }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isEdit = !!acl

  useEffect(() => {
    if (!open) return
    setName(acl?.name || '')
    setDescription(acl?.description || '')
    setError(null)
  }, [open, acl])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await api.updateAcl(acl.id, { companyId, name, description })
      } else {
        await api.createAcl({ companyId, name, description })
      }
      await onDone?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save ACL')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit ACL' : 'Add ACL'} size="sm">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="ACL name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Client Mandates - Full Access"
          />
          <Input
            label="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional - what this ACL is for"
          />

          <FormError message={error} />
          <FormActions onCancel={onClose} saving={saving} submitLabel={isEdit ? 'Save Changes' : 'Add ACL'} />
        </div>
      </form>
    </Modal>
  )
}

export default AclFormModal
