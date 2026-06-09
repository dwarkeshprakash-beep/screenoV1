// components/manager/EditMemberModal.jsx
// Edit a team member's editable fields. Profile fields (employee ID, location, position)
// update the matching users row via the backend PATCH endpoint.

import { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import * as api from '../../services/api'

function EditMemberModal({ open, member, onClose, onDone }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', employeeId: '', location: '', position: '' })
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (member) {
      setForm({
        firstName:  member.first_name      || '',
        lastName:   member.last_name       || '',
        email:      member.email           || '',
        employeeId: member.employee_id     || '',
        location:   member.location        || '',
        position:   member.current_position || '',
      })
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

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: 8,
    fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 120ms, box-shadow 120ms',
  }
  const onFocus = e => { e.target.style.borderColor = '#5B4FE9'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }
  const onBlur  = e => { e.target.style.borderColor = '#CBD5E1'; e.target.style.boxShadow = 'none' }
  const lbl = text => <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{text}</label>

  return (
    <Modal open={open} onClose={onClose} title="Edit Member" size="sm">
      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>{lbl('First name')}<input style={inputStyle} onFocus={onFocus} onBlur={onBlur} value={form.firstName} onChange={e => set('firstName', e.target.value)} /></div>
            <div>{lbl('Last name')}<input style={inputStyle} onFocus={onFocus} onBlur={onBlur} value={form.lastName} onChange={e => set('lastName', e.target.value)} /></div>
          </div>
          <div>{lbl('Email')}<input type="email" style={inputStyle} onFocus={onFocus} onBlur={onBlur} value={form.email} onChange={e => set('email', e.target.value)} /></div>

          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Profile details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>{lbl('Employee ID')}<input style={inputStyle} onFocus={onFocus} onBlur={onBlur} value={form.employeeId} onChange={e => set('employeeId', e.target.value)} placeholder="e.g. EMP-001" /></div>
                <div>{lbl('Location')}<input style={inputStyle} onFocus={onFocus} onBlur={onBlur} value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Mumbai" /></div>
              </div>
              <div>{lbl('Job title / Position')}<input style={inputStyle} onFocus={onFocus} onBlur={onBlur} value={form.position} onChange={e => set('position', e.target.value)} placeholder="e.g. Senior Engineer" /></div>
            </div>
          </div>

          {error && <p style={{ fontSize: 13, color: 'var(--danger-500)', margin: 0 }}>{error}</p>}

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
