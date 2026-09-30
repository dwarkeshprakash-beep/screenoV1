// MandateResumeAction - "submit your resume for this client" box on a candidate's
// mandate card. Lets them pick one of their saved resumes or upload a new one; the
// backend links it to this client_teams row (ownership-checked server side).
import { useState } from 'react'
import FileUploadButton from '../shared/FileUploadButton'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

function MandateResumeAction({ clientTeamId, resumes, deadline, onSubmitted }) {
  const [selectedId, setSelectedId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Default to the candidate's default resume, else the first one
  const fallbackId = resumes.find(r => r.isDefault)?.id ?? resumes[0]?.id
  const resumeId = selectedId ?? fallbackId

  async function submit(action) {
    setSubmitting(true)
    setError(null)
    try {
      await action()
      onSubmitted?.()
    } catch (err) {
      setError(err.message || 'Could not submit resume.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ padding: '14px 16px', borderRadius: 8, background: 'var(--warning-50)', border: '1px solid var(--warning-100)', margin: '10px 0' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning-700)', margin: '0 0 10px' }}>
        Action needed - submit your resume for this client
        {deadline ? ` by ${formatDate(deadline)}` : ''}
      </p>

      {resumes.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <select
            value={resumeId}
            onChange={e => setSelectedId(Number(e.target.value))}
            disabled={submitting}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border-default)', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', background: 'var(--bg-surface)' }}
          >
            {resumes.map(r => (
              <option key={r.id} value={r.id}>{r.filename}{r.isDefault ? ' (Default)' : ''}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={submitting || !resumeId}
            onClick={() => submit(() => api.submitExistingResumeForClient(clientTeamId, resumeId))}
            style={{ padding: '8px 14px', background: 'var(--fg-primary)', border: 0, borderRadius: 7, fontSize: 12, fontWeight: 600, color: 'var(--bg-surface)', cursor: 'pointer' }}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      )}

      <FileUploadButton
        label="Upload a new resume for this client"
        accept=".pdf,.doc,.docx"
        uploading={submitting}
        disabled={submitting}
        onFileSelected={file => submit(() => api.submitClientResume(clientTeamId, file))}
      />

      {error && <p style={{ fontSize: 12, color: 'var(--danger-700)', margin: '8px 0 0' }}>{error}</p>}
    </div>
  )
}

export default MandateResumeAction
