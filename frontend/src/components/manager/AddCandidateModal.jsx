// components/manager/AddCandidateModal.jsx
// Simple form to add a new team member.

import { useState } from 'react'
import Modal from '../shared/Modal'
import Input from '../shared/Input'
import Button from '../shared/Button'
import * as api from '../../services/api'

/**
 * @param {boolean} open
 * @param {Function} onClose
 * @param {Function} onDone - called after successful add
 */
function AddCandidateModal({ open, onClose, onDone }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', type: 'internal' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.firstName) return setError('First name is required')
    if (!form.email) return setError('Email is required')

    setLoading(true)
    setError(null)
    try {
      await api.addMember(form)
      onDone && onDone()
      setForm({ firstName: '', lastName: '', email: '', phone: '', type: 'internal' })
      onClose()
    } catch (err) {
      setError(err.message || 'Could not add member')
    } finally {
      setLoading(false)
    }
  }

  const pillActive = { padding: '6px 14px', borderRadius: 99, border: 'none', background: 'var(--brand-500)', color: '#fff', fontSize: 13, cursor: 'pointer' }
  const pillInactive = { padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--fg-body)', fontSize: 13, cursor: 'pointer' }

  return (
    <Modal open={open} onClose={onClose} title="Add Team Member" size="sm">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input id="firstName" label="First name *" value={form.firstName} onChange={e => set('firstName', e.target.value)} />
            <Input id="lastName" label="Last name" value={form.lastName} onChange={e => set('lastName', e.target.value)} />
          </div>
          <Input id="email" label="Email *" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          <Input id="phone" label="Phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => set('type', 'internal')} style={form.type === 'internal' ? pillActive : pillInactive}>Internal</button>
              <button type="button" onClick={() => set('type', 'external')} style={form.type === 'external' ? pillActive : pillInactive}>External</button>
            </div>
          </div>

          {error && <p style={{ fontSize: 13, color: 'var(--danger-500)' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
            <Button type="submit" loading={loading}>Add Member</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default AddCandidateModal
