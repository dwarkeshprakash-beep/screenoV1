import { useEffect, useState } from 'react'
import { FileText, Sparkles, Upload, X } from 'lucide-react'
import Button from '../../shared/Button'
import ErrorMessage from '../../shared/ErrorMessage'
import Modal from '../../shared/Modal'
import * as api from '../../../services/api'
import Field from './Field'
import { parseTags } from './mandateHelpers'

function EditMandateModal({ open, template, onClose, onSaved }) {
  const [form, setForm] = useState({})
  const [tags, setTags] = useState([])
  const [saving, setSaving] = useState(false)
  const [extractingFile, setExtractingFile] = useState(false)
  const [extractingTags, setExtractingTags] = useState(false)
  const [error, setError] = useState(null)
  const [bdes, setBdes] = useState([])
  const [assignedBdeId, setAssignedBdeId] = useState('')

  useEffect(() => {
    if (!open) return
    setForm({
      client_name: template.client_name || '',
      client_email: template.client_email || '',
      requirements: template.requirements || '',
      custom_info: template.custom_info || '',
      jd_text: template.jd_text || '',
      jd_file_path: template.jd_file_path || null,
      jd_original_filename: template.jd_original_filename || '',
    })
    setTags(parseTags(template.tags))
    setAssignedBdeId(template.assigned_bde_id ? String(template.assigned_bde_id) : '')
    setError(null)
    async function loadBdes() {
      try {
        const response = await api.getClientTemplateBdes()
        setBdes(response.data || [])
      } catch {
        setBdes([])
      }
    }
    loadBdes()
  }, [open, template])

  async function readJdFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setExtractingFile(true)
    setError(null)
    try {
      const response = await api.uploadJdFile(file)
      const { text, filePath, fileName } = response.data || {}
      setForm(current => ({
        ...current,
        jd_text: String(text || '').trim() ? text : current.jd_text,
        jd_file_path: filePath || null,
        jd_original_filename: fileName || file.name,
      }))
    } catch (err) {
      setError(err.message || 'Could not upload the JD file.')
    } finally {
      setExtractingFile(false)
    }
  }

  function clearJdFile() {
    setForm(current => ({ ...current, jd_file_path: null, jd_original_filename: '' }))
  }

  async function regenerateTags() {
    if (!String(form.jd_text || '').trim()) {
      setError('Add a job description before regenerating skills.')
      return
    }
    setExtractingTags(true)
    setError(null)
    try {
      const response = await api.extractTemplateTags(form.jd_text)
      setTags(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      setError(err.message || 'Could not regenerate matching skills.')
    } finally {
      setExtractingTags(false)
    }
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const payload = { ...form, tags: JSON.stringify(tags), assigned_bde_id: assignedBdeId ? Number(assignedBdeId) : undefined }
      const response = await api.updateClientTemplate(template.id, payload)
      onSaved(response.data || { ...template, ...payload })
    } catch (err) { setError(err.message || 'Could not update the mandate.') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit client mandate" size="md">
      <div className="workspace-stack">
        <div className="form-grid">
          <Field label="Client name"><input className="form-input" value={form.client_name || ''} onChange={e => setForm(c => ({ ...c, client_name: e.target.value }))} /></Field>
          <Field label="Client email"><input className="form-input" type="email" value={form.client_email || ''} onChange={e => setForm(c => ({ ...c, client_email: e.target.value }))} /></Field>
          <Field label="Mandate summary" full><textarea className="form-input" rows={3} value={form.requirements || ''} onChange={e => setForm(c => ({ ...c, requirements: e.target.value }))} style={{ resize: 'vertical' }} /></Field>
          <Field label="Assign BDE (optional)" help="Lets a BDE view this mandate too. Leave unselected if not needed.">
            <select className="form-input" value={assignedBdeId} onChange={event => setAssignedBdeId(event.target.value)}>
              <option value="">No BDE assigned</option>
              {bdes.map(b => <option key={b.id} value={b.id}>{b.first_name} {b.last_name} ({b.email})</option>)}
            </select>
          </Field>
          <Field label="Internal notes" full><textarea className="form-input" rows={4} value={form.custom_info || ''} onChange={e => setForm(c => ({ ...c, custom_info: e.target.value }))} style={{ resize: 'vertical' }} /></Field>
          <Field label="Mandate job description" full help="This is the shared JD. Role profiles can keep their own JDs. The uploaded file is kept even if text extraction misses something.">
            <div className="workspace-stack" style={{ gap: 8 }}>
              <input id="edit-mandate-jd-file" type="file" accept=".pdf,.doc,.docx,.txt" onChange={readJdFile} style={{ display: 'none' }} />
              <label htmlFor="edit-mandate-jd-file" className="product-button product-button--secondary product-button--sm" style={{ alignSelf: 'flex-start', cursor: extractingFile ? 'wait' : 'pointer' }}>
                <Upload size={13} />{extractingFile ? 'Uploading…' : 'Upload JD file'}
              </label>
              {form.jd_original_filename && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-muted)' }}>
                  <FileText size={13} />
                  {template.jd_file_url
                    ? <a href={template.jd_file_url} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.jd_original_filename}</a>
                    : <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.jd_original_filename}</span>}
                  <button type="button" onClick={clearJdFile} title="Remove file" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--fg-muted)', display: 'inline-flex' }}>
                    <X size={12} />
                  </button>
                </div>
              )}
              <textarea className="form-input" rows={10} value={form.jd_text || ''} onChange={event => setForm(current => ({ ...current, jd_text: event.target.value }))} placeholder="Paste the mandate JD…" style={{ resize: 'vertical' }} />
            </div>
          </Field>
          <div className="form-field form-field--full" style={{ padding: 12, border: '1px solid var(--border-default)', borderRadius: 8 }}>
            <div className="workspace-section-heading" style={{ marginBottom: 8 }}>
              <div><h3 style={{ fontSize: 15 }}>Matching skills</h3><p>Regenerate these after changing the JD.</p></div>
              <Button variant="secondary" size="sm" onClick={regenerateTags} loading={extractingTags}><Sparkles size={13} />Regenerate</Button>
            </div>
            {tags.length > 0
              ? <div className="tag-list">{tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div>
              : <span className="form-help">No matching skills generated yet.</span>}
          </div>
        </div>
        {error && <ErrorMessage message={error} />}
        <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>Save changes</Button>
        </div>
      </div>
    </Modal>
  )
}

export default EditMandateModal
