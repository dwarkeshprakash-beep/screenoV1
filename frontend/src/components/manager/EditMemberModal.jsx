import { useEffect, useState } from 'react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import * as api from '../../services/api'

function EditMemberModal({ open, member, onClose, onDone }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    employeeId: '',
    location: '',
    position: '',
  })
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!member) return
    setForm({
      firstName: member.first_name || '',
      lastName: member.last_name || '',
      email: member.email || '',
      employeeId: member.employee_id || '',
      location: member.location || '',
      position: member.current_position || '',
    })
    setConfirmRemove(false)
    setError(null)
  }, [member])

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))

  async function handleSave(event) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.updateMember(member.id, form)
      await onDone?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not update member')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    setError(null)
    try {
      await api.removeMember(member.id)
      await onDone?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not remove member')
    } finally {
      setRemoving(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid var(--slate-300)',
    borderRadius: 8,
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  }
  const label = text => (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 5 }}>
      {text}
    </label>
  )

  return (
    <Modal open={open} onClose={onClose} title="Edit Member" size="sm">
      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>{label('First name')}<input style={inputStyle} value={form.firstName} onChange={event => set('firstName', event.target.value)} /></div>
            <div>{label('Last name')}<input style={inputStyle} value={form.lastName} onChange={event => set('lastName', event.target.value)} /></div>
          </div>
          <div>{label('Email')}<input type="email" style={inputStyle} value={form.email} onChange={event => set('email', event.target.value)} /></div>

          <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', marginBottom: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Profile details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>{label('Employee ID')}<input style={inputStyle} value={form.employeeId} onChange={event => set('employeeId', event.target.value)} placeholder="EMP-001" /></div>
                <div>{label('Location')}<input style={inputStyle} value={form.location} onChange={event => set('location', event.target.value)} placeholder="Mumbai" /></div>
              </div>
              <div>{label('Job title / Position')}<input style={inputStyle} value={form.position} onChange={event => set('position', event.target.value)} placeholder="Senior Engineer" /></div>
            </div>
          </div>

          {error && <p style={{ fontSize: 13, color: 'var(--danger-500)', margin: 0 }}>{error}</p>}

          {confirmRemove ? (
            <div style={{ padding: 12, border: '1px solid var(--danger-100)', background: 'var(--danger-50)', borderRadius: 9 }}>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--danger-700)' }}>
                Remove this member from your team? Their account and interview history will remain.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button type="button" variant="secondary" onClick={() => setConfirmRemove(false)}>Keep member</Button>
                <button type="button" onClick={handleRemove} disabled={removing} style={{ background: 'var(--danger-600)', border: 0, color: 'white', padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: removing ? 'not-allowed' : 'pointer' }}>
                  {removing ? 'Removing...' : 'Confirm removal'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <button type="button" onClick={() => setConfirmRemove(true)} style={{ background: 'none', border: '1px solid var(--danger-500)', color: 'var(--danger-500)', padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                Remove from team
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
                <Button type="submit" loading={loading}>Save Changes</Button>
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}

export default EditMemberModal
