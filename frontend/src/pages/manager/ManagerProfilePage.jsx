import { useState, useEffect } from 'react'
import { ArrowLeft, KeyRound } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import * as api from '../../services/api'

const AV_COLORS = [
  { bg: '#EDE9FE', fg: '#5B21B6' }, { bg: '#FED7AA', fg: '#9A3412' },
  { bg: '#A7F3D0', fg: '#065F46' }, { bg: '#BFDBFE', fg: '#1E40AF' },
  { bg: '#FBCFE8', fg: '#9D174D' }, { bg: '#FDE68A', fg: '#854D0E' },
  { bg: '#C7D2FE', fg: '#3730A3' }, { bg: '#FCA5A5', fg: '#7F1D1D' },
]

function avHash(s) {
  let h = 0
  for (let i = 0; i < (s || '').length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function Avatar({ name = '?', size = 64 }) {
  const c = AV_COLORS[avHash(name) % AV_COLORS.length]
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: 9999, flexShrink: 0, background: c.bg, color: c.fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: Math.round(size * 0.38), letterSpacing: '-0.01em', boxShadow: '0 0 0 2px #FFF, 0 0 0 4px #DEDAFB' }}>
      {initials}
    </div>
  )
}

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} style={{ width: 40, height: 23, borderRadius: 9999, border: 0, cursor: 'pointer', flexShrink: 0, background: on ? '#5B4FE9' : '#CBD5E1', position: 'relative', transition: 'background 160ms', padding: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 19 : 2, width: 19, height: 19, borderRadius: 9999, background: '#FFF', boxShadow: '0 1px 3px rgba(15,23,42,0.2)', transition: 'left 160ms cubic-bezier(0.2,0,0,1)' }} />
    </button>
  )
}

