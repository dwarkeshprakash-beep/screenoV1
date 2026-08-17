import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import * as api from '../../services/api'
import { PASSWORD_RULES, validatePassword } from '../../utils/password-policy'

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setSuccess(false)
    setError(null)
    if (!currentPassword) { setError('Enter your current password.'); return }
    const passwordError = validatePassword(newPassword)
    if (passwordError) { setError(passwordError); return }
    if (newPassword === currentPassword) { setError('New password must be different from your current password.'); return }
    if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return }

    setSaving(true)
    try {
      await api.changePassword({ currentPassword, newPassword })
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message || 'Could not change password.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: 'var(--bg-surface)', color: 'var(--fg-primary)' }

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ color: 'var(--fg-muted)', fontSize: 12, lineHeight: 1.5, margin: '0 0 14px' }}>
        {PASSWORD_RULES} Your new password must also be different from your current password.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
        {[
          { label: 'Current password', value: currentPassword, setter: setCurrentPassword, autoComplete: 'current-password' },
          { label: 'New password', value: newPassword, setter: setNewPassword, autoComplete: 'new-password' },
          { label: 'Confirm new password', value: confirmPassword, setter: setConfirmPassword, autoComplete: 'new-password' },
        ].map(field => (
          <label key={field.label} style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)' }}>
            {field.label}
            <input
              type="password"
              required
              value={field.value}
              onChange={event => field.setter(event.target.value)}
              autoComplete={field.autoComplete}
              style={{ ...inputStyle, marginTop: 5 }}
            />
          </label>
        ))}
      </div>
      {error && <div role="alert" style={{ color: 'var(--danger-700)', fontSize: 13, marginBottom: 10 }}>{error}</div>}
      {success && <div role="status" style={{ color: 'var(--success-600)', fontSize: 13, marginBottom: 10 }}>Password changed successfully. Use the new password next time you sign in.</div>}
      <button type="submit" disabled={saving} className="product-button product-button--secondary product-button--md">
        <KeyRound size={14} /> {saving ? 'Changing...' : 'Change password'}
      </button>
    </form>
  )
}

export default ChangePasswordForm
