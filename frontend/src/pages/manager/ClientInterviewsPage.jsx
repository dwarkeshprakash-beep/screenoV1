import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, BriefcaseBusiness, Calendar, CheckCircle2,
  Clock, FileText, Mail, Plus,
  Search, Sparkles, Trash2, Upload, UserCheck, Users, X, AlertCircle, Video,
} from 'lucide-react'
import Avatar from '../../components/shared/Avatar'
import Button from '../../components/shared/Button'
import EmptyState from '../../components/shared/EmptyState'
import ErrorMessage from '../../components/shared/ErrorMessage'
import Modal from '../../components/shared/Modal'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import DeleteMandateModal from '../../components/manager/DeleteMandateModal'
import ReportRecipientsSelector from '../../components/manager/ReportRecipientsSelector'
import Spinner from '../../components/shared/Spinner'
import * as api from '../../services/api'
import { formatDate, formatDateTime, parseStoredArray, serializeDatetimeLocal } from '../../utils/helpers'

const parseTags = parseStoredArray
const MANDATE_FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
]

function Field({ label, help, full = false, children }) {
  return (
    <div className={`form-field${full ? ' form-field--full' : ''}`}>
      <span className="form-label">{label}</span>
      {children}
      {help && <span className="form-help">{help}</span>}
    </div>
  )
}

function requirementMeta(item) {
  if (!item) return ''
  const yearsMin = item.requirement_years_min ?? item.years_min
  const yearsMax = item.requirement_years_max ?? item.years_max
  const headcount = item.requirement_headcount ?? item.headcount
  const parts = []
  if (yearsMin != null) parts.push(`${yearsMin}-${yearsMax ?? '+'} yrs`)
  if (headcount) parts.push(`${headcount} role${Number(headcount) === 1 ? '' : 's'}`)
  return parts.join(' | ')
}