function ManagerProfilePage() {
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [tab, setTab]           = useState('profile')
  const [form, setForm]         = useState({})
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [nameError, setNameError] = useState(null)

  const [currentPassword, setCurrentPassword]   = useState('')
  const [newPassword, setNewPassword]           = useState('')
  const [confirmPassword, setConfirmPassword]   = useState('')
  const [pwSaving, setPwSaving]                 = useState(false)
  const [pwSuccess, setPwSuccess]               = useState(false)
  const [pwError, setPwError]                   = useState(null)

  const [notifs, setNotifs] = useState({ notifyEmail: true, notifyInApp: true, notifyResults: false, notifyReminders: true, twoFactor: false })

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getManagerProfile()
      setProfile(res.data)
      const d = res.data
      setForm({
        name: `${d.first_name || ''} ${d.last_name || ''}`.trim(),
        title: d.title || d.job_title || '',
        email: d.email || '',
        phone: d.phone || '',
        department: d.department || '',
        team: d.team || '',
        loc: d.location || d.loc || '',
        timezone: d.timezone || '',
      })
    } catch (err) {
      setError('Could not load profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setNameError(null)
    try {
      const parts = form.name.trim().split(/\s+/)
      const firstName = parts[0] || ''
      const lastName = parts.slice(1).join(' ')
      const res = await api.updateManagerProfile({ firstName, lastName })
      setProfile(res.data)
      setSaved(true)
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
    if (newPassword !== confirmPassword) { setPwError('New passwords do not match.'); return }
    if (newPassword.length < 6) { setPwError('New password must be at least 6 characters.'); return }
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

  if (loading) return <Spinner center />
  if (error) return <ErrorMessage message={error} />

  const cardStyle = { background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }
  const eyebrowStyle = { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5B4FE9' }

  const profileFields = [
    { k: 'name',       label: 'Full name',   editable: true },
    { k: 'email',      label: 'Email',       editable: false },
    { k: 'title',      label: 'Job title',   editable: false },
    { k: 'phone',      label: 'Phone',       editable: false },
    { k: 'department', label: 'Department',  editable: false },
    { k: 'team',       label: 'Team',        editable: false },
    { k: 'loc',        label: 'Location',    editable: false },
    { k: 'timezone',   label: 'Timezone',    editable: false },
  ]

  const notifOptions = [
    { k: 'notifyEmail',     label: 'Email notifications',    desc: 'Pipeline updates and weekly digests' },
    { k: 'notifyInApp',     label: 'In-app notifications',   desc: 'Show the bell badge for new activity' },
    { k: 'notifyResults',   label: 'Report ready alerts',    desc: 'Notify me when an AI report is generated' },
    { k: 'notifyReminders', label: 'Scorecard reminders',    desc: 'Nudge me about overdue scorecards' },
  ]

  return (
    <div style={{ maxWidth: 760 }}>
      <button onClick={() => window.history.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 0, color: '#5B4FE9', fontWeight: 500, fontSize: 13, cursor: 'pointer', marginBottom: 20, fontFamily: 'inherit' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Avatar name={form.name || 'M'} size={64} />
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>{form.name}</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>{form.title}{form.department ? ` · ${form.department}` : ''}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E2E8F0', marginBottom: 20 }}>
        {[{ id: 'profile', label: 'Profile' }, { id: 'settings', label: 'Account settings' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: 'transparent', border: 0, padding: '10px 14px', fontSize: 13, fontWeight: tab === t.id ? 600 : 500, color: tab === t.id ? '#3A31A3' : '#6B7280', borderBottom: tab === t.id ? '2px solid #5B4FE9' : '2px solid transparent', marginBottom: -1, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <form onSubmit={handleSave}>
          <div style={cardStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {profileFields.map(f => (
                <div key={f.k}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                    {f.label}
                    {!f.editable && <span style={{ fontSize: 11, fontWeight: 400, color: '#94A3B8', marginLeft: 6 }}>(read only)</span>}
                  </label>
                  <input
                    readOnly={!f.editable}
                    value={form[f.k] || ''}
                    onChange={f.editable ? e => { setForm(prev => ({ ...prev, [f.k]: e.target.value })); setSaved(false) } : undefined}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: f.editable ? '#FFF' : '#F8FAFC', color: f.editable ? '#0F172A' : '#6B7280', cursor: f.editable ? 'text' : 'default' }}
                    onFocus={f.editable ? e => { e.target.style.borderColor = '#5B4FE9'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' } : undefined}
                    onBlur={f.editable ? e => { e.target.style.borderColor = '#CBD5E1'; e.target.style.boxShadow = 'none' } : undefined}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
              <button type="submit" disabled={saving} style={{ background: saving ? '#E2E8F0' : '#5B4FE9', color: saving ? '#94A3B8' : '#FFF', border: 0, borderRadius: 8, fontWeight: 600, padding: '8px 14px', fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              {saved && <span style={{ fontSize: 13, color: '#047857' }}>Profile saved</span>}
              {nameError && <span style={{ fontSize: 13, color: '#B53618' }}>{nameError}</span>}
            </div>
          </div>
        </form>
      )}

      {tab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={cardStyle}>
            <div style={eyebrowStyle}>Notifications</div>
            <div style={{ marginTop: 8 }}>
              {notifOptions.map((o, i) => (
                <div key={o.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: i ? '1px solid #F1F5F9' : '0' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{o.label}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>{o.desc}</div>
                  </div>
                  <Toggle on={notifs[o.k]} onClick={() => setNotifs(prev => ({ ...prev, [o.k]: !prev[o.k] }))} />
                </div>
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={eyebrowStyle}>Security</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Two-factor authentication</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>Require a code at sign-in</div>
              </div>
              <Toggle on={notifs.twoFactor} onClick={() => setNotifs(prev => ({ ...prev, twoFactor: !prev.twoFactor }))} />
            </div>
            <div style={{ paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
              <form onSubmit={handleChangePassword}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                  {[
                    { label: 'Current password', value: currentPassword, setter: setCurrentPassword, auto: 'current-password' },
                    { label: 'New password',      value: newPassword,     setter: setNewPassword,     auto: 'new-password' },
                    { label: 'Confirm password',  value: confirmPassword, setter: setConfirmPassword,  auto: 'new-password' },
                  ].map(f => (
                    <div key={f.label}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{f.label}</label>
                      <input
                        type="password"
                        value={f.value}
                        onChange={e => f.setter(e.target.value)}
                        autoComplete={f.auto}
                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                        onFocus={e => { e.target.style.borderColor = '#5B4FE9'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }}
                        onBlur={e => { e.target.style.borderColor = '#CBD5E1'; e.target.style.boxShadow = 'none' }}
                      />
                    </div>
                  ))}
                </div>
                {pwError && <div style={{ color: '#B53618', fontSize: 13, marginBottom: 10 }}>{pwError}</div>}
                {pwSuccess && <div style={{ color: '#047857', fontSize: 13, marginBottom: 10 }}>Password changed successfully.</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" disabled={pwSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFF', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: 8, fontWeight: 600, padding: '8px 14px', fontSize: 13, cursor: pwSaving ? 'not-allowed' : 'pointer' }}>
                    <KeyRound size={13} /> {pwSaving ? 'Saving...' : 'Change password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManagerProfilePage

