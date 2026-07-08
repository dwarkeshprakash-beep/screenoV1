import { useState, useEffect, useCallback } from 'react'
import { UploadCloud } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import * as api from '../../services/api'

function CandidateProfilePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [availability, setAvailability] = useState('bench')
  const [resumeTags, setResumeTags] = useState([])
  const [resumeUploading, setResumeUploading] = useState(false)
  const [message, setMessage] = useState(null)

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })()
  const firstName = user.first_name || user.name?.split(' ')[0] || ''
  const initials = [user.first_name, user.last_name].filter(Boolean).map(n => n[0]?.toUpperCase()).join('') || firstName[0]?.toUpperCase() || '?'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getProfile()
      const p = res.data || {}
      setAvailability(p.availability || 'bench')
      try { setResumeTags(JSON.parse(p.tags || '[]')) } catch { setResumeTags([]) }
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

  async function handleResumeUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setResumeUploading(true)
    setMessage(null)
    try {
      await api.uploadOwnResume(file)
      setMessage({ type: 'success', text: 'Resume uploaded. Skills will be extracted shortly.' })
      await load()
    } catch (err) { setMessage({ type: 'error', text: err.message || 'Upload failed.' }) }
    finally { setResumeUploading(false); e.target.value = '' }
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

      {/* Resume */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '20px', boxShadow: 'var(--shadow-sm)', marginBottom: resumeTags.length > 0 ? 14 : 0 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Main Resume</p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, border: '1.5px dashed var(--border-strong)', borderRadius: 10, cursor: 'pointer', background: 'var(--bg-page)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UploadCloud size={18} color="var(--brand-500)" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)', margin: 0 }}>
              {resumeUploading ? 'Uploading…' : 'Upload or Replace Resume'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: '2px 0 0' }}>PDF format · Used for all interviews by default</p>
          </div>
          <input type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={handleResumeUpload} disabled={resumeUploading} />
        </label>
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
    </div>
  )
}

export default CandidateProfilePage
