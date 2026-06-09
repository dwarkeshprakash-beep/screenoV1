// components/manager/EditMemberModal.jsx
// Edit a team member's editable fields. Org-level fields (employee ID, department,
// location, job title) are read from the users/departments tables and are read-only here.

import { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import * as api from '../../services/api'

function EditMemberModal({ open, member, onClose, onDone }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' })
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (member) {
      setForm({
        firstName: member.first_name || '',
        lastName:  member.last_name  || '',
        email:     member.email      || '',
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

          {/* Read-only org fields sourced from users/departments tables */}
          {(member?.employee_id || member?.department || member?.location || member?.current_position) && (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>From HRMS (read-only)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: '#374151' }}>
                {member.employee_id      && <div><span style={{ color: '#94A3B8' }}>ID: </span>{member.employee_id}</div>}
                {member.department       && <div><span style={{ color: '#94A3B8' }}>Dept: </span>{member.department}</div>}
                {member.location         && <div><span style={{ color: '#94A3B8' }}>Location: </span>{member.location}</div>}
                {member.current_position && <div><span style={{ color: '#94A3B8' }}>Position: </span>{member.current_position}</div>}
              </div>
            </div>
          )}

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