function newRequirementProfile(seed = {}) {
  return {
    key: seed.key || seed.id || `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    id: seed.id || null,
    profile_name: seed.profile_name || '',
    years_min: seed.years_min ?? '',
    years_max: seed.years_max ?? '',
    headcount: seed.headcount || 1,
    notes: seed.notes || '',
    jd_text: seed.jd_text || '',
  }
}

function normalizeRequirementProfilesForSave(profiles) {
  return profiles
    .map(profile => ({
      id: profile.id || undefined,
      profile_name: String(profile.profile_name || '').trim(),
      years_min: profile.years_min === '' ? null : Number(profile.years_min),
      years_max: profile.years_max === '' ? null : Number(profile.years_max),
      headcount: Number(profile.headcount) || 1,
      notes: String(profile.notes || '').trim() || null,
      jd_text: String(profile.jd_text || '').trim() || null,
    }))
    .filter(profile => profile.profile_name)
}

function validateRequirementProfilesForSave(profiles) {
  const normalized = normalizeRequirementProfilesForSave(profiles)
  if (normalized.length === 0) return 'Add at least one required role.'
  const seen = new Set()
  for (const profile of normalized) {
    if (!Number.isInteger(profile.headcount) || profile.headcount < 1) return 'Each role needs a headcount of at least 1.'
    if (profile.years_min != null && (!Number.isInteger(profile.years_min) || profile.years_min < 0)) return 'Minimum experience must be a non-negative whole number.'
    if (profile.years_max != null && (!Number.isInteger(profile.years_max) || profile.years_max < 0)) return 'Maximum experience must be a non-negative whole number.'
    if (profile.years_min != null && profile.years_max != null && profile.years_min > profile.years_max) return 'Minimum experience cannot be greater than maximum experience.'
    const key = profile.profile_name.toLowerCase()
    if (seen.has(key)) return `Duplicate role: ${profile.profile_name}`
    seen.add(key)
  }
  return null
}

function requirementProfilesHeadcount(profiles) {
  return normalizeRequirementProfilesForSave(profiles)
    .reduce((sum, profile) => sum + Number(profile.headcount || 0), 0)
}

function RequirementProfilesEditor({ profiles, setProfiles, allowEmpty = false }) {
  function updateProfile(key, field, value) {
    setProfiles(current => current.map(profile => (
      profile.key === key ? { ...profile, [field]: value } : profile
    )))
  }

  function removeProfile(key) {
    setProfiles(current => current.length > 1 || allowEmpty ? current.filter(profile => profile.key !== key) : current)
  }

  const totalHeadcount = requirementProfilesHeadcount(profiles)
  const [extractingFiles, setExtractingFiles] = useState({})

  async function readRoleJdFile(event, profileKey) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setExtractingFiles(c => ({ ...c, [profileKey]: true }))
    try {
      const response = await api.extractTextFromFile(file)
      const text = response.data?.text || ''
      if (text.trim()) updateProfile(profileKey, 'jd_text', text)
    } catch (err) {
      console.error('Could not read JD document', err)
    } finally {
      setExtractingFiles(c => ({ ...c, [profileKey]: false }))
    }
  }

  return (
    <div className="form-field form-field--full">
      <div className="workspace-section-heading" style={{ marginBottom: 10 }}>
        <div>
          <h3 style={{ fontSize: 15 }}>Role profiles</h3>
          <p>Add one or more roles when the mandate has multiple JDs. Roles are optional at creation.</p>
        </div>
        <span className="status-pill status-pill--brand">{totalHeadcount || 0} total</span>
      </div>
      <div className="workspace-stack" style={{ gap: 10 }}>
        {profiles.length === 0 && (
          <div style={{ padding: 14, border: '1px dashed var(--border-default)', borderRadius: 10, background: 'var(--bg-surface-alt)', color: 'var(--fg-muted)', fontSize: 12 }}>
            No roles added yet. You can create the mandate now and add roles later, or add role-specific JDs here.
          </div>
        )}
        {profiles.map((profile, index) => (
          <div key={profile.key} style={{ border: '1px solid var(--border-default)', borderRadius: 8, padding: 12, background: 'var(--bg-surface)' }}>
            <div className="form-grid">
              <Field label="Role name" full={profiles.length === 1}>
                <input className="form-input" value={profile.profile_name} onChange={e => updateProfile(profile.key, 'profile_name', e.target.value)} placeholder={`Role ${index + 1}`} />
              </Field>
              {(profiles.length > 1 || allowEmpty) && (
                <div className="form-field" style={{ justifyContent: 'flex-end' }}>
                  <button type="button" className="danger-icon-button" onClick={() => removeProfile(profile.key)} style={{ alignSelf: 'flex-end', padding: '7px 9px' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
              <Field label="Min years">
                <input className="form-input" type="number" min="0" value={profile.years_min} onChange={e => updateProfile(profile.key, 'years_min', e.target.value)} placeholder="0" />
              </Field>
              <Field label="Max years">
                <input className="form-input" type="number" min="0" value={profile.years_max} onChange={e => updateProfile(profile.key, 'years_max', e.target.value)} placeholder="Open" />
              </Field>
              <Field label="Headcount">
                <input className="form-input" type="number" min="1" value={profile.headcount} onChange={e => updateProfile(profile.key, 'headcount', e.target.value)} />
              </Field>

              <Field label="Role JD" full help="Paste JD below or upload PDF/DOC/DOCX/TXT.">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input id={`role-jd-file-${profile.key}`} type="file" accept=".pdf,.doc,.docx,.txt" onChange={e => readRoleJdFile(e, profile.key)} style={{ display: 'none' }} />
                  <label htmlFor={`role-jd-file-${profile.key}`} className="product-button product-button--secondary product-button--md" style={{ alignSelf: 'flex-start', cursor: extractingFiles[profile.key] ? 'wait' : 'pointer' }}>
                    <Upload size={14} />{extractingFiles[profile.key] ? 'Reading...' : 'Upload JD file'}
                  </label>
                  <textarea className="form-input" rows={5} value={profile.jd_text} onChange={e => updateProfile(profile.key, 'jd_text', e.target.value)} placeholder="Paste JD for this role..." style={{ resize: 'vertical' }} />
                </div>
              </Field>
              <Field label="Notes" full>
                <input className="form-input" value={profile.notes} onChange={e => updateProfile(profile.key, 'notes', e.target.value)} placeholder="Optional profile notes" />
              </Field>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <Button variant="secondary" size="sm" onClick={() => setProfiles(current => [...current, newRequirementProfile()])}>
          <Plus size={13} />Add role
        </Button>
      </div>
    </div>
  )
}

// ── Mandate creation wizard ───────────────────────────────────────────────────

function CreateMandateModal({ open, onClose, onCreated }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ clientName: '', clientEmail: '', requirements: '', customInfo: '' })
  const [profiles, setProfiles] = useState([newRequirementProfile()])
  const [tagsByRole, setTagsByRole] = useState({})
  const [extractingTags, setExtractingTags] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setStep(1)
    setForm({ clientName: '', clientEmail: '', requirements: '', customInfo: '' })
    setProfiles([newRequirementProfile()])
    setTagsByRole({})
    setExtractingTags({})
    setError(null)
  }, [open])

  function update(key, value) { setForm(c => ({ ...c, [key]: value })) }

  async function continueToTags() {
    if (!form.clientName.trim()) { setError('Client name is required.'); return }
    const profileError = validateRequirementProfilesForSave(profiles)
    if (profileError) { setError(profileError); return }

    setExtractingTags({ _all: true })
    setError(null)
    
    try {
      const newTagsByRole = {}
      await Promise.all(profiles.map(async (profile) => {
        const jd = String(profile.jd_text || '').trim()
        if (jd) {
          try {
            const response = await api.extractTemplateTags(jd)
            newTagsByRole[profile.key] = Array.isArray(response.data) ? response.data : []
          } catch {
            newTagsByRole[profile.key] = []
          }
        } else {
          newTagsByRole[profile.key] = []
        }
      }))
      setTagsByRole(newTagsByRole)
      setStep(2)
    } catch { 
      setStep(2) 
    } finally { 
      setExtractingTags({}) 
    }
  }

  async function regenerateRoleTags(profileKey) {
    const profile = profiles.find(p => p.key === profileKey)
    if (!profile) return
    const jd = String(profile.jd_text || '').trim()
    if (!jd) { setError('Add a job description to this role before regenerating skills.'); return }
    setExtractingTags(c => ({ ...c, [profileKey]: true }))
    setError(null)
    try {
      const response = await api.extractTemplateTags(jd)
      setTagsByRole(c => ({ ...c, [profileKey]: Array.isArray(response.data) ? response.data : [] }))
    } catch (err) { setError(err.message || 'Could not regenerate matching skills.') }
    finally { setExtractingTags(c => ({ ...c, [profileKey]: false })) }
  }

  function addTag(profileKey, tagStr) {
    const t = tagStr.trim()
    if (!t) return
    setTagsByRole(c => {
      const current = c[profileKey] || []
      if (!current.some(tag => tag.toLowerCase() === t.toLowerCase())) {
        return { ...c, [profileKey]: [...current, t] }
      }
      return c
    })
  }

  function removeTag(profileKey, tagStr) {
    setTagsByRole(c => {
      const current = c[profileKey] || []
      return { ...c, [profileKey]: current.filter(t => t !== tagStr) }
    })
  }

  async function saveMandate() {
    setSaving(true)
    setError(null)
    try {
      const normalizedProfiles = normalizeRequirementProfilesForSave(profiles)
        .map((profile, i) => ({
          ...profile,
          tags: JSON.stringify(tagsByRole[profiles[i].key] || []),
        }))

      await api.createClientTemplate({
        client_name: form.clientName.trim(),
        client_email: form.clientEmail.trim() || null,
        requirements: normalizedProfiles.length
          ? normalizedProfiles.map(profile => profile.profile_name).join(', ')
          : form.requirements.trim(),
        headcount: normalizedProfiles.length
          ? normalizedProfiles.reduce((sum, profile) => sum + Number(profile.headcount || 0), 0)
          : 1,
        requirement_profiles: normalizedProfiles,
        jd_text: null,
        custom_info: form.customInfo.trim() || null,
        tags: null,
      })
      await onCreated()
      onClose()
    } catch (err) { setError(err.message || 'Could not save the mandate.') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create client mandate" size="lg">
      <div className="workspace-stack">
        <div className="workspace-tabs" aria-label="Mandate creation progress">
          {[['1. Mandate brief', 1], ['2. Matching skills', 2]].map(([label, s]) => (
            <button key={s} type="button" className={`workspace-tabs__button${step === s ? ' is-active' : ''}`}
              onClick={() => s === 1 ? setStep(1) : (form.clientName.trim() && setStep(2))}>
              {label}
            </button>
          ))}
        </div>

        {step === 1 ? (
          <div className="form-grid">
            <Field label="Client name">
              <input className="form-input" value={form.clientName} onChange={e => update('clientName', e.target.value)} placeholder="Client company name" />
            </Field>
            <Field label="Client email" help="Optional contact for the mandate.">
              <input className="form-input" type="email" value={form.clientEmail} onChange={e => update('clientEmail', e.target.value)} placeholder="contact@client.com" />
            </Field>
            <Field label="Mandate summary" full help="Optional high-level summary. Add exact roles, each with its own JD.">
              <textarea className="form-input" rows={3} value={form.requirements} onChange={e => update('requirements', e.target.value)} placeholder="Example: Engineering hiring for backend and frontend roles" style={{ resize: 'vertical' }} />
            </Field>
            <RequirementProfilesEditor profiles={profiles} setProfiles={setProfiles} allowEmpty={false} />
            <Field label="Internal notes" full help="Visible to managers, not candidates.">
              <textarea className="form-input" rows={3} value={form.customInfo} onChange={e => update('customInfo', e.target.value)} style={{ resize: 'vertical' }} />
            </Field>
          </div>
        ) : (
          <div className="workspace-stack" style={{ gap: 20 }}>
            {profiles.length === 0 && <span className="form-help">No roles added.</span>}
            {profiles.map((profile, i) => {
               const roleTags = tagsByRole[profile.key] || []
               const name = profile.profile_name || `Role ${i + 1}`
               return (
                  <div key={profile.key} className="form-field form-field--full" style={{ border: '1px solid var(--border-default)', borderRadius: 8, padding: 12 }}>
                    <div className="workspace-section-heading" style={{ marginBottom: 8 }}>
                      <div><h3 style={{ fontSize: 15 }}>{name} skills</h3></div>
                      <Button variant="secondary" size="sm" onClick={() => regenerateRoleTags(profile.key)} loading={extractingTags[profile.key]}><Sparkles size={13} />Regenerate</Button>
                    </div>
                    <div className="tag-list" style={{ minHeight: 30 }}>
                      {roleTags.length === 0 && <span className="form-help">No matching skills saved yet.</span>}
                      {roleTags.map(tag => (
                        <span className="tag" key={tag}>{tag}
                          <button type="button" onClick={() => removeTag(profile.key, tag)} style={{ display: 'inline-flex', marginLeft: 5, border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer' }}><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <input className="form-input" id={`add-tag-${profile.key}`} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(profile.key, e.target.value); e.target.value = '' } }} placeholder="Add a skill tag" />
                      <Button variant="secondary" onClick={() => { const el = document.getElementById(`add-tag-${profile.key}`); addTag(profile.key, el.value); el.value = '' }}>Add</Button>
                    </div>
                  </div>
               )
            })}
          </div>
        )}

        {error && <ErrorMessage message={error} />}
        <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={step === 1 ? onClose : () => setStep(1)}>{step === 1 ? 'Cancel' : 'Back'}</Button>
          {step === 1
            ? <Button onClick={continueToTags} loading={extractingTags._all}>Review skills</Button>
            : <Button onClick={saveMandate} loading={saving}>Save mandate</Button>}
        </div>
      </div>
    </Modal>
  )
}

// ── Edit mandate ──────────────────────────────────────────────────────────────

function EditMandateModal({ open, template, onClose, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm({ client_name: template.client_name || '', client_email: template.client_email || '', requirements: template.requirements || '', custom_info: template.custom_info || '' })
    setError(null)
  }, [open, template])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const response = await api.updateClientTemplate(template.id, form)
      onSaved(response.data || { ...template, ...form })
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
          <Field label="Internal notes" full><textarea className="form-input" rows={4} value={form.custom_info || ''} onChange={e => setForm(c => ({ ...c, custom_info: e.target.value }))} style={{ resize: 'vertical' }} /></Field>
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

// ── Requirement profile modal ─────────────────────────────────────────────────

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
      }
      : { profile_name: '', years_min: '', years_max: '', headcount: 1, jd_text: '', notes: '' })
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
      const response = await api.extractTextFromFile(file)
      const text = response.data?.text || ''
      if (text.trim()) setForm(c => ({ ...c, jd_text: text }))
    } catch (err) { setError(err.message || 'Could not read the JD document.') }
    finally { setExtractingFile(false) }
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
          <Field label="Role-specific JD" full help="Paste JD below or upload PDF/DOC/DOCX/TXT.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input id={`role-modal-jd-file`} type="file" accept=".pdf,.doc,.docx,.txt" onChange={readJdFile} style={{ display: 'none' }} />
              <label htmlFor={`role-modal-jd-file`} className="product-button product-button--secondary product-button--md" style={{ alignSelf: 'flex-start', cursor: extractingFile ? 'wait' : 'pointer' }}>
                <Upload size={14} />{extractingFile ? 'Reading...' : 'Upload JD file'}
              </label>
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

// ── Add prospects modal ───────────────────────────────────────────────────────

function AddProspectsModal({ open, onClose, onAdded, mandateId, requirements }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [requirementId, setRequirementId] = useState('')
  const [query, setQuery] = useState('')
  const [memberSection, setMemberSection] = useState('team')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) { setSelectedIds([]); setQuery(''); setError(null); return }
    setLoading(true)
    api.getTemplateMatches(mandateId)
      .then(r => setMembers(r.data || []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }, [open, mandateId])

  const teamMembers = useMemo(() => members.filter(m => m.in_team), [members])
  const otherMembers = useMemo(() => members.filter(m => !m.in_team), [members])
  const activeList = memberSection === 'team' ? teamMembers : otherMembers

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return activeList
    return activeList.filter(m =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q)
      || String(m.email || '').toLowerCase().includes(q)
      || String(m.current_position || '').toLowerCase().includes(q)
    )
  }, [activeList, query])

  function toggleMember(id) {
    setSelectedIds(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id])
  }

  async function addProspects() {
    if (selectedIds.length === 0) return
    setAdding(true)
    setError(null)
    try {
      await api.addProspects(mandateId, {
        userIds: selectedIds.map(userId => ({
          userId,
          requirementId: requirementId ? Number(requirementId) : null,
        })),
      })
      await onAdded()
      onClose()
    } catch (err) { setError(err.message || 'Could not add prospects.') }
    finally { setAdding(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add prospects to client team" size="lg">
      <div className="workspace-stack">
        <div className="workspace-tabs" style={{ alignSelf: 'flex-start' }}>
          <button type="button" className={`workspace-tabs__button${memberSection === 'team' ? ' is-active' : ''}`} onClick={() => setMemberSection('team')}>
            <Users size={13} /> My team ({teamMembers.length})
          </button>
          <button type="button" className={`workspace-tabs__button${memberSection === 'other' ? ' is-active' : ''}`} onClick={() => setMemberSection('other')}>
            Other org members ({otherMembers.length})
          </button>
        </div>

        {requirements.length > 0 && (
          <Field label="Assign to requirement profile" help="Required — tracks which profile each prospect is for.">
            <select className="form-input" value={requirementId} onChange={e => setRequirementId(e.target.value)}>
              <option value="">Select a profile...</option>
              {requirements.map(r => <option key={r.id} value={r.id}>{r.profile_name}{r.years_min != null ? ` (${r.years_min}–${r.years_max ?? '+'} yrs)` : ''}</option>)}
            </select>
          </Field>
        )}

        <div className="workspace-search" style={{ width: '100%' }}>
          <Search size={15} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, email, or role..." />
        </div>

        {loading ? <Spinner center /> : filtered.length === 0 ? (
          <EmptyState message={query ? 'No members match this search.' : memberSection === 'team' ? 'All team members have already been added as prospects.' : 'No other org members available.'} />
        ) : (
          <div className="workspace-grid">
            {filtered.map(m => {
              const name = `${m.first_name || ''} ${m.last_name || ''}`.trim()
              const selected = selectedIds.includes(m.id)
              return (
                <button type="button" className="workspace-card" key={m.id} onClick={() => toggleMember(m.id)}
                  style={{ borderColor: selected ? 'var(--brand-400)' : undefined, background: selected ? 'var(--brand-50)' : undefined }}>
                  <div className="workspace-card__body" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input type="checkbox" checked={selected} readOnly style={{ accentColor: 'var(--brand-500)' }} />
                      <Avatar name={name} size={32} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <strong style={{ display: 'block', overflow: 'hidden', fontSize: 13, textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--fg-primary)' }}>{name}</strong>
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.current_position || m.email}</span>
                      </div>
                      {m.recommended && <span className="status-pill status-pill--success">{m.match_score} match</span>}
                    </div>
                    {(m.matched_tags || []).length > 0 && (
                      <div className="tag-list" style={{ marginTop: 10 }}>
                        {m.matched_tags.slice(0, 3).map(tag => <span className="tag" key={tag}>{tag}</span>)}
                      </div>
                    )}
                    {(m.matching_requirements || []).length > 0 && (
                      <div className="tag-list" style={{ marginTop: 8 }}>
                        {m.matching_requirements.slice(0, 2).map(req => (
                          <span className="tag" key={req.id}>
                            {req.profile_name}{requirementMeta(req) ? ` | ${requirementMeta(req)}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {error && <ErrorMessage message={error} />}
        <div className="form-actions">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={addProspects} loading={adding} disabled={selectedIds.length === 0 || (requirements.length > 0 && !requirementId)}>
            <UserCheck size={14} />Add {selectedIds.length > 0 ? selectedIds.length : ''} to client team
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function CandidateActionModal({ candidate, requirements, onClose, onViewProfile, onAdd, adding, error }) {
  const [requirementId, setRequirementId] = useState('')
  useEffect(() => { setRequirementId('') }, [candidate])

  if (!candidate) return null
  const name = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || candidate.email
  const suggestedRequirement = candidate.matching_requirements?.[0]

  return (
    <Modal open={!!candidate} onClose={onClose} title="Candidate actions" size="sm">
      <div className="workspace-stack">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={name} size={40} />
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: 'block', color: 'var(--fg-primary)', fontSize: 14 }}>{name}</strong>
            <span style={{ display: 'block', color: 'var(--fg-muted)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{candidate.email}</span>
          </div>
        </div>
        <div className="detail-facts">
          <div className="detail-fact"><div className="detail-fact__label">Role</div><div className="detail-fact__value">{candidate.current_position || candidate.job_title || 'Not set'}</div></div>
          <div className="detail-fact"><div className="detail-fact__label">Match</div><div className="detail-fact__value">{candidate.match_score || 0}</div></div>
        </div>
        {suggestedRequirement && (
          <span className="tag" style={{ alignSelf: 'flex-start' }}>
            Suggested: {suggestedRequirement.profile_name}{requirementMeta(suggestedRequirement) ? ` | ${requirementMeta(suggestedRequirement)}` : ''}
          </span>
        )}
        {requirements && requirements.length > 0 && (
          <Field label="Assign to requirement profile" help="Required — tracks which profile each prospect is for.">
            <select className="form-input" value={requirementId} onChange={e => setRequirementId(e.target.value)}>
              <option value="">Select a profile...</option>
              {requirements.map(r => <option key={r.id} value={r.id}>{r.profile_name}</option>)}
            </select>
          </Field>
        )}
        {error && <ErrorMessage message={error} />}
        <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onViewProfile} disabled={!candidate.team_member_id && !candidate.role && candidate.employee_id === undefined}>View profile</Button>
          <Button onClick={() => onAdd(requirementId)} loading={adding} disabled={requirements && requirements.length > 0 && !requirementId}>
            <UserCheck size={14} />Add candidate
          </Button>
        </div>
        {!candidate.team_member_id && !candidate.role && candidate.employee_id === undefined && (
          <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: 0 }}>Profile page is only available for organization users or team members.</p>
        )}
      </div>
    </Modal>
  )
}

