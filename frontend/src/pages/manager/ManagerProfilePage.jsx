// pages/manager/ManagerProfilePage.jsx
// Logged-in manager's own profile — view name/email, edit name, change password.

import { useState, useEffect } from 'react'
import Avatar from '../../components/shared/Avatar'
import Button from '../../components/shared/Button'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import * as api from '../../services/api'

// ── Helpers ──────────────────────────────────────────────────

function RoleBadge({ role }) {
  const colors = {
    manager:     { bg: 'var(--brand-50)',   color: 'var(--brand-700)'   },
    interviewer: { bg: 'var(--success-50)', color: 'var(--success-700)' },
    candidate:   { bg: 'var(--slate-100)',  color: 'var(--fg-muted)'    },
  }
  const style = colors[role] || colors.candidate
  return (
    <span style={{
      padding: '3px 10px',
      borderRadius: 99,
      background: style.bg,
      color: style.color,
      fontSize: 12,
      fontWeight: 600,
      textTransform: 'capitalize',
    }}>
      {role}
    </span>
  )
}

// ── Page ─────────────────────────────────────────────────────

function ManagerProfilePage() {
  // ── Data state ───────────────────────────────────────────
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  // ── Name edit state ──────────────────────────────────────
  const [firstName, setFirstName]   = useState('')
  const [lastName, setLastName]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [nameSuccess, setNameSuccess] = useState(false)
  const [nameError, setNameError]   = useState(null)

  // ── Password state ───────────────────────────────────────
  const [currentPassword, setCurrentPassword]   = useState('')
  const [newPassword, setNewPassword]           = useState('')
  const [confirmPassword, setConfirmPassword]   = useState('')
  const [pwSaving, setPwSaving]                 = useState(false)
  const [pwSuccess, setPwSuccess]               = useState(false)
  const [pwError, setPwError]                   = useState(null)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getManagerProfile()
      setProfile(res.data)
      setFirstName(res.data.first_name || '')
      setLastName(res.data.last_name || '')
    } catch (err) {
      setError('Could not load profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveName(e) {
    e.preventDefault()
    setSaving(true)
    setNameSuccess(false)
    setNameError(null)
    try {
      const res = await api.updateManagerProfile({ firstName, lastName })
      setProfile(res.data)
      setFirstName(res.data.first_name || '')
      setLastName(res.data.last_name || '')
      setNameSuccess(true)
    } catch (err) {
      setNameError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwSuccess(false)
    setPwError(null)
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.')
      return
    }
    setPwSaving(true)
    try {
      await api.updateManagerProfile({ currentPassword, newPassword })
      setPwSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPwError(err.message)
    } finally {
      setPwSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────
  if (loading) return <div style={{ padding: 40 }}><Spinner /></div>
  if (error)   return <ErrorMessage message={error} />

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    fontSize: 14,
    color: 'var(--fg-body)',
    background: 'var(--bg-surface)',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  }

  const sectionStyle = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px 24px',
    marginBottom: 20,
    boxShadow: 'var(--shadow-sm)',
  }

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--fg-muted)',
    marginBottom: 6,
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-primary)', marginBottom: 24 }}>
        My Profile
      </div>

      {/* Identity card */}
      <div style={{ ...sectionStyle, display: 'flex', alignItems: 'center', gap: 20 }}>
        <Avatar name={`${profile.first_name} ${profile.last_name}`} size={56} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-primary)' }}>
            {profile.first_name} {profile.last_name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 2 }}>{profile.email}</div>
          <div style={{ marginTop: 8 }}><RoleBadge role={profile.role} /></div>
        </div>
      </div>

      {/* Edit name */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 600, marginBottom: 16 }}>Edit Name</div>
        <form onSubmit={handleSaveName}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>First name</label>
              <input style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>Last name</label>
              <input style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
          {nameError   && <div style={{ color: 'var(--danger-600)', fontSize: 13, marginBottom: 10 }}>{nameError}</div>}
          {nameSuccess && <div style={{ color: 'var(--success-700)', fontSize: 13, marginBottom: 10 }}>Name updated successfully.</div>}
          <Button type="submit" variant="primary" size="sm" disabled={saving}>
            {saving ? 'Saving…' : 'Save Name'}
          </Button>
        </form>
      </div>

      {/* Change password */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 600, marginBottom: 16 }}>Change Password</div>
        <form onSubmit={handleChangePassword}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Current password</label>
            <input type="password" style={inputStyle} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>New password</label>
            <input type="password" style={inputStyle} value={newPassword} onChange={e => setNewPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Confirm new password</label>
            <input type="password" style={inputStyle} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          {pwError   && <div style={{ color: 'var(--danger-600)', fontSize: 13, marginBottom: 10 }}>{pwError}</div>}
          {pwSuccess && <div style={{ color: 'var(--success-700)', fontSize: 13, marginBottom: 10 }}>Password changed successfully.</div>}
          <Button type="submit" variant="primary" size="sm" disabled={pwSaving}>
            {pwSaving ? 'Saving…' : 'Change Password'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default ManagerProfilePage
