import { useState } from 'react'
import { ExternalLink, FileText, Trash2 } from 'lucide-react'
import Button from '../../shared/Button'
import FileUploadButton from '../../shared/FileUploadButton'
import * as api from '../../../services/api'

// Mirrors the backend limits in middleware/upload.js (studyMaterialUpload).
const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.txt'

// Optional study-material file on a monthly subject. Uploads as soon as a file is picked;
// the returned path is only attached to the subject when the wizard is saved.
// value: { path, name, url } | null. onUploadingChange lets the parent block saving mid-upload.
function StudyMaterialFileField({ value, onChange, onUploadingChange }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  function setBusy(busy) {
    setUploading(busy)
    onUploadingChange?.(busy)
  }

  async function handleFile(file) {
    if (file.size > MAX_BYTES) {
      setError('File is too large. The limit is 10 MB.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const response = await api.uploadStudyMaterialFile(file)
      const { filePath, fileName, fileUrl, textReadable } = response.data || {}
      onChange({ path: filePath, name: fileName || file.name, url: fileUrl || null, textReadable })
    } catch (uploadError) {
      setError(uploadError.message || 'Could not upload the file.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="workspace-stack" style={{ gap: 8 }}>
      <div>
        <h4 style={{ fontSize: 14, margin: 0 }}>Study material file</h4>
        <p className="form-help" style={{ margin: '2px 0 0' }}>
          Optional. Assigned candidates can open this file from their Interviews page,
          and its contents are used to generate assessment questions.
        </p>
      </div>

      {value?.path ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
          border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--bg-page)',
        }}>
          <FileText size={18} color="var(--brand-500)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {value.name}
          </span>
          {value.url && (
            <a href={value.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--brand-600)' }}>
              <ExternalLink size={13} />
              View
            </a>
          )}
          <Button size="sm" variant="secondary" onClick={() => onChange(null)} aria-label="Remove study material file">
            <Trash2 size={14} />
            Remove
          </Button>
        </div>
      ) : (
        <FileUploadButton
          label="Upload study material"
          helperText="PDF, Word, PowerPoint or TXT - up to 10 MB"
          accept={ACCEPT}
          uploading={uploading}
          onFileSelected={handleFile}
        />
      )}

      {/* Only known right after an upload; an already-saved file doesn't carry this flag */}
      {value?.path && value.textReadable === false && (
        <span style={{ fontSize: 12, color: 'var(--warning-700)' }}>
          The text in this file couldn't be read (for example a scanned PDF or an old .ppt).
          Candidates can still open it, but questions will be based on the sub-topics and the text above.
        </span>
      )}
      {error && <span style={{ fontSize: 12, color: 'var(--danger-700)' }}>{error}</span>}
    </div>
  )
}

export default StudyMaterialFileField