function MandateReportDetailModal({ report, loading, error, onClose }) {
  const strengths = parseStoredArray(report?.strengths)
  const name = report
    ? `${report.candidate_first || ''} ${report.candidate_last || ''}`.trim() || 'Candidate'
    : 'Candidate'

  return (
    <Modal open={!!report} onClose={onClose} title="Report detail" size="lg">
      {loading ? <Spinner center /> : error ? <ErrorMessage message={error} /> : report && (
        <div className="workspace-stack">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-primary)', margin: '0 0 4px' }}>{name}</h3>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>{report.candidate_email || 'No email'} | {report.interview_type || 'Interview'}</p>
              <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: '4px 0 0' }}>{formatDate(report.interview_date || report.created)}</p>
            </div>
            <span className={`status-pill${report.decision === 'pass' ? ' status-pill--success' : report.decision === 'fail' ? ' status-pill--danger' : ' status-pill--warning'}`}>{report.decision || 'Review'}</span>
          </div>
          <div className="detail-facts">
            <div className="detail-fact"><div className="detail-fact__label">Overall</div><div className="detail-fact__value">{report.overall_score ?? 'Not scored'}</div></div>
            <div className="detail-fact"><div className="detail-fact__label">Technical</div><div className="detail-fact__value">{report.tech_knowledge ?? 'Not scored'}</div></div>
            <div className="detail-fact"><div className="detail-fact__label">Communication</div><div className="detail-fact__value">{report.communication ?? 'Not scored'}</div></div>
            <div className="detail-fact"><div className="detail-fact__label">Problem solving</div><div className="detail-fact__value">{report.problem_solving ?? 'Not scored'}</div></div>
          </div>
          {report.summary && (
            <section>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-primary)', margin: '0 0 8px' }}>Summary</h3>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--fg-body)', margin: 0 }}>{report.summary}</p>
            </section>
          )}
          {strengths.length > 0 && (
            <section>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-primary)', margin: '0 0 8px' }}>Highlights</h3>
              <div className="tag-list">{strengths.map(item => <span className="tag" key={item}>{item}</span>)}</div>
            </section>
          )}
          {report.reason && (
            <section>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-primary)', margin: '0 0 8px' }}>Decision reason</h3>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--fg-body)', margin: 0 }}>{report.reason}</p>
            </section>
          )}
        </div>
      )}
    </Modal>
  )
}

// ── Send JD modal (with custom message + preview) ─────────────────────────────

