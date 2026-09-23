// frontend/src/pages/workspace/ProfilePage.jsx
// Merged Profile page - replaces the old separate ManagerProfilePage/CandidateProfilePage.
// Same page for every account; sections like resumes/availability show empty states
// rather than being hidden, since visibility here is a UX nicety, not access control -
// this page has no module gate, same as before the portal split existed.
import { useState, useEffect, useCallback } from 'react'
import { FileText, Star, Trash2 } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import Avatar from '../../components/shared/Avatar'
import ChangePasswordForm from '../../components/shared/ChangePasswordForm'
import FileUploadButton from '../../components/shared/FileUploadButton'
import * as api from '../../services/api'

const MAX_RESUMES = 5

function Toggle({ on, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ width: 40, height: 23, borderRadius: 9999, border: 0, cursor: 'pointer', flexShrink: 0, background: on ? 'var(--brand-500)' : 'var(--slate-300)', position: 'relative', transition: 'background 160ms', padding: 0 }}
    >
      <span style={{ position: 'absolute', top: 2, left: on ? 19 : 2, width: 19, height: 19, borderRadius: 9999, background: 'var(--bg-surface)', boxShadow: '0 1px 3px rgba(15,23,42,0.2)', transition: 'left 160ms cubic-bezier(0.2,0,0,1)' }} />
    </button>
  )
}

