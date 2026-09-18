// AclFormModal - create or edit an ACL for the selected company. An ACL's module
// is a strict 1:1 pick made at creation time and never changes afterward (delete
// and recreate if the wrong module was picked) - see docs/rbac-multi-tenant-plan.md.

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import Input from '../shared/Input'
import * as api from '../../services/api'

function AclFormModal({ open, onClose, companyId, acl, onDone }) {
  const [moduleId, setModuleId] = useState('')
  const [moduleOptions, setModuleOptions] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isEdit = !!acl

  useEffect(() => {
    if (!open) return
    setModuleId(acl?.module_id || '')
    setName(acl?.name || '')
    setDescription(acl?.description || '')
    setError(null)
    if (!isEdit) loadModuleOptions()
  }, [open, acl])

  async function loadModuleOptions() {
    try {
      const res = await api.getAclModuleOptions(companyId)
      setModuleOptions(res.data || [])
    } catch {
      setError('Could not load modules')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await api.updateAcl(acl.id, { companyId, name, description })
      } else {
        await api.createAcl({ companyId, moduleId: Number(moduleId), name, description })
      }
      await onDone?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save ACL')
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
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit ACL' : 'Add ACL'} size="sm">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-primary)' }}>
              Module{!isEdit && <span style={{ color: 'var(--danger-500)', marginLeft: 2 }}>*</span>}
            </label>
            {isEdit ? (
              <div style={{ padding: '10px 12px', fontSize: 14, color: 'var(--fg-muted)', background: 'var(--bg-surface-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                {acl.module_name}
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <select required value={moduleId} onChange={e => setModuleId(e.target.value)} style={selectStyle}>
                  <option value="" disabled>Select a module…</option>
                  {moduleOptions.map(m => (
                    <option key={m.id} value={m.id} disabled={m.hasAcl}>
                      {m.name}{m.hasAcl ? ' (already has an ACL)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
              </div>
            )}
          </div>

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

          {error && <p style={{ fontSize: 12, color: 'var(--danger-500)', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>{isEdit ? 'Save Changes' : 'Add ACL'}</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default AclFormModal