function SendJDModal({ open, onClose, onSent, member, template }) {
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { if (open) { setCustomMessage(''); setError(null) } }, [open])

  const roleName = member?.requirement_name || template?.requirements || 'Role'
  const jdSource = member?.requirement_jd_text || template?.jd_text || template?.requirements || ''
  const previewText = customMessage.trim() || `Your profile is being considered for a client requirement at ${template?.client_name || 'our client'}.`
  const jdPreview = jdSource.slice(0, 600)

  async function send() {
    setSending(true)
    setError(null)
    try {
      await api.sendClientJD(template.id, member.id, { customMessage: customMessage.trim() })
      onSent()
      onClose()
    } catch (err) { setError(err.message || 'Could not send JD.') }
    finally { setSending(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Send JD to candidate" size="lg">
      <div className="workspace-stack">
        <div className="detail-facts">
          <div className="detail-fact"><div className="detail-fact__label">Candidate</div><div className="detail-fact__value">{member?.first_name} {member?.last_name}</div></div>
          <div className="detail-fact"><div className="detail-fact__label">Client</div><div className="detail-fact__value">{template?.client_name}</div></div>
          <div className="detail-fact"><div className="detail-fact__label">Role</div><div className="detail-fact__value">{roleName}</div></div>
        </div>

        <Field label="Custom message (optional)" help="Appears above the JD in the email. Leave blank to use the default.">
          <textarea className="form-input" rows={4} value={customMessage} onChange={e => setCustomMessage(e.target.value)} placeholder="Hi [Name], we think your profile is a great fit for this role at our client..." style={{ resize: 'vertical' }} />
        </Field>

        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email preview</p>
          <div style={{ border: '1px solid var(--border-default)', borderRadius: 10, padding: 18, background: 'var(--bg-page)', fontSize: 13, color: 'var(--fg-body)' }}>
            <p style={{ margin: '0 0 10px', fontWeight: 600, color: 'var(--fg-primary)' }}>Subject: [{template?.client_name}] Job opportunity — {roleName}</p>
            <p style={{ margin: '0 0 8px' }}>Hi <strong>{member?.first_name}</strong>,</p>
            <p style={{ margin: '0 0 12px', color: 'var(--fg-muted)' }}>{previewText}</p>
            {jdPreview && (
              <div style={{ background: 'var(--brand-50)', borderLeft: '3px solid var(--brand-500)', padding: '10px 14px', borderRadius: '0 6px 6px 0', fontSize: 12, color: 'var(--fg-body)', whiteSpace: 'pre-wrap' }}>
                {jdPreview}{jdSource.length > 600 ? '...' : ''}
              </div>
            )}
            <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--fg-subtle)' }}>Log in to Screeno portal to submit your resume for this opportunity.</p>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}
        <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={send} loading={sending}><Mail size={14} />Send JD</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Schedule interview modal (5 types) ────────────────────────────────────────

const INTERVIEW_TYPES = [
  { value: 'ai_voice', label: 'AI Voice Interview', desc: 'Automated voice interview with AI-generated questions' },
  { value: 'exam', label: 'Coding Exam', desc: 'Coding or multiple-choice assessment' },
  { value: 'human', label: 'Human Video Interview', desc: 'Live video interview with a managed meeting link' },
  { value: 'offline', label: 'Offline Interview', desc: 'In-person interview — sends email with date and location' },
]

const HUMAN_VIDEO_PLATFORMS = [
  { value: 'google_meet', label: 'Google Meet', Icon: Video, disabled: false },
  { value: 'teams', label: 'Microsoft Teams', Icon: BriefcaseBusiness, disabled: true },
]

function ScheduleClientTeamModal({ open, onClose, onScheduled, member, template }) {
  const [step, setStep] = useState('details')
  const [type, setType] = useState('ai_voice')
  const [videoPlatform, setVideoPlatform] = useState('google_meet')
  const [platformStatus, setPlatformStatus] = useState({ google_meet: false, teams: false })
  const [mode, setMode] = useState('simple')
  const [difficulty, setDifficulty] = useState('medium')
  const [questionCount, setQuestionCount] = useState(10)
  const [durationMinutes, setDurationMinutes] = useState(25)
  const [scheduledAt, setScheduledAt] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [reportUserIds, setReportUserIds] = useState([])
  const [scheduling, setScheduling] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setStep('details')
    setType('ai_voice')
    setVideoPlatform('google_meet')
    setMode('simple')
    setDifficulty('medium')
    setQuestionCount(10)
    setDurationMinutes(25)
    setScheduledAt('')
    setLocation('')
    setNotes('')
    setReportUserIds([])
    setError(null)
    // Load which platforms are configured
    api.getVideoPlatforms()
      .then(r => setPlatformStatus(r.data || {}))
      .catch(() => { })
  }, [open])

  function validateDetails() {
    if (!scheduledAt) {
      setError('Choose the scheduled date and time.')
      return false
    }
    const serializedScheduledAt = serializeDatetimeLocal(scheduledAt)
    if (!serializedScheduledAt) {
      setError('Invalid scheduled date and time.')
      return false
    }
    if (new Date(serializedScheduledAt) <= new Date()) {
      setError('Scheduled time must be in the future.')
      return false
    }
    if (type === 'human') {
      if (videoPlatform === 'teams') {
        setError('Microsoft Teams scheduling needs organization setup before it can be used.')
        return false
      }
      if (!platformStatus.google_meet) {
        setError('Google Meet is not configured yet. Add the Google Calendar service-account settings first.')
        return false
      }
    }
    if ((type === 'ai_voice' || type === 'exam') && (Number(durationMinutes) < 15 || Number(durationMinutes) > 180)) {
      setError('Duration must be between 15 and 180 minutes.')
      return false
    }
    setError(null)
    return true
  }

  function continueToReports() {
    if (validateDetails()) setStep('reports')
  }

  async function schedule() {
    if (!validateDetails()) return
    const serializedScheduledAt = serializeDatetimeLocal(scheduledAt)
    setScheduling(true)
    setError(null)
    try {
      await api.scheduleClientTeamInterview(template.id, member.id, {
        type,
        videoPlatform: type === 'human' ? videoPlatform : undefined,
        mode,
        difficulty,
        questionCount: Number(questionCount),
        durationMinutes: type === 'ai_voice' || type === 'exam' ? Number(durationMinutes) : null,
        scheduledAt: serializedScheduledAt,
        scheduleTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        location: location.trim() || null,
        notes: notes.trim() || null,
        reportUserIds,
      })
      onScheduled()
      onClose()
    } catch (err) { setError(err.message || 'Could not schedule interview.') }
    finally { setScheduling(false) }
  }

  const selectedTypeInfo = INTERVIEW_TYPES.find(t => t.value === type)
  const humanScheduleBlocked = type === 'human'
    && (!scheduledAt || videoPlatform === 'teams' || !platformStatus.google_meet)

  return (
    <Modal open={open} onClose={onClose} title="Schedule interview" size="md">
      <div className="workspace-stack">
        <div className="detail-facts">
          <div className="detail-fact"><div className="detail-fact__label">Candidate</div><div className="detail-fact__value">{member?.first_name} {member?.last_name}</div></div>
          <div className="detail-fact"><div className="detail-fact__label">Mandate</div><div className="detail-fact__value">{template?.client_name}</div></div>
        </div>

        {step === 'details' && (
          <>
        <Field label="Interview type">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {INTERVIEW_TYPES.map(t => (
              <label key={t.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1px solid ${type === t.value ? 'var(--brand-400)' : 'var(--border-default)'}`, background: type === t.value ? 'var(--brand-50)' : 'var(--bg-surface)', cursor: 'pointer' }}>
                <input type="radio" name="interview-type" value={t.value} checked={type === t.value} onChange={() => { setType(t.value); setDurationMinutes(t.value === 'ai_voice' ? 25 : 60) }} style={{ marginTop: 2, accentColor: 'var(--brand-500)' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)' }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{t.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </Field>

        {(type === 'ai_voice' || type === 'human') && (
          <div className="form-grid">
            <Field label="Interview mode">
              <select className="form-input" value={mode} onChange={e => setMode(e.target.value)}>
                <option value="simple">Simple</option>
                <option value="adaptive">Adaptive</option>
              </select>
            </Field>
            <Field label="Difficulty">
              <select className="form-input" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </Field>
            {type === 'ai_voice' && (
              <Field label="Questions">
                <input className="form-input" type="number" min="1" max="50" value={questionCount} onChange={e => setQuestionCount(e.target.value)} />
              </Field>
            )}
            {type === 'ai_voice' && (
              <Field label="Duration (minutes)">
                <input className="form-input" type="number" min="15" max="180" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} />
              </Field>
            )}
          </div>
        )}

        {type === 'exam' && (
          <div className="form-grid">
            <Field label="Difficulty">
              <select className="form-input" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select>
            </Field>
            <Field label="Questions">
              <input className="form-input" type="number" min="1" max="50" value={questionCount} onChange={e => setQuestionCount(e.target.value)} />
            </Field>
            <Field label="Duration (minutes)">
              <input className="form-input" type="number" min="15" max="180" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} />
            </Field>
          </div>
        )}

        <Field label="Date & time">
          <input className="form-input" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
        </Field>

        {/* Video platform selector — only for human interviews */}
        {type === 'human' && (
          <Field label="Video platform" help="A meeting link will be auto-created and shared with the candidate.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {HUMAN_VIDEO_PLATFORMS.map(p => {
                const configured = Boolean(platformStatus[p.value])
                const isDisabled = p.disabled || !configured
                const Icon = p.Icon
                return (
                  <label key={p.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: `1px solid ${videoPlatform === p.value ? 'var(--brand-400)' : 'var(--border-default)'}`, background: videoPlatform === p.value ? 'var(--brand-50)' : isDisabled ? 'var(--bg-surface-alt)' : 'var(--bg-surface)', cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.55 : 1 }}>
                    <input type="radio" name="video-platform" value={p.value} checked={videoPlatform === p.value}
                      onChange={() => !isDisabled && setVideoPlatform(p.value)}
                      disabled={isDisabled}
                      style={{ accentColor: 'var(--brand-500)' }} />
                    <span style={{ width: 24, height: 24, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface)', color: p.value === 'google_meet' ? 'var(--success-600)' : 'var(--brand-600)', border: '1px solid var(--border-default)' }}>
                      <Icon size={14} />
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: isDisabled ? 'var(--fg-subtle)' : 'var(--fg-primary)', flex: 1 }}>{p.label}</span>
                    {p.value === 'teams' && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'var(--border-default)', color: 'var(--fg-subtle)' }}>ORG SETUP NEEDED</span>}
                    {p.value !== 'teams' && !platformStatus[p.value] && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'var(--warning-50)', color: 'var(--warning-700)' }}>NOT CONFIGURED</span>
                    )}
                    {p.value !== 'teams' && platformStatus[p.value] && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'var(--success-50)', color: 'var(--success-700)' }}>READY</span>
                    )}
                  </label>
                )
              })}
            </div>
          </Field>
        )}

        {type === 'human' && (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: platformStatus.google_meet ? 'var(--bg-surface-alt)' : 'var(--warning-50)', color: platformStatus.google_meet ? 'var(--fg-muted)' : 'var(--warning-700)', fontSize: 12, lineHeight: 1.5 }}>
            {platformStatus.google_meet
              ? 'Microsoft Teams needs organization setup before it can be scheduled.'
              : 'Google Meet is not configured yet. Microsoft Teams needs organization setup before it can be scheduled.'}
          </div>
        )}

        {type === 'offline' && (
          <Field label="Location">
            <input className="form-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="Office address or meeting room" />
          </Field>
        )}

        {type === 'offline' && (
          <Field label="Notes" full>
            <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional details..." style={{ resize: 'vertical' }} />
          </Field>
        )}
          </>
        )}

        {step === 'reports' && (
          <ReportRecipientsSelector selectedIds={reportUserIds} onChange={setReportUserIds} />
        )}

        {error && <ErrorMessage message={error} />}
        <div className="form-actions" style={{ justifyContent: 'space-between' }}>
          <Button variant="secondary" disabled={scheduling} onClick={step === 'reports' ? () => setStep('details') : onClose}>
            {step === 'reports' ? 'Back' : 'Cancel'}
          </Button>
          {step === 'details' ? (
            <Button onClick={continueToReports} disabled={humanScheduleBlocked}>
              Continue
            </Button>
          ) : (
            <Button onClick={schedule} loading={scheduling} disabled={humanScheduleBlocked}>
            <Calendar size={14} />
            {`Schedule ${selectedTypeInfo?.label || ''}`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── Mandate detail ─────────────────────────────────────────────────────────────

const EMPTY_OUTCOME_ROUND_FORM = { interview_at: '', outcome: 'pending', feedback: '', manager_notes: '' }

function freshOutcomeRoundForm() {
  return { ...EMPTY_OUTCOME_ROUND_FORM }
}

function OutcomeRoundsModal({ open, onClose, onSaved, member, template }) {
  const [rounds, setRounds] = useState([])
  const [editingRound, setEditingRound] = useState(null)
  const [form, setForm] = useState(freshOutcomeRoundForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const memberId = member?.id
  const templateId = template?.id

  const loadRounds = useCallback(async () => {
    if (!open || !memberId || !templateId) return
    setLoading(true)
    setError(null)
    try {
      const response = await api.getOutcomeRounds(templateId, memberId)
      setRounds(response.data || [])
    } catch (err) {
      setError(err.message || 'Could not load outcome rounds.')
      setRounds([])
    } finally {
      setLoading(false)
    }
  }, [open, memberId, templateId])

  useEffect(() => {
    if (!open) return
    setEditingRound(null)
    setForm(freshOutcomeRoundForm())
    void loadRounds()
  }, [open, loadRounds])

  function editRound(round) {
    setEditingRound(round)
    setForm({
      interview_at: round.interview_at ? String(round.interview_at).slice(0, 16) : '',
      outcome: round.outcome || 'pending',
      feedback: round.feedback || '',
      manager_notes: round.manager_notes || '',
    })
  }

  async function saveRound() {
    if (!memberId || !templateId) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        interview_at: form.interview_at ? serializeDatetimeLocal(form.interview_at) : null,
      }
      if (editingRound) await api.updateOutcomeRound(templateId, memberId, editingRound.id, payload)
      else await api.createOutcomeRound(templateId, memberId, payload)
      setEditingRound(null)
      setForm(freshOutcomeRoundForm())
      await loadRounds()
      await onSaved?.()
    } catch (err) {
      setError(err.message || 'Could not save round.')
    } finally {
      setSaving(false)
    }
  }

  async function togglePublish(round) {
    if (!memberId || !templateId) return
    setSaving(true)
    setError(null)
    try {
      if (round.candidate_visible) await api.unpublishOutcomeRound(templateId, memberId, round.id)
      else await api.publishOutcomeRound(templateId, memberId, round.id)
      await loadRounds()
      await onSaved?.()
    } catch (err) {
      setError(err.message || 'Could not update publish state.')
    } finally {
      setSaving(false)
    }
  }

  const candidateName = `${member?.first_name || ''} ${member?.last_name || ''}`.trim() || 'Candidate'
  const roleName = member?.requirement_name || template?.requirements || 'Role not assigned'

  return (
    <Modal open={open} onClose={onClose} title="Client outcome rounds" size="lg">
      <div className="workspace-stack" style={{ gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, border: '1px solid var(--border-default)', borderRadius: 14, background: 'linear-gradient(135deg, var(--brand-50), var(--bg-surface))' }}>
          <Avatar name={candidateName} size={42} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: 'var(--fg-primary)', fontSize: 15, fontWeight: 800 }}>{candidateName}</div>
            <div style={{ marginTop: 3, color: 'var(--fg-muted)', fontSize: 12 }}>{template?.client_name || 'Client'} · {roleName}</div>
          </div>
          <span className="status-pill status-pill--brand">{rounds.length} round{rounds.length === 1 ? '' : 's'}</span>
        </div>

        {loading ? <Spinner center /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rounds.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px', border: '1px dashed var(--border-default)', borderRadius: 14, background: 'var(--bg-surface-alt)', color: 'var(--fg-muted)' }}>
                <span style={{ width: 34, height: 34, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--brand-50)', color: 'var(--brand-600)', flexShrink: 0 }}>
                  <AlertCircle size={17} />
                </span>
                <div>
                  <strong style={{ display: 'block', color: 'var(--fg-primary)', fontSize: 13 }}>No client outcome rounds yet</strong>
                  <span style={{ display: 'block', fontSize: 12, marginTop: 3 }}>Add the first client-side round below, then publish it when candidates should see the update.</span>
                </div>
              </div>
            ) : rounds.map(round => (
              <div key={round.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 14, alignItems: 'center', padding: '14px 16px', border: '1px solid var(--border-default)', borderRadius: 14, background: 'var(--bg-surface)', boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ color: 'var(--fg-primary)', fontSize: 13 }}>Round {round.round_number}</strong>
                    <span className={`status-pill${round.candidate_visible ? ' status-pill--success' : ''}`}>
                      {round.candidate_visible ? 'Visible to candidate' : 'Draft'}
                    </span>
                    <span style={{ color: 'var(--fg-muted)', fontSize: 12, textTransform: 'capitalize' }}>
                      {round.outcome?.replace(/_/g, ' ') || 'pending'}
                    </span>
                  </div>
                  <div style={{ marginTop: 6, color: 'var(--fg-muted)', fontSize: 12 }}>
                    {round.interview_at ? formatDateTime(round.interview_at) : 'Interview date not set'}
                  </div>
                  {round.feedback && <div style={{ marginTop: 8, color: 'var(--fg-body)', fontSize: 12, lineHeight: 1.55 }}>{round.feedback}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                  <Button size="sm" variant="secondary" disabled={saving || round.candidate_visible} onClick={() => editRound(round)}>Edit</Button>
                  <Button size="sm" variant={round.candidate_visible ? 'secondary' : 'primary'} disabled={saving} onClick={() => togglePublish(round)}>
                    {round.candidate_visible ? 'Unpublish' : 'Publish'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: 18, border: '1px solid var(--brand-100)', borderRadius: 16, background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-surface-alt) 100%)', boxShadow: 'var(--shadow-xs)' }}>
          <div className="workspace-section-heading" style={{ marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 15 }}>{editingRound ? `Edit round ${editingRound.round_number}` : 'Add client round'}</h3>
              <p>Only published rounds are visible to candidates. Manager notes stay private.</p>
            </div>
            {editingRound && <Button size="sm" variant="secondary" onClick={() => { setEditingRound(null); setForm(freshOutcomeRoundForm()) }}>Cancel edit</Button>}
          </div>
          <div className="form-grid">
            <Field label="Interview date">
              <input className="form-input" type="datetime-local" value={form.interview_at} onChange={e => setForm(c => ({ ...c, interview_at: e.target.value }))} />
            </Field>
            <Field label="Outcome">
              <select className="form-input" value={form.outcome} onChange={e => setForm(c => ({ ...c, outcome: e.target.value }))}>
                <option value="pending">Pending</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="on_hold">On hold</option>
                <option value="offer_made">Offer made</option>
                <option value="hired">Hired</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </Field>
            <Field label="Candidate-visible feedback" full>
              <textarea className="form-input" rows={3} value={form.feedback} onChange={e => setForm(c => ({ ...c, feedback: e.target.value }))} style={{ resize: 'vertical' }} />
            </Field>
            <Field label="Private manager notes" full>
              <textarea className="form-input" rows={3} value={form.manager_notes} onChange={e => setForm(c => ({ ...c, manager_notes: e.target.value }))} style={{ resize: 'vertical' }} />
            </Field>
          </div>
          <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
            <Button onClick={saveRound} loading={saving}>{editingRound ? 'Save changes' : 'Add round'}</Button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}
      </div>
    </Modal>
  )
}

function MandateDetail({ initialTemplate, onBack }) {
  const navigate = useNavigate()
  const [template, setTemplate] = useState(initialTemplate)
  const [tab, setTab] = useState('overview')
  const [requirements, setRequirements] = useState([])
  const [requirementsError, setRequirementsError] = useState(null)
  const [reqModal, setReqModal] = useState(null)
  const [members, setMembers] = useState([])
  const [clientTeam, setClientTeam] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loadCandidatesError, setLoadCandidatesError] = useState(null)
  const [loadClientTeamError, setLoadClientTeamError] = useState(null)
  const [reports, setReports] = useState([])
  const [reportsError, setReportsError] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)
  const [reportDetailLoading, setReportDetailLoading] = useState(false)
  const [reportDetailError, setReportDetailError] = useState(null)
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [candidateSection, setCandidateSection] = useState('team')
  const [query, setQuery] = useState('')
  const [memberLimit, setMemberLimit] = useState(30)
  const [message, setMessage] = useState(null) // { text: string, type: 'success' | 'error' }
  const [editOpen, setEditOpen] = useState(false)
  const [deleteMandateOpen, setDeleteMandateOpen] = useState(false)
  const [addProspectsOpen, setAddProspectsOpen] = useState(false)
  const [candidateActionTarget, setCandidateActionTarget] = useState(null)
  const [addingCandidateId, setAddingCandidateId] = useState(null)
  const [candidateActionError, setCandidateActionError] = useState(null)
  const [sendJdTarget, setSendJdTarget] = useState(null)
  const [scheduleTarget, setScheduleTarget] = useState(null)
  const [roundsTarget, setRoundsTarget] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: () => { } })
  const tags = parseTags(template.tags)
  const isArchived = !!template.archived_at

  function handleArchive() {
    setConfirmDialog({
      open: true,
      title: 'Archive Mandate',
      message: 'Archive this client mandate? It will become read-only, but existing interviews will continue.',
      danger: true,
      confirmText: 'Archive',
      onConfirm: async () => {
        try {
          const res = await api.archiveClientTemplate(template.id)
          setTemplate(res.data)
          setMessage({ text: 'Mandate archived.', type: 'success' })
        } catch (err) { setMessage({ text: err.message || 'Could not archive mandate.', type: 'error' }) }
      }
    })
  }

  async function handleRestore() {
    try {
      const res = await api.restoreClientTemplate(template.id)
      setTemplate(res.data)
      setMessage({ text: 'Mandate restored.', type: 'success' })
    } catch (err) { setMessage({ text: err.message || 'Could not restore mandate.', type: 'error' }) }
  }

  const loadRequirements = useCallback(async () => {
    setRequirementsError(null)
    try {
      const r = await api.getMandateRequirements(template.id)
      setRequirements(r.data || [])
    } catch (err) {
      setRequirementsError(err.message || 'Failed to load requirement profiles')
      // Keep previous data if exists instead of clearing
    }
  }, [template.id])

  const loadCandidates = useCallback(async () => {
    setLoadCandidatesError(null)
    setLoadingCandidates(true)
    try {
      const [memberRes, assignmentRes] = await Promise.all([
        api.getTemplateMatches(template.id),
        api.getTemplateAssignments(template.id),
      ])
      setMembers(memberRes.data || [])
      setAssignments(assignmentRes.data || [])
    } catch (err) {
      setLoadCandidatesError(err.message || 'Failed to load candidates')
      // Keep previous data
    }
    finally { setLoadingCandidates(false) }
  }, [template.id])

  const loadClientTeam = useCallback(async () => {
    setLoadClientTeamError(null)
    setLoadingTeam(true)
    try {
      const r = await api.getClientTeam(template.id)
      setClientTeam(r.data || [])
    } catch (err) {
      setLoadClientTeamError(err.message || 'Failed to load client team')
      // Keep previous data
    }
    finally { setLoadingTeam(false) }
  }, [template.id])

  useEffect(() => { void loadRequirements() }, [loadRequirements])
  useEffect(() => { if (tab === 'candidates') void loadCandidates() }, [tab, loadCandidates])
  useEffect(() => { if (tab === 'team') void loadClientTeam() }, [tab, loadClientTeam])
  useEffect(() => {
    setReportsError(null)
    if (tab !== 'reports') return
    api.getTeamReports('client')
      .then(r => setReports((r.data?.reports || []).filter(rp => Number(rp.client_template_id) === Number(template.id))))
      .catch(err => {
        setReportsError(err.message || 'Failed to load reports')
      })
  }, [tab, template.id])

  const teamMembers = useMemo(() => members.filter(m => m.in_team), [members])
  const otherMembers = useMemo(() => members.filter(m => !m.in_team), [members])
  const activeList = candidateSection === 'team' ? teamMembers : otherMembers

  const visibleMembers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return activeList
    return activeList.filter(m =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q)
      || String(m.email || '').toLowerCase().includes(q)
      || String(m.current_position || '').toLowerCase().includes(q)
    )
  }, [activeList, query])
  const displayedMembers = visibleMembers.slice(0, memberLimit)

  useEffect(() => { setMemberLimit(30) }, [query, candidateSection, template.id])

  function removeFromTeam(member) {
    setConfirmDialog({
      open: true,
      title: 'Remove Team Member',
      message: `Remove ${member.first_name} ${member.last_name} from the client team?`,
      danger: true,
      confirmText: 'Remove',
      onConfirm: async () => {
        setRemovingId(member.id)
        try {
          await api.removeFromClientTeam(template.id, member.id)
          await loadClientTeam()
          setMessage({ text: `${member.first_name} ${member.last_name} removed from client team.`, type: 'success' })
        } catch (err) { setMessage({ text: err.message || 'Could not remove from team.', type: 'error' }) }
        finally { setRemovingId(null) }
      }
    })
  }

  function cancelAssignment(assignment) {
    const name = `${assignment.candidate_first || ''} ${assignment.candidate_last || ''}`.trim()
    setConfirmDialog({
      open: true,
      title: 'Cancel Interview',
      message: `Cancel the scheduled interview for ${name}?`,
      danger: true,
      confirmText: 'Cancel Interview',
      onConfirm: async () => {
        setCancellingId(assignment.id)
        try {
          await api.cancelTemplateAssignment(template.id, assignment.id)
          await loadCandidates()
          setMessage({ text: `Scheduled interview for ${name} was cancelled.`, type: 'success' })
        } catch (err) { setMessage({ text: err.message || 'Could not cancel the interview.', type: 'error' }) }
        finally { setCancellingId(null) }
      }
    })
  }

  function viewCandidateProfile(candidate) {
    if (!candidate) return
    if (candidate.team_member_id) {
      navigate(`/manager/team/${candidate.team_member_id}`)
    } else if (candidate.role || candidate.employee_id !== undefined) {
      navigate(`/manager/organization/${candidate.id}`)
    }
  }

  async function addCandidateFromBrowse(candidate, requirementId) {
    if (!candidate?.id) return
    setAddingCandidateId(candidate.id)
    setCandidateActionError(null)
    try {
      await api.addProspects(template.id, {
        userIds: [{
          userId: candidate.id,
          requirementId: requirementId ? Number(requirementId) : null,
        }],
      })
      setCandidateActionTarget(null)
      setMessage({ text: `${candidate.first_name || 'Candidate'} added to the client team.`, type: 'success' })
      await Promise.all([loadClientTeam(), loadCandidates()])
    } catch (err) {
      setCandidateActionError(err.message || 'Could not add candidate.')
    } finally {
      setAddingCandidateId(null)
    }
  }

  async function openMandateReport(report) {
    setSelectedReport(report)
    setReportDetailLoading(true)
    setReportDetailError(null)
    try {
      const response = report.interview_id
        ? await api.getReportByInterview(report.interview_id)
        : await api.getReportDetail(report.id)
      setSelectedReport({ ...report, ...(response.data || {}) })
    } catch (err) {
      setReportDetailError(err.message || 'Could not load report detail.')
    } finally {
      setReportDetailLoading(false)
    }
  }

  return (
    <div className="workspace-page workspace-stack">
      <div className="detail-header">
        <div className="detail-header__identity">
          <button type="button" className="detail-header__back" onClick={onBack}><ArrowLeft size={15} />Mandates</button>
          <div className="detail-header__title">
            <h2>
              {template.client_name}
              {isArchived && <span className="status-pill" style={{ marginLeft: 8, background: 'var(--slate-100)' }}>Archived</span>}
            </h2>
            <p>{template.requirements || 'Client hiring mandate'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isArchived ? (
            <>
              <Button variant="secondary" onClick={() => handleRestore()}>Restore mandate</Button>
              <Button variant="danger" onClick={() => setDeleteMandateOpen(true)}>Delete mandate</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit mandate</Button>
              <Button variant="secondary" onClick={() => handleArchive()}>Archive</Button>
            </>
          )}
        </div>
      </div>

      <div className="workspace-tabs" aria-label="Mandate sections" style={{ alignSelf: 'flex-start' }}>
        {[['overview', 'Overview'], ['jd', 'Job description'], ['candidates', 'Candidates'], ['team', 'Client team'], ['reports', 'Reports']].map(([id, label]) => (
          <button key={id} type="button" className={`workspace-tabs__button${tab === id ? ' is-active' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {message && <div
        style={{
          padding: 11,
          borderRadius: 8,
          background: message.type === 'error' ? 'var(--danger-50)' : 'var(--success-50)',
          color: message.type === 'error' ? 'var(--danger-700)' : 'var(--success-700)',
          fontSize: 12,
          cursor: 'pointer'
        }}
        onClick={() => setMessage(null)}
      >
        {message.text}
      </div>}

      <div className="workspace-panel detail-panel">

        {/* ── Overview tab ── */}
        {tab === 'overview' && (
          <div className="workspace-stack">
            <div className="detail-facts">
              {[['Client', template.client_name], ['Role', template.requirements || 'Not set'], ['Openings', template.headcount ?? 1], ['Hired', template.hired_count ?? 0], ['Pipeline', template.pipeline_count ?? 0], ['Client email', template.client_email || 'Not provided'], ['Created', formatDate(template.created)], ['Skills', tags.length]].map(([label, value]) => (
                <div className="detail-fact" key={label}><div className="detail-fact__label">{label}</div><div className="detail-fact__value">{value}</div></div>
              ))}
            </div>

            {template.custom_info && (
              <section>
                <div className="workspace-section-heading" style={{ marginBottom: 9 }}>
                  <div><h3 style={{ fontSize: 15 }}>Internal notes</h3><p>Context available to managers.</p></div>
                </div>
                <div style={{ padding: 15, borderRadius: 9, background: 'var(--slate-50)', color: 'var(--fg-body)', fontSize: 13, lineHeight: 1.65 }}>{template.custom_info}</div>
              </section>
            )}

            <section>
              <div className="workspace-section-heading" style={{ marginBottom: 9 }}>
                <div><h3 style={{ fontSize: 15 }}>Matching skills</h3></div>
              </div>
              {tags.length > 0 ? <div className="tag-list">{tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div>
                : <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>No matching skills defined.</span>}
            </section>

            <section>
              <div className="workspace-section-heading" style={{ marginBottom: 12 }}>
                <div><h3 style={{ fontSize: 15 }}>Requirement profiles</h3><p>Define multiple profiles for this mandate (e.g. junior vs senior).</p></div>
                <Button size="sm" onClick={() => setReqModal('new')} disabled={isArchived}><Plus size={13} />Add profile</Button>
              </div>
              {requirementsError && <ErrorMessage message={requirementsError} />}
              {requirements.length === 0 && !requirementsError ? (
                <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>No requirement profiles yet. Add profiles to distinguish between different experience levels or roles within this mandate.</span>
              ) : (
                <div className="assignment-list">
                  {requirements.map(r => (
                    <div className="assignment-row" key={r.id}>
                      <div className="assignment-row__content">
                        <strong>{r.profile_name}</strong>
                        <span>
                          {r.years_min != null ? `${r.years_min}–${r.years_max ?? '+'}  yrs exp` : 'Experience not specified'} &middot; {r.hired_count ?? 0} hired / {r.headcount ?? 1} openings &middot; {r.pipeline_count ?? 0} pipeline
                          {r.notes ? ` · ${r.notes}` : ''}
                        </span>
                        <span>
                          {r.jd_text ? 'Role JD attached' : 'Uses mandate JD'}
                        </span>
                      </div>
                      <button type="button" className="danger-icon-button" style={{ background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: 'var(--fg-muted)', cursor: 'pointer' }}
                        onClick={() => setReqModal(r)} disabled={isArchived}>
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── JD tab ── */}
        {tab === 'jd' && (
          (template.jd_text || requirements.some(r => r.jd_text))
            ? <div className="workspace-stack" style={{ gap: 14 }}>
              <div className="workspace-section-heading">
                <div><h3 style={{ fontSize: 16 }}>Job description</h3><p>Used for matching, communication, and AI interview context.</p></div>
                <FileText size={20} color="var(--brand-500)" />
              </div>
              {template.jd_text && (
                <section>
                  <h4 style={{ fontSize: 13, margin: '0 0 8px', color: 'var(--fg-primary)' }}>Mandate JD</h4>
                  <div style={{ padding: 18, border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--slate-50)', fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{template.jd_text}</div>
                </section>
              )}
              {requirements.filter(r => r.jd_text).map(r => (
                <section key={r.id}>
                  <h4 style={{ fontSize: 13, margin: '0 0 8px', color: 'var(--fg-primary)' }}>{r.profile_name || 'Role'} JD</h4>
                  <div style={{ padding: 18, border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--slate-50)', fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{r.jd_text}</div>
                </section>
              ))}
            </div>
            : <EmptyState message="No JD text attached. Edit the mandate to paste text or upload a document." />
        )}

        {/* ── Candidates tab ── */}
        {tab === 'candidates' && (
          loadingCandidates ? <Spinner center /> : (
            <div className="workspace-stack">
              {loadCandidatesError && <ErrorMessage message={loadCandidatesError} />}
              <div className="workspace-section-heading">
                <div>
                  <h3 style={{ fontSize: 16 }}>Browse candidates</h3>
                  <p>Select candidates and add them to this mandate's client team. AI recommendations only apply to your team members.</p>
                </div>
              </div>

              <div className="workspace-tabs" style={{ alignSelf: 'flex-start' }}>
                <button type="button" className={`workspace-tabs__button${candidateSection === 'team' ? ' is-active' : ''}`} onClick={() => setCandidateSection('team')}>
                  <Sparkles size={13} /> Team ({teamMembers.length})
                </button>
                <button type="button" className={`workspace-tabs__button${candidateSection === 'other' ? ' is-active' : ''}`} onClick={() => setCandidateSection('other')}>
                  Other org members ({otherMembers.length})
                </button>
              </div>

              {assignments.length > 0 && (
                <section>
                  <div className="workspace-section-heading" style={{ marginBottom: 10 }}>
                    <div><h3 style={{ fontSize: 15 }}>Interview history</h3></div>
                  </div>
                  <div className="assignment-list">
                    {assignments.map(assignment => {
                      const name = `${assignment.candidate_first || ''} ${assignment.candidate_last || ''}`.trim()
                      return (
                        <div className="assignment-row" key={assignment.id}>
                          <Avatar name={name} size={30} />
                          <div className="assignment-row__content">
                            <strong>{name}</strong>
                            <span>{assignment.candidate_email} · {assignment.question_count} questions · {formatDate(assignment.created)}</span>
                          </div>
                          <span className={`status-pill${assignment.status === 'completed' ? ' status-pill--success' : assignment.status === 'cancelled' ? ' status-pill--danger' : ' status-pill--brand'}`}>{assignment.status}</span>
                          {assignment.status === 'scheduled' && (
                            <button type="button" className="danger-icon-button" disabled={isArchived || cancellingId === assignment.id} onClick={() => cancelAssignment(assignment)}><Trash2 size={14} /></button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              <div className="workspace-search" style={{ width: '100%' }}>
                <Search size={15} />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, email, or role..." />
              </div>

              {candidateSection === 'team' && teamMembers.length === 0 ? (
                <EmptyState message="You have no team members yet. Add members on the Team page, then come back to recommend them for this mandate." />
              ) : visibleMembers.length === 0 ? (
                <EmptyState message="No members match this search." />
              ) : (
                <div className="workspace-grid">
                  {displayedMembers.map(member => {
                    const name = `${member.first_name || ''} ${member.last_name || ''}`.trim()
                    return (
                      <button type="button" className="workspace-card" key={member.id} disabled={isArchived} onClick={() => { setCandidateActionTarget(member); setCandidateActionError(null) }} style={{ textAlign: 'left' }}>
                        <div className="workspace-card__body" style={{ padding: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <Avatar name={name} size={34} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <strong style={{ display: 'block', overflow: 'hidden', color: 'var(--fg-primary)', fontSize: 13, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</strong>
                              <span style={{ display: 'block', overflow: 'hidden', marginTop: 3, color: 'var(--fg-muted)', fontSize: 11, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.current_position || member.email}</span>
                            </div>
                            {member.recommended && <span className="status-pill status-pill--success">{member.match_score} match</span>}
                          </div>
                          {(member.matched_tags || []).length > 0 && (
                            <div className="tag-list" style={{ marginTop: 12 }}>
                              {member.matched_tags.slice(0, 4).map(tag => <span className="tag" key={tag}>{tag}</span>)}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {visibleMembers.length > memberLimit && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Button variant="secondary" onClick={() => setMemberLimit(c => c + 30)}>Show 30 more</Button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border-default)' }}>
                <Button onClick={() => setAddProspectsOpen(true)} disabled={isArchived}>
                  <UserCheck size={14} />Add prospects to client team
                </Button>
              </div>
            </div>
          )
        )}

        {/* ── Client Team tab ── */}
        {tab === 'team' && (
          loadingTeam ? <Spinner center /> : (
            <div className="workspace-stack">
              <div className="workspace-section-heading">
                <div>
                  <h3 style={{ fontSize: 16 }}>Client team</h3>
                  <p>Prospects added to this mandate. Send the JD, schedule interviews, and track client interview outcomes.</p>
                </div>
                <Button onClick={() => setAddProspectsOpen(true)} disabled={isArchived}><Plus size={14} />Add prospects</Button>
              </div>

              {loadClientTeamError && <ErrorMessage message={loadClientTeamError} />}
              {clientTeam.length === 0 && !loadClientTeamError ? (
                <EmptyState message="No prospects added yet. Go to the Candidates tab to select and add team members or other org members." />
              ) : (
                <div className="assignment-list" style={{ gap: 0 }}>
                  {clientTeam.map(member => {
                    const name = `${member.first_name} ${member.last_name}`.trim()
                    const interview = member.latest_interview
                    return (
                      <div key={member.id} style={{ borderBottom: '1px solid var(--border-default)', padding: '14px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <Avatar name={name} size={34} />
                          <div style={{ flex: 1, minWidth: 160 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)' }}>{name}</div>
                            <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{member.email}</div>
                            {member.requirement_name && (
                              <span className="tag" style={{ marginTop: 4, display: 'inline-block' }}>
                                {member.requirement_name}{requirementMeta(member) ? ` | ${requirementMeta(member)}` : ''}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className={`status-pill${member.jd_sent ? ' status-pill--success' : ''}`} title={member.jd_sent_at ? formatDate(member.jd_sent_at) : 'Not sent'}>
                              {member.jd_sent ? <><CheckCircle2 size={11} /> JD sent</> : 'JD not sent'}
                            </span>
                            {member.client_resume_url
                              ? <a href={member.client_resume_url} target="_blank" rel="noreferrer" className="status-pill status-pill--success" style={{ textDecoration: 'none' }}>Resume submitted</a>
                              : <span className="status-pill">No resume</span>}
                            {interview && (
                              <span className={`status-pill${interview.status === 'completed' ? ' status-pill--success' : interview.status === 'cancelled' ? ' status-pill--danger' : ' status-pill--brand'}`}>
                                {interview.type === 'offline' ? 'Offline' : interview.type === 'client' ? 'Client' : interview.type === 'human' ? 'Human' : interview.type === 'exam' ? 'Exam' : 'AI Voice'}: {interview.status}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: 6 }}>
                            <Button size="sm" variant="secondary" onClick={() => setSendJdTarget(member)} disabled={isArchived}><Mail size={12} />Send JD</Button>
                            <Button size="sm" variant="secondary" onClick={() => setScheduleTarget(member)} disabled={isArchived}><Calendar size={12} />Schedule</Button>
                            <Button size="sm" variant="secondary" onClick={() => setRoundsTarget(member)}><AlertCircle size={12} />Rounds</Button>
                            <button type="button" className="danger-icon-button" disabled={isArchived || removingId === member.id}
                              onClick={() => removeFromTeam(member)} style={{ padding: '5px 8px' }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        {interview?.scheduled_at && (
                          <div style={{ paddingLeft: 46, marginTop: 6, fontSize: 11, color: 'var(--fg-muted)' }}>
                            <Clock size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            {formatDateTime(interview.scheduled_at)}{interview.location ? ` | ${interview.location}` : ''}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        )}

        {/* ── Reports tab ── */}
        {tab === 'reports' && (
          <div className="workspace-stack">
            {reportsError && <ErrorMessage message={reportsError} />}
            {reports.length === 0 && !reportsError
              ? <EmptyState message="Reports for this mandate will appear after interviews are completed." />
              : (
                <div className="assignment-list">
                  {reports.map(report => (
                    <div className="assignment-row" key={report.id} role="button" tabIndex={0} onClick={() => openMandateReport(report)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') openMandateReport(report) }} style={{ cursor: 'pointer' }}>
                      <Avatar name={`${report.candidate_first || ''} ${report.candidate_last || ''}`.trim()} size={30} />
                      <div className="assignment-row__content">
                        <strong>{report.candidate_first} {report.candidate_last}</strong>
                        <span>Overall score: {report.overall_score ?? 'Not scored'}</span>
                      </div>
                      <span className={`status-pill${report.decision === 'pass' ? ' status-pill--success' : ' status-pill--warning'}`}>{report.decision || 'Review'}</span>
                      <Button size="sm" variant="secondary" onClick={event => { event.stopPropagation(); openMandateReport(report) }}>View</Button>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}
      </div>

      <EditMandateModal
        open={editOpen}
        template={template}
        requirements={requirements}
        onClose={() => setEditOpen(false)}
        onSaved={updated => { setTemplate(updated); setEditOpen(false); void loadRequirements() }}
      />

      <DeleteMandateModal
        open={deleteMandateOpen}
        template={template}
        onClose={() => setDeleteMandateOpen(false)}
        onSuccess={() => { setDeleteMandateOpen(false); navigate('/manager/clients') }}
      />

      <RequirementModal
        open={!!reqModal}
        onClose={() => setReqModal(null)}
        mandateId={template.id}
        existing={reqModal && reqModal !== 'new' ? reqModal : null}
        onSaved={() => { setReqModal(null); void loadRequirements() }}
      />

      <AddProspectsModal
        open={addProspectsOpen}
        onClose={() => setAddProspectsOpen(false)}
        mandateId={template.id}
        requirements={requirements}
        onAdded={() => { loadClientTeam(); if (tab === 'candidates') loadCandidates() }}
      />

      <CandidateActionModal
        candidate={candidateActionTarget}
        requirements={requirements}
        onClose={() => { setCandidateActionTarget(null); setCandidateActionError(null) }}
        onViewProfile={() => viewCandidateProfile(candidateActionTarget)}
        onAdd={(reqId) => addCandidateFromBrowse(candidateActionTarget, reqId)}
        adding={addingCandidateId === candidateActionTarget?.id}
        error={candidateActionError}
      />

      <MandateReportDetailModal
        report={selectedReport}
        loading={reportDetailLoading}
        error={reportDetailError}
        onClose={() => { setSelectedReport(null); setReportDetailError(null) }}
      />

      {sendJdTarget && (
        <SendJDModal
          open={!!sendJdTarget}
          onClose={() => setSendJdTarget(null)}
          member={sendJdTarget}
          template={template}
          onSent={() => { setSendJdTarget(null); loadClientTeam(); setMessage({ text: `JD sent to ${sendJdTarget.first_name}.`, type: 'success' }) }}
        />
      )}

      {scheduleTarget && (
        <ScheduleClientTeamModal
          open={!!scheduleTarget}
          onClose={() => setScheduleTarget(null)}
          member={scheduleTarget}
          template={template}
          onScheduled={() => { setScheduleTarget(null); loadClientTeam(); setMessage({ text: 'Interview scheduled successfully.', type: 'success' }) }}
        />
      )}

      {roundsTarget && (
        <OutcomeRoundsModal
          open={!!roundsTarget}
          onClose={() => setRoundsTarget(null)}
          member={roundsTarget}
          template={template}
          onSaved={() => { loadClientTeam(); setMessage({ text: 'Outcome rounds updated.', type: 'success' }) }}
        />
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        danger={confirmDialog.danger}
        confirmText={confirmDialog.confirmText}
        onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  )
}

// ── List page ─────────────────────────────────────────────────────────────────

function ClientInterviewsPage() {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [listState, setListState] = useState('active')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.getClientTemplates(listState)
      setTemplates(response.data || [])
    } catch (err) { setError(err.message || 'Could not load client mandates.') }
    finally { setLoading(false) }
  }, [listState])

  useEffect(() => { void load() }, [load])

  const visibleTemplates = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return templates
    return templates.filter(t =>
      String(t.client_name || '').toLowerCase().includes(q)
      || String(t.requirements || '').toLowerCase().includes(q)
      || String(t.client_email || '').toLowerCase().includes(q)
      || parseTags(t.tags).join(' ').toLowerCase().includes(q)
    )
  }, [query, templates])

  if (selectedTemplate) {
    return <MandateDetail initialTemplate={selectedTemplate} onBack={() => { setSelectedTemplate(null); void load() }} />
  }

  return (
    <div className="workspace-page workspace-stack">
      <div className="workspace-section-heading">
        <div className="workspace-intro">
          <h2>Client mandate library</h2>
          <p>Review every active client requirement, then open a mandate to manage its JD, candidates, and interviews.</p>
        </div>
      </div>

      <div className="workspace-toolbar">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 260, flexWrap: 'wrap' }}>
          <div className="workspace-search" style={{ flex: '1 1 280px' }}>
          <Search size={16} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search clients, roles, or skills..." />
          </div>
          <div style={{ display: 'inline-flex', gap: 4, padding: 4, border: '1px solid var(--border-default)', borderRadius: 999, background: 'var(--bg-surface)' }} aria-label="Mandate status filter">
            {MANDATE_FILTERS.map(filter => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setListState(filter.value)}
                aria-pressed={listState === filter.value}
                style={{
                  border: 0,
                  borderRadius: 999,
                  padding: '7px 12px',
                  background: listState === filter.value ? 'var(--brand-500)' : 'transparent',
                  color: listState === filter.value ? 'white' : 'var(--fg-muted)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: listState === filter.value ? 'var(--shadow-xs)' : 'none',
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={() => setWizardOpen(true)}><Plus size={15} />New mandate</Button>
      </div>

      {loading && <Spinner center />}
      {error && <ErrorMessage message={error} />}
      {!loading && !error && templates.length === 0 && <div className="workspace-panel"><EmptyState message="No client mandates yet. Create one to begin matching organization members." /></div>}
      {!loading && !error && templates.length > 0 && visibleTemplates.length === 0 && <div className="workspace-panel"><EmptyState message="No client mandates match this search." /></div>}
      {!loading && !error && visibleTemplates.length > 0 && (
        <div className="workspace-grid workspace-grid--wide">
          {visibleTemplates.map(template => {
            const tags = parseTags(template.tags)
            return (
              <button type="button" className="workspace-card" key={template.id} onClick={() => setSelectedTemplate(template)}>
                <div className="workspace-card__body">
                  <div className="workspace-card__topline">
                    <div className="workspace-card__icon"><BriefcaseBusiness size={20} /></div>
                    <span className="status-pill status-pill--brand">{template.headcount ?? 1} needed</span>
                  </div>
                  <div style={{ marginTop: 18 }}>
                    <div className="workspace-card__eyebrow">{template.client_name}</div>
                    <h3 className="workspace-card__title">{template.requirements || 'Role not specified'}</h3>
                    <p className="workspace-card__subtitle">{template.custom_info || 'Open this mandate to review the JD and manage candidates.'}</p>
                  </div>
                  <div className="workspace-card__meta">
                    <span><Mail size={13} /> {template.client_email || 'No client email'}</span>
                    <span><Users size={13} /> {template.hired_count ?? 0} hired / {template.headcount ?? 1} positions</span>
                    <span><FileText size={13} /> {template.jd_text ? 'JD ready' : 'JD missing'}</span>
                  </div>
                  {tags.length > 0 && (
                    <div className="tag-list" style={{ marginTop: 15 }}>
                      {tags.slice(0, 4).map(tag => <span className="tag" key={tag}>{tag}</span>)}
                      {tags.length > 4 && <span className="tag">+{tags.length - 4}</span>}
                    </div>
                  )}
                  <div className="workspace-card__footer">
                    <span className="workspace-card__link">Open mandate <ArrowRight size={13} /></span>
                    <span style={{ color: 'var(--fg-subtle)', fontSize: 11 }}>{formatDate(template.created)}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <CreateMandateModal open={wizardOpen} onClose={() => setWizardOpen(false)} onCreated={load} />
    </div>
  )
}

export default ClientInterviewsPage

