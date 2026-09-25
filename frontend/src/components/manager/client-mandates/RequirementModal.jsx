import { useEffect, useState } from 'react'
import { FileText, Sparkles, Upload, X } from 'lucide-react'
import Button from '../../shared/Button'
import ErrorMessage from '../../shared/ErrorMessage'
import Modal from '../../shared/Modal'
import * as api from '../../../services/api'
import { parseStoredArray } from '../../../utils/helpers'
import Field from './Field'

function RequirementModal({ open, onClose, onSaved, existing, mandateId }) {
  const [form, setForm] = useState({ profile_name: '', years_min: '', years_max: '', headcount: 1, jd_text: '', notes: '' })
  const [tags, setTags] = useState([])
  const [customTag, setCustomTag] = useState('')
  const [saving, setSaving] = useState(false)
  const [extractingFile, setExtractingFile] = useState(false)
  const [extractingTags, setExtractingTags] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm(existing
      ? {
        profile_name: existing.profile_name || '',
        years_min: existing.years_min ?? '',
        years_max: existing.years_max ?? '',
        headcount: existing.headcount || 1,
        jd_text: existing.jd_text || '',
        notes: existing.notes || '',
        jd_file_path: existing.jd_file_path || null,
        jd_original_filename: existing.jd_original_filename || '',
      }
      : { profile_name: '', years_min: '', years_max: '', headcount: 1, jd_text: '', notes: '', jd_file_path: null, jd_original_filename: '' })
    setTags(existing ? parseStoredArray(existing.tags) : [])
    setCustomTag('')
    setError(null)
  }, [open, existing])

  async function readJdFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setExtractingFile(true)
    setError(null)
    try {
      const response = await api.uploadJdFile(file)
      const { text, filePath, fileName } = response.data || {}
      setForm(c => ({
        ...c,
        jd_text: String(text || '').trim() ? text : c.jd_text,
        jd_file_path: filePath || null,
        jd_original_filename: fileName || file.name,
      }))
    } catch (err) { setError(err.message || 'Could not upload the JD file.') }
    finally { setExtractingFile(false) }
  }

  function clearJdFile() {
    setForm(c => ({ ...c, jd_file_path: null, jd_original_filename: '' }))
  }

  async function regenerateRoleTags() {
    const jd = String(form.jd_text || '').trim()
    if (!jd) { setError('Add a job description to this role before regenerating skills.'); return }
    setExtractingTags(true)
    setError(null)
    try {
      const response = await api.extractTemplateTags(jd)
      setTags(Array.isArray(response.data) ? response.data : [])
    } catch (err) { setError(err.message || 'Could not regenerate matching skills.') }
    finally { setExtractingTags(false) }
  }

  function addTag() {
    const t = customTag.trim()
    if (t && !tags.some(tag => tag.toLowerCase() === t.toLowerCase())) setTags(c => [...c, t])
    setCustomTag('')
  }

  async function save() {
    if (!form.profile_name.trim()) { setError('Profile name is required.'); return }
    const minYears = form.years_min !== '' ? Number(form.years_min) : null
    const maxYears = form.years_max !== '' ? Number(form.years_max) : null
    if (minYears !== null && maxYears !== null && minYears > maxYears) {
      setError('Minimum experience cannot be greater than maximum experience.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const data = {
        ...form,
        years_min: minYears,
        years_max: maxYears,
        headcount: Number(form.headcount) || 1,
        jd_text: form.jd_text.trim() || null,
        tags: JSON.stringify(tags)
      }
      const response = existing
        ? await api.updateMandateRequirement(mandateId, existing.id, data)
        : await api.createMandateRequirement(mandateId, data)
      onSaved(response.data)
    } catch (err) { setError(err.message || 'Could not save requirement.') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit role profile' : 'Add role profile'} size="lg">
      <div className="workspace-stack">
        <div className="form-grid">
          <Field label="Profile name" full help="e.g. Senior Backend Engineer, Junior Frontend Developer">
            <input className="form-input" value={form.profile_name} onChange={e => setForm(c => ({ ...c, profile_name: e.target.value }))} placeholder="Senior Backend Developer" />
          </Field>
          <Field label="Min experience (years)">
            <input className="form-input" type="number" min="0" value={form.years_min} onChange={e => setForm(c => ({ ...c, years_min: e.target.value }))} placeholder="e.g. 4" />
          </Field>
          <Field label="Max experience (years)">
            <input className="form-input" type="number" min="0" value={form.years_max} onChange={e => setForm(c => ({ ...c, years_max: e.target.value }))} placeholder="e.g. 8" />
          </Field>
          <Field label="Headcount for this profile">
            <input className="form-input" type="number" min="1" value={form.headcount} onChange={e => setForm(c => ({ ...c, headcount: e.target.value }))} />
          </Field>
          <Field label="Notes" help="Additional notes for this profile.">
            <input className="form-input" value={form.notes} onChange={e => setForm(c => ({ ...c, notes: e.target.value }))} />
          </Field>
          <Field label="Role-specific JD" full help="Paste JD below or upload PDF/DOC/DOCX/TXT. The uploaded file is kept even if text extraction misses something.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input id={`role-modal-jd-file`} type="file" accept=".pdf,.doc,.docx,.txt" onChange={readJdFile} style={{ display: 'none' }} />
              <label htmlFor={`role-modal-jd-file`} className="product-button product-button--secondary product-button--md" style={{ alignSelf: 'flex-start', cursor: extractingFile ? 'wait' : 'pointer' }}>
                <Upload size={14} />{extractingFile ? 'Uploading...' : 'Upload JD file'}
              </label>
              {form.jd_original_filename && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-muted)' }}>
                  <FileText size={13} />
                  {existing?.jd_file_url
                    ? <a href={existing.jd_file_url} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.jd_original_filename}</a>
                    : <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.jd_original_filename}</span>}
                  <button type="button" onClick={clearJdFile} title="Remove file" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--fg-muted)', display: 'inline-flex' }}>
                    <X size={12} />
                  </button>
                </div>
              )}
              <textarea className="form-input" rows={8} value={form.jd_text} onChange={e => setForm(c => ({ ...c, jd_text: e.target.value }))} placeholder="Paste the JD for this role..." style={{ resize: 'vertical' }} />
            </div>
          </Field>
          <div className="form-field form-field--full" style={{ border: '1px solid var(--border-default)', borderRadius: 8, padding: 12 }}>
            <div className="workspace-section-heading" style={{ marginBottom: 8 }}>
              <div><h3 style={{ fontSize: 15 }}>Matching skills</h3><p>Used for AI recommendations in the candidates tab.</p></div>
              <Button variant="secondary" size="sm" onClick={regenerateRoleTags} loading={extractingTags}><Sparkles size={13} />Regenerate</Button>
            </div>
            <div className="tag-list" style={{ minHeight: 30 }}>
              {tags.length === 0 && <span className="form-help">No matching skills saved yet.</span>}
              {tags.map(tag => (
                <span className="tag" key={tag}>{tag}
                  <button type="button" onClick={() => setTags(c => c.filter(t => t !== tag))} style={{ display: 'inline-flex', marginLeft: 5, border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer' }}><X size={12} /></button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input className="form-input" value={customTag} onChange={e => setCustomTag(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Add a skill tag" />
              <Button variant="secondary" onClick={addTag}>Add</Button>
            </div>
          </div>
        </div>
        {error && <ErrorMessage message={error} />}
        <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>{existing ? 'Save changes' : 'Add profile'}</Button>
        </div>
      </div>
    </Modal>
  )
}

export default RequirementModal
