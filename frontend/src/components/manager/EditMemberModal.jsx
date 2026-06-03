// components/manager/EditMemberModal.jsx
// Edit a team member's profile or remove them.

import { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import Input from '../shared/Input'
import Button from '../shared/Button'
import * as api from '../../services/api'

/**
 * @param {boolean} open
 * @param {Object} member
 * @param {Function} onClose
 * @param {Function} onDone
 */
function EditMemberModal({ open, member, onClose, onDone }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' })
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (member) {
      setForm({ firstName: member.first_name || '', lastName: member.last_name || '', email: member.email || '' })
    }
  }, [member])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.updateMember(member.id, form)
      onDone && onDone()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not update member')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove() {
    if (!window.confirm('Remove this member from your team? This cannot be undone.')) return
    setRemoving(true)
    try {
      await api.removeMember(member.id)
      onDone && onDone()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not remove member')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Member" size="sm">
      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input id="edit-first" label="First name" value={form.firstName} onChange={e => set('firstName', e.target.value)} />
            <Input id="edit-last" label="Last name" value={form.lastName} onChange={e => set('lastName', e.target.value)} />
          </div>
          <Input id="edit-email" label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />

          {error && <p style={{ fontSize: 13, color: 'var(--danger-500)' }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              style={{ background: 'none', border: '1px solid var(--danger-500)', color: 'var(--danger-500)', padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: removing ? 'not-allowed' : 'pointer' }}
            >
              {removing ? 'Removing…' : 'Remove from team'}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
              <Button type="submit" loading={loading}>Save Changes</Button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default EditMemberModal
