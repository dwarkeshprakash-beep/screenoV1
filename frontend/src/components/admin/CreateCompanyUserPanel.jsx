// CreateCompanyUserPanel - admin bootstrap of a user in any company, with an explicitly
// chosen role. The backend emails the new user a password-reset link.

import { useState, useEffect } from 'react'
import * as api from '../../services/api'
import Input from '../shared/Input'
import Select from '../shared/Select'
import Button from '../shared/Button'
import Notice from '../shared/Notice'

const EMPTY_FORM = { companyId: '', roleId: '', firstName: '', lastName: '', email: '' }

function CreateCompanyUserPanel() {
  const [companies, setCompanies] = useState([])
  const [roles, setRoles] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null) // { type, text }

  const setField = (field, value) => setForm(f => ({ ...f, [field]: value }))

  useEffect(() => {
    async function loadCompanies() {
      try {
        const res = await api.get('/api/admin/companies')
        setCompanies(res.data || [])
      } catch {
        setCompanies([])
      }
    }
    loadCompanies()
  }, [])

  async function handleCompanyChange(companyId) {
    setForm(f => ({ ...f, companyId, roleId: '' }))
    if (!companyId) { setRoles([]); return }
    try {
      const res = await api.getRoles(Number(companyId))
      setRoles(res.data || [])
    } catch {
      setRoles([])
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      if (!form.companyId) throw new Error('Select a company')
      if (!form.roleId) throw new Error('Select a role')
      if (!form.email.trim()) throw new Error('Email is required')
      await api.post('/api/admin/users', {
        companyId: Number(form.companyId),
        roleId: Number(form.roleId),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
      })
      setMessage({ type: 'success', text: 'User created. A password-reset email has been sent.' })
      setForm(EMPTY_FORM)
      setRoles([])
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Could not create user.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-panel admin-panel__body">
      <h2 className="admin-panel__title">Create user in another organization</h2>
      <p className="admin-panel__hint">
        Bootstrap a user directly, with whichever role you assign controlling what they can access.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'end' }}>
        <Select
          label="Organization"
          value={form.companyId}
          onChange={e => handleCompanyChange(e.target.value)}
          placeholder="Select organization..."
          options={companies.map(c => ({ value: c.id, label: c.name }))}
        />
        <Select
          label="Role"
          value={form.roleId}
          onChange={e => setField('roleId', e.target.value)}
          disabled={!form.companyId}
          placeholder="Select role..."
          options={roles.map(r => ({ value: r.id, label: r.name }))}
        />
        <Input label="First name" value={form.firstName} onChange={e => setField('firstName', e.target.value)} />
        <Input label="Last name" value={form.lastName} onChange={e => setField('lastName', e.target.value)} />
        <Input label="Email" type="email" value={form.email} onChange={e => setField('email', e.target.value)} />
        <Button type="submit" loading={saving}>{saving ? 'Creating...' : 'Create user'}</Button>
      </form>
      {message && (
        <div style={{ marginTop: 12 }}>
          <Notice type={message.type} message={message.text} onDismiss={() => setMessage(null)} />
        </div>
      )}
    </div>
  )
}

export default CreateCompanyUserPanel
