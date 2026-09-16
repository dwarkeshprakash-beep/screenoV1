import { useState, useEffect, useCallback } from 'react'
import { FileText, Star, Trash2 } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ChangePasswordForm from '../../components/shared/ChangePasswordForm'
import FileUploadButton from '../../components/shared/FileUploadButton'
import * as api from '../../services/api'

const MAX_RESUMES = 5

function CandidateProfilePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [availability, setAvailability] = useState('bench')
  const [resumeTags, setResumeTags] = useState([])
  const [resumes, setResumes] = useState([])
  const [resumeUploading, setResumeUploading] = useState(false)
  const [resumeActionId, setResumeActionId] = useState(null)
  const [message, setMessage] = useState(null)

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })()
  const firstName = user.first_name || user.name?.split(' ')[0] || ''
  const initials = [user.first_name, user.last_name].filter(Boolean).map(n => n[0]?.toUpperCase()).join('') || firstName[0]?.toUpperCase() || '?'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [profileRes, resumesRes] = await Promise.all([api.getProfile(), api.getResumes()])
      const p = profileRes.data || {}
      setAvailability(p.availability || 'bench')
      try { setResumeTags(JSON.parse(p.tags || '[]')) } catch { setResumeTags([]) }
      setResumes(resumesRes.data || [])
      let stored = {}
      try { stored = JSON.parse(localStorage.getItem('user') || '{}') } catch { stored = {} }
      localStorage.setItem('user', JSON.stringify({ ...stored, ...p }))
    } catch { setError('Could not load your profile.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

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

  if (loading) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>

  return (
    <div style={{ padding: '1.5rem 1.75rem', maxWidth: '44rem', margin: '0 auto' }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-primary)', letterSpacing: '-0.02em', margin: 0 }}>Profile</h1>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4, marginBottom: 0 }}>Manage your availability and resume</p>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--danger-50)', color: 'var(--danger-700)', fontSize: 13, marginBottom: 20, border: '1px solid var(--danger-100)' }}>
          {error}
        </div>
      )}
      {message && (
        <div onClick={() => setMessage(null)} style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 20, cursor: 'pointer', border: `1px solid ${message.type === 'success' ? 'var(--success-100)' : 'var(--danger-100)'}`, background: message.type === 'success' ? 'var(--success-50)' : 'var(--danger-50)', color: message.type === 'success' ? 'var(--success-700)' : 'var(--danger-700)' }}>
          {message.text}
        </div>
      )}

      {/* Identity */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '20px', boxShadow: 'var(--shadow-sm)', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>{initials}</span>
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>
              {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'Candidate'}
            </p>
            {user.email && <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '3px 0 0' }}>{user.email}</p>}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Availability</p>
          <div style={{ display: 'flex', padding: 3, background: 'var(--bg-surface-alt)', borderRadius: 9, width: 'fit-content' }}>
            {['bench', 'client_side'].map(val => (
              <button key={val} type="button" onClick={() => handleAvailabilityChange(val)}
                style={{ padding: '8px 22px', borderRadius: 7, border: 0, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: `all var(--dur-fast) var(--ease-standard)`, background: availability === val ? 'var(--bg-surface)' : 'transparent', color: availability === val ? 'var(--fg-primary)' : 'var(--fg-muted)', boxShadow: availability === val ? 'var(--shadow-sm)' : 'none' }}>
                {val === 'bench' ? 'On Bench' : 'Client Side'}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: '10px 0 0' }}>
            {availability === 'bench' ? 'You are available for new assignments.' : 'You are currently deployed at a client.'}
          </p>
        </div>
      </div>

      {/* Resumes */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '20px', boxShadow: 'var(--shadow-sm)', marginBottom: resumeTags.length > 0 ? 14 : 0 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Resumes ({resumes.length}/{MAX_RESUMES})
        </p>

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
            ? `You've reached the ${MAX_RESUMES}-resume limit — delete one to add another.`
            : 'PDF, DOC, DOCX or TXT'}
          accept=".pdf,.doc,.docx,.txt"
          disabled={resumes.length >= MAX_RESUMES}
          uploading={resumeUploading}
          onFileSelected={handleResumeUpload}
        />
      </div>

      {/* Extracted skills */}
      {resumeTags.length > 0 && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Extracted Skills</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {resumeTags.map(t => (
              <span key={t} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: 'var(--brand-50)', color: 'var(--brand-700)', fontWeight: 600, border: '1px solid var(--brand-100)' }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '20px', boxShadow: 'var(--shadow-sm)', marginTop: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Security</p>
        <ChangePasswordForm />
      </div>
    </div>
  )
}

export default CandidateProfilePage