const cardStyle = { background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-sm)' }
const eyebrowStyle = { fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.07em' }

function ProfilePage() {
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [form, setForm]           = useState({})
  const [availability, setAvailability] = useState(null)
  const [resumeTags, setResumeTags]     = useState([])
  const [resumes, setResumes]           = useState([])
  const [resumeUploading, setResumeUploading] = useState(false)
  const [resumeActionId, setResumeActionId]   = useState(null)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [nameError, setNameError] = useState(null)
  const [message, setMessage]     = useState(null)

  const [notifs, setNotifs] = useState(() => {
    try {
      const stored = localStorage.getItem('managerNotifs')
      if (stored) return JSON.parse(stored)
    } catch {
      localStorage.removeItem('managerNotifs')
    }
    return { notifyEmail: true, notifyInApp: true, notifyResults: false, notifyReminders: true }
  })

  useEffect(() => {
    localStorage.setItem('managerNotifs', JSON.stringify(notifs))
  }, [notifs])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [profileRes, resumesRes] = await Promise.all([api.getProfile(), api.getResumes()])
      const p = profileRes.data || {}
      setForm({
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        title: p.title || p.job_title || '',
        email: p.email || '',
        phone: p.phone || '',
        department: p.department || '',
        team: p.team || '',
        loc: p.location || p.loc || '',
        timezone: p.timezone || '',
      })
      setAvailability(p.availability || null)
      try { setResumeTags(JSON.parse(p.tags || '[]')) } catch { setResumeTags([]) }
      setResumes(resumesRes.data || [])

      let stored = {}
      try { stored = JSON.parse(localStorage.getItem('user') || '{}') } catch { stored = {} }
      localStorage.setItem('user', JSON.stringify({ ...stored, ...p }))
    } catch {
      setError('Could not load your profile.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setNameError(null)
    try {
      const parts = form.name.trim().split(/\s+/)
      const firstName = parts[0] || ''
      const lastName = parts.slice(1).join(' ')
      await api.updateManagerProfile({ firstName, lastName })
      setSaved(true)
    } catch (err) {
      setNameError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAvailabilityChange(value) {
    setAvailability(value)
    try { await api.updateCandidateProfile({ availability: value }) } catch { /* non-critical */ }
  }

  async function handleResumeUpload(file) {
    setResumeUploading(true)
    setMessage(null)
    try {
      await api.uploadOwnResume(file)
      setMessage({ type: 'success', text: 'Resume uploaded.' })
      await load()
    } catch (err) { setMessage({ type: 'error', text: err.message || 'Upload failed.' }) }
    finally { setResumeUploading(false) }
  }

  async function handleSetDefault(assetId) {
    setResumeActionId(assetId)
    setMessage(null)
    try {
      await api.setDefaultResume(assetId)
      setMessage({ type: 'success', text: 'Default resume updated. Skills will be re-extracted shortly.' })
      await load()
    } catch (err) { setMessage({ type: 'error', text: err.message || 'Could not set default resume.' }) }
    finally { setResumeActionId(null) }
  }

  async function handleDeleteResume(assetId) {
    setResumeActionId(assetId)
    setMessage(null)
    try {
      await api.deleteResume(assetId)
      setMessage({ type: 'success', text: 'Resume deleted.' })
      await load()
    } catch (err) { setMessage({ type: 'error', text: err.message || 'Could not delete resume.' }) }
    finally { setResumeActionId(null) }
  }

  if (loading) return <Spinner center />
  if (error) return <ErrorMessage message={error} onRetry={load} />

  const readOnlyFields = [
    { k: 'title',      label: 'Job title' },
    { k: 'phone',      label: 'Phone' },
    { k: 'department', label: 'Department' },
    { k: 'team',       label: 'Team' },
    { k: 'loc',        label: 'Location' },
    { k: 'timezone',   label: 'Timezone' },
  ].filter(f => form[f.k])

  const notifOptions = [
    { k: 'notifyEmail',     label: 'Email notifications',    desc: 'Pipeline updates and weekly digests' },
    { k: 'notifyInApp',     label: 'In-app notifications',   desc: 'Show the bell badge for new activity' },
    { k: 'notifyResults',   label: 'Report ready alerts',    desc: 'Notify me when an AI report is generated' },
    { k: 'notifyReminders', label: 'Scorecard reminders',    desc: 'Nudge me about overdue scorecards' },
  ]

  return (
    <div className="workspace-page" style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 14 }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
        <Avatar name={form.name || form.email || 'U'} size={64} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-primary)', margin: 0, letterSpacing: '-0.02em' }}>{form.name || 'Your profile'}</h1>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 3 }}>{[form.title, form.department].filter(Boolean).join(' · ') || form.email}</p>
        </div>
      </div>

      {message && (
        <div onClick={() => setMessage(null)} style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: `1px solid ${message.type === 'success' ? 'var(--success-100)' : 'var(--danger-100)'}`, background: message.type === 'success' ? 'var(--success-50)' : 'var(--danger-50)', color: message.type === 'success' ? 'var(--success-700)' : 'var(--danger-700)' }}>
          {message.text}
        </div>
      )}

      {/* Identity */}
      <form onSubmit={handleSave}>
        <div style={cardStyle}>
          <div style={eyebrowStyle}>Profile</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 5 }}>Full name</label>
              <input
                value={form.name || ''}
                onChange={e => { setForm(prev => ({ ...prev, name: e.target.value })); setSaved(false) }}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 5 }}>
                Email <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--fg-subtle)' }}>(read only)</span>
              </label>
              <input readOnly value={form.email || ''} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: 'var(--bg-surface-alt)', color: 'var(--fg-muted)' }} />
            </div>
            {readOnlyFields.map(f => (
              <div key={f.k}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 5 }}>
                  {f.label} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--fg-subtle)' }}>(read only)</span>
                </label>
                <input readOnly value={form[f.k] || ''} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: 'var(--bg-surface-alt)', color: 'var(--fg-muted)' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
            <button type="submit" disabled={saving} style={{ background: saving ? 'var(--bg-surface-alt)' : 'var(--brand-500)', color: saving ? 'var(--fg-subtle)' : 'var(--bg-surface)', border: 0, borderRadius: 8, fontWeight: 600, padding: '8px 14px', fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saved && <span style={{ fontSize: 13, color: 'var(--success-600)' }}>Profile saved</span>}
            {nameError && <span style={{ fontSize: 13, color: 'var(--danger-700)' }}>{nameError}</span>}
          </div>
        </div>
      </form>

      {/* Availability */}
      <div style={cardStyle}>
        <div style={eyebrowStyle}>Availability</div>
        <div style={{ display: 'flex', padding: 3, background: 'var(--bg-surface-alt)', borderRadius: 9, width: 'fit-content' }}>
          {['bench', 'client_side'].map(val => (
            <button key={val} type="button" onClick={() => handleAvailabilityChange(val)}
              style={{ padding: '8px 22px', borderRadius: 7, border: 0, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: availability === val ? 'var(--bg-surface)' : 'transparent', color: availability === val ? 'var(--fg-primary)' : 'var(--fg-muted)', boxShadow: availability === val ? 'var(--shadow-sm)' : 'none' }}>
              {val === 'bench' ? 'On Bench' : 'Client Side'}
            </button>
          ))}
        </div>
      </div>

      {/* Resumes */}
      <div style={cardStyle}>
        <div style={eyebrowStyle}>Resumes ({resumes.length}/{MAX_RESUMES})</div>

        {resumes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {resumes.map(resume => (
              <div key={resume.id} style={{ padding: 14, borderRadius: 8, background: 'var(--bg-surface-alt)', border: `1px solid ${resume.isDefault ? 'var(--brand-100)' : 'var(--border-default)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={16} color="var(--brand-600)" />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {resume.filename}
                      {resume.isDefault && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'var(--brand-50)', color: 'var(--brand-700)' }}>DEFAULT</span>
                      )}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: '2px 0 0' }}>
                      {resume.size ? `${(resume.size / 1024).toFixed(1)} KB` : 'Uploaded file'}
                      {resume.uploadedAt && ` • ${new Date(resume.uploadedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <a href={resume.downloadUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-600)', textDecoration: 'none', padding: '6px 10px', borderRadius: 6, background: 'var(--brand-50)' }}>
                    View
                  </a>
                  {!resume.isDefault && (
                    <button type="button" disabled={resumeActionId === resume.id} onClick={() => handleSetDefault(resume.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', cursor: 'pointer' }}>
                      <Star size={12} />Make Default
                    </button>
                  )}
                  <button type="button" disabled={resume.isDefault || resumeActionId === resume.id} onClick={() => handleDeleteResume(resume.id)}
                    title={resume.isDefault ? 'Set another resume as default before deleting this one' : 'Delete resume'}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: resume.isDefault ? 'var(--fg-subtle)' : 'var(--danger-600)', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', cursor: resume.isDefault ? 'not-allowed' : 'pointer' }}>
                    <Trash2 size={12} />Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <FileUploadButton
          label={resumes.length >= MAX_RESUMES ? 'Resume limit reached' : 'Add Resume'}
          helperText={resumes.length >= MAX_RESUMES
            ? `You've reached the ${MAX_RESUMES}-resume limit - delete one to add another.`
            : 'PDF, DOC, DOCX or TXT'}
          accept=".pdf,.doc,.docx,.txt"
          disabled={resumes.length >= MAX_RESUMES}
          uploading={resumeUploading}
          onFileSelected={handleResumeUpload}
        />
      </div>

      {/* Extracted skills */}
      {resumeTags.length > 0 && (
        <div style={cardStyle}>
          <div style={eyebrowStyle}>Extracted Skills</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {resumeTags.map(t => (
              <span key={t} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: 'var(--brand-50)', color: 'var(--brand-700)', fontWeight: 600, border: '1px solid var(--brand-100)' }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      <div style={cardStyle}>
        <div style={eyebrowStyle}>Notifications</div>
        {notifOptions.map((o, i) => (
          <div key={o.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: i ? '1px solid var(--border-default)' : '0' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)' }}>{o.label}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 1 }}>{o.desc}</div>
            </div>
            <Toggle on={notifs[o.k]} onClick={() => setNotifs(prev => ({ ...prev, [o.k]: !prev[o.k] }))} />
          </div>
        ))}
      </div>

      {/* Security */}
      <div style={cardStyle}>
        <div style={eyebrowStyle}>Security</div>
        <ChangePasswordForm />
      </div>
    </div>
  )
}

export default ProfilePage
