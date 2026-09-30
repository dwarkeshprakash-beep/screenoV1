import { UploadCloud } from 'lucide-react'

// Dashed-border "pick a file" control shared by the candidate profile page and the
// client-mandate resume picker - both need the same label/input-hidden pattern.
function FileUploadButton({ label, helperText, accept, disabled, uploading, onFileSelected }) {

  function handleChange(e) {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file)
    e.target.value = ''
  }

  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: 16,
      border: '1.5px dashed var(--border-strong)', borderRadius: 10,
      cursor: disabled ? 'not-allowed' : 'pointer', background: 'var(--bg-page)',
      opacity: disabled ? 0.6 : 1,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <UploadCloud size={18} color="var(--fg-muted)" />
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)', margin: 0 }}>
          {uploading ? 'Uploading…' : label}
        </p>
        {helperText && <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: '2px 0 0' }}>{helperText}</p>}
      </div>
      <input type="file" accept={accept} style={{ display: 'none' }} onChange={handleChange} disabled={disabled || uploading} />
    </label>
  )
}

export default FileUploadButton
