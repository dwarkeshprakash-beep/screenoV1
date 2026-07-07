import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BriefcaseBusiness, Calendar, CheckCircle2,
  Clock, FileText, Mail, Plus, Search, Sparkles, Trash2, Upload,
  UserCheck, Users, X, AlertCircle, Video,
} from 'lucide-react'
import Avatar from '../../components/shared/Avatar'
import Button from '../../components/shared/Button'
import EmptyState from '../../components/shared/EmptyState'
import ErrorMessage from '../../components/shared/ErrorMessage'
import Modal from '../../components/shared/Modal'
import Spinner from '../../components/shared/Spinner'
import * as api from '../../services/api'
import { formatDate, parseStoredArray } from '../../utils/helpers'

const parseTags = parseStoredArray

function Field({ label, help, full = false, children }) {
  return (
    <div className={`form-field${full ? ' form-field--full' : ''}`}>
      <span className="form-label">{label}</span>
      {children}
      {help && <span className="form-help">{help}</span>}
    </div>
  )
}

// ── Mandate creation wizard ───────────────────────────────────────────────────

function CreateMandateModal({ open, onClose, onCreated }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ clientName: '', clientEmail: '', requirements: '', headcount: 1, jdText: '', customInfo: '' })
  const [tags, setTags] = useState([])
  const [customTag, setCustomTag] = useState('')
  const [fileName, setFileName] = useState('')
  const [extractingFile, setExtractingFile] = useState(false)
  const [extractingTags, setExtractingTags] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setStep(1)
    setForm({ clientName: '', clientEmail: '', requirements: '', headcount: 1, jdText: '', customInfo: '' })
    setTags([])
    setCustomTag('')
    setFileName('')
    setError(null)
  }, [open])

  function update(key, value) { setForm(c => ({ ...c, [key]: value })) }

  async function readJdFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setExtractingFile(true)
    setError(null)
    try {
      const response = await api.extractTextFromFile(file)
      const text = response.data?.text || ''
      if (!text.trim()) throw new Error('No readable text was found in this document.')
      update('jdText', text)
      setFileName(file.name)
    } catch (err) { setError(err.message || 'Could not read the JD document.') }
    finally { setExtractingFile(false) }
  }

  async function continueToTags() {
    if (!form.clientName.trim()) { setError('Client name is required.'); return }
    if (!form.requirements.trim()) { setError('Subject or role is required.'); return }
    setExtractingTags(true)
    setError(null)
    try {
      if (form.jdText.trim()) {
        const response = await api.extractTemplateTags(form.jdText)
        setTags(Array.isArray(response.data) ? response.data : [])
      }
      setStep(2)
    } catch { setStep(2) }
    finally { setExtractingTags(false) }
  }

  function addTag() {
    const t = customTag.trim()
    if (t && !tags.includes(t)) setTags(c => [...c, t])
    setCustomTag('')
  }

  async function saveMandate() {
    setSaving(true)
    setError(null)
    try {
      await api.createClientTemplate({
        client_name: form.clientName.trim(),
        client_email: form.clientEmail.trim() || null,
        requirements: form.requirements.trim(),
        headcount: Number(form.headcount) || 1,
        jd_text: form.jdText.trim(),
        custom_info: form.customInfo.trim() || null,
        tags: JSON.stringify(tags),
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
          {[['1. Mandate details', 1], ['2. Matching skills', 2]].map(([label, s]) => (
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
            <Field label="Role / mandate title" full>
              <input className="form-input" value={form.requirements} onChange={e => update('requirements', e.target.value)} placeholder="e.g. Senior Backend Engineer" />
            </Field>
            <Field label="Required headcount">
              <input className="form-input" type="number" min="1" value={form.headcount} onChange={e => update('headcount', e.target.value)} />
            </Field>
            <Field label="Job description source" help="Paste the JD below or upload PDF, DOC, DOCX, or TXT.">
              <input id="client-jd-file" type="file" accept=".pdf,.doc,.docx,.txt" onChange={readJdFile} style={{ display: 'none' }} />
              <label htmlFor="client-jd-file" className="product-button product-button--secondary product-button--md" style={{ alignSelf: 'flex-start', cursor: extractingFile ? 'wait' : 'pointer' }}>
                <Upload size={14} />{extractingFile ? 'Reading document...' : 'Upload JD file'}
              </label>
              {fileName && <span className="form-help">{fileName}</span>}
            </Field>
            <Field label="Job description" full>
              <textarea className="form-input" rows={9} value={form.jdText} onChange={e => update('jdText', e.target.value)} placeholder="Paste the client JD here..." style={{ resize: 'vertical' }} />
            </Field>
            <Field label="Internal notes" full help="Visible to managers, not candidates.">
              <textarea className="form-input" rows={4} value={form.customInfo} onChange={e => update('customInfo', e.target.value)} placeholder="Interview process, client expectations, or other context..." style={{ resize: 'vertical' }} />
            </Field>
          </div>
        ) : (
          <div className="workspace-stack" style={{ gap: 16 }}>
            <div className="workspace-section-heading">
              <div><h3 style={{ fontSize: 16 }}>Review matching skills</h3><p>These tags are used for AI recommendations. Team members whose skills match will appear first.</p></div>
              <Sparkles size={20} color="var(--brand-500)" />
            </div>
            <div className="tag-list" style={{ minHeight: 34 }}>
              {tags.length === 0 && <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>No tags extracted. Add skills manually.</span>}
              {tags.map(tag => (
                <span className="tag" key={tag}>{tag}
                  <button type="button" onClick={() => setTags(c => c.filter(t => t !== tag))} style={{ display: 'inline-flex', marginLeft: 5, border: 0, background: 'transparent', color: 'inherit' }}><X size={12} /></button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" value={customTag} onChange={e => setCustomTag(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Add a skill tag" />
              <Button variant="secondary" onClick={addTag}>Add</Button>
            </div>
          </div>
        )}

        {error && <div style={{ padding: 11, borderRadius: 8, background: 'var(--danger-50)', color: 'var(--danger-700)', fontSize: 12 }}>{error}</div>}
        <div className="form-actions">
          <Button variant="secondary" onClick={step === 1 ? onClose : () => setStep(1)}>{step === 1 ? 'Cancel' : 'Back'}</Button>
          {step === 1
            ? <Button onClick={continueToTags} loading={extractingTags}>Review skills</Button>
            : <Button onClick={saveMandate} loading={saving}>Save mandate</Button>}
        </div>
      </div>
    </Modal>
  )
}

// ── Edit mandate ──────────────────────────────────────────────────────────────

function EditMandateModal({ open, template, onClose, onSaved }) {
  const [form, setForm] = useState({})
  const [tags, setTags] = useState([])
  const [customTag, setCustomTag] = useState('')
  const [saving, setSaving] = useState(false)
  const [readingFile, setReadingFile] = useState(false)
  const [extractingTags, setExtractingTags] = useState(false)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm({ client_name: template.client_name || '', client_email: template.client_email || '', requirements: template.requirements || '', headcount: template.headcount || 1, jd_text: template.jd_text || '', custom_info: template.custom_info || '' })
    setTags(parseTags(template.tags))
    setCustomTag('')
    setFileName('')
    setError(null)
  }, [open, template])

  async function readFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setReadingFile(true)
    try {
      const response = await api.extractTextFromFile(file)
      const text = response.data?.text || ''
      if (!text.trim()) throw new Error('No readable text was found in this document.')
      setForm(c => ({ ...c, jd_text: text }))
      setFileName(file.name)
    } catch (err) { setError(err.message || 'Could not read the JD document.') }
    finally { setReadingFile(false) }
  }

  function addTag() {
    const t = customTag.trim()
    if (t && !tags.some(tag => tag.toLowerCase() === t.toLowerCase())) setTags(c => [...c, t])
    setCustomTag('')
  }

  async function regenerateTags() {
    const jd = String(form.jd_text || '').trim()
    if (!jd) { setError('Add a job description before regenerating skills.'); return }
    setExtractingTags(true)
    setError(null)
    try {
      const response = await api.extractTemplateTags(jd)
      setTags(Array.isArray(response.data) ? response.data : [])
    } catch (err) { setError(err.message || 'Could not regenerate matching skills.') }
    finally { setExtractingTags(false) }
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const response = await api.updateClientTemplate(template.id, { ...form, tags: JSON.stringify(tags) })
      onSaved(response.data || { ...template, ...form })
    } catch (err) { setError(err.message || 'Could not update the mandate.') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit client mandate" size="lg">
      <div className="workspace-stack">
        <div className="form-grid">
          <Field label="Client name"><input className="form-input" value={form.client_name || ''} onChange={e => setForm(c => ({ ...c, client_name: e.target.value }))} /></Field>
          <Field label="Client email"><input className="form-input" type="email" value={form.client_email || ''} onChange={e => setForm(c => ({ ...c, client_email: e.target.value }))} /></Field>
          <Field label="Subject or role" full><input className="form-input" value={form.requirements || ''} onChange={e => setForm(c => ({ ...c, requirements: e.target.value }))} /></Field>
          <Field label="Headcount"><input className="form-input" type="number" min="1" value={form.headcount || 1} onChange={e => setForm(c => ({ ...c, headcount: Number(e.target.value) }))} /></Field>
          <Field label="Replace JD from file">
            <input id="edit-jd-file" type="file" accept=".pdf,.doc,.docx,.txt" onChange={readFile} style={{ display: 'none' }} />
            <label htmlFor="edit-jd-file" className="product-button product-button--secondary product-button--md" style={{ alignSelf: 'flex-start' }}>
              <Upload size={14} />{readingFile ? 'Reading...' : 'Choose document'}
            </label>
            {fileName && <span className="form-help">{fileName}</span>}
          </Field>
          <Field label="Job description" full><textarea className="form-input" rows={9} value={form.jd_text || ''} onChange={e => setForm(c => ({ ...c, jd_text: e.target.value }))} style={{ resize: 'vertical' }} /></Field>
          <Field label="Internal notes" full><textarea className="form-input" rows={4} value={form.custom_info || ''} onChange={e => setForm(c => ({ ...c, custom_info: e.target.value }))} style={{ resize: 'vertical' }} /></Field>
          <div className="form-field form-field--full">
            <div className="workspace-section-heading" style={{ marginBottom: 8 }}>
              <div><h3 style={{ fontSize: 15 }}>Matching skills</h3><p>Used for AI recommendations in the candidates tab.</p></div>
              <Button variant="secondary" size="sm" onClick={regenerateTags} loading={extractingTags}><Sparkles size={13} />Regenerate</Button>
            </div>
            <div className="tag-list" style={{ minHeight: 30 }}>
              {tags.length === 0 && <span className="form-help">No matching skills saved yet.</span>}
              {tags.map(tag => (
                <span className="tag" key={tag}>{tag}
                  <button type="button" onClick={() => setTags(c => c.filter(t => t !== tag))} style={{ display: 'inline-flex', marginLeft: 5, border: 0, background: 'transparent', color: 'inherit' }}><X size={12} /></button>
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
          <Button onClick={save} loading={saving}>Save changes</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Requirement profile modal ─────────────────────────────────────────────────

function RequirementModal({ open, onClose, onSaved, existing, mandateId }) {
  const [form, setForm] = useState({ profile_name: '', years_min: '', years_max: '', headcount: 1, notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm(existing
      ? { profile_name: existing.profile_name || '', years_min: existing.years_min ?? '', years_max: existing.years_max ?? '', headcount: existing.headcount || 1, notes: existing.notes || '' }
      : { profile_name: '', years_min: '', years_max: '', headcount: 1, notes: '' })
    setError(null)
  }, [open, existing])

  async function save() {
    if (!form.profile_name.trim()) { setError('Profile name is required.'); return }
    setSaving(true)
    setError(null)
    try {
      const data = { ...form, years_min: form.years_min !== '' ? Number(form.years_min) : null, years_max: form.years_max !== '' ? Number(form.years_max) : null, headcount: Number(form.headcount) || 1 }
      const response = existing
        ? await api.updateMandateRequirement(mandateId, existing.id, data)
        : await api.createMandateRequirement(mandateId, data)
      onSaved(response.data)
    } catch (err) { setError(err.message || 'Could not save requirement.') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit requirement profile' : 'Add requirement profile'} size="md">
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
          <Field label="Notes" full>
            <textarea className="form-input" rows={3} value={form.notes} onChange={e => setForm(c => ({ ...c, notes: e.target.value }))} placeholder="Additional notes for this profile..." style={{ resize: 'vertical' }} />
          </Field>
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
      await api.addProspects(mandateId, { userIds: selectedIds, requirementId: requirementId ? Number(requirementId) : null })
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
          <Field label="Assign to requirement profile" help="Optional — helps track which profile each prospect is for.">
            <select className="form-input" value={requirementId} onChange={e => setRequirementId(e.target.value)}>
              <option value="">No specific profile</option>
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
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {error && <ErrorMessage message={error} />}
        <div className="form-actions">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={addProspects} loading={adding} disabled={selectedIds.length === 0}>
            <UserCheck size={14} />Add {selectedIds.length > 0 ? selectedIds.length : ''} to client team
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Send JD modal (with custom message + preview) ─────────────────────────────

function SendJDModal({ open, onClose, onSent, member, template }) {
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { if (open) { setCustomMessage(''); setError(null) } }, [open])

  const previewText = customMessage.trim() || `Your profile is being considered for a client requirement at ${template?.client_name || 'our client'}.`
  const jdPreview = (template?.jd_text || template?.requirements || '').slice(0, 600)

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
          <div className="detail-fact"><div className="detail-fact__label">Role</div><div className="detail-fact__value">{template?.requirements}</div></div>
        </div>

        <Field label="Custom message (optional)" help="Appears above the JD in the email. Leave blank to use the default.">
          <textarea className="form-input" rows={4} value={customMessage} onChange={e => setCustomMessage(e.target.value)} placeholder="Hi [Name], we think your profile is a great fit for this role at our client..." style={{ resize: 'vertical' }} />
        </Field>

        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email preview</p>
          <div style={{ border: '1px solid var(--border-default)', borderRadius: 10, padding: 18, background: 'var(--bg-page)', fontSize: 13, color: 'var(--fg-body)' }}>
            <p style={{ margin: '0 0 10px', fontWeight: 600, color: 'var(--fg-primary)' }}>Subject: [{template?.client_name}] Job opportunity — {template?.requirements}</p>
            <p style={{ margin: '0 0 8px' }}>Hi <strong>{member?.first_name}</strong>,</p>
            <p style={{ margin: '0 0 12px', color: 'var(--fg-muted)' }}>{previewText}</p>
            {jdPreview && (
              <div style={{ background: 'var(--brand-50)', borderLeft: '3px solid var(--brand-500)', padding: '10px 14px', borderRadius: '0 6px 6px 0', fontSize: 12, color: 'var(--fg-body)', whiteSpace: 'pre-wrap' }}>
                {jdPreview}{(template?.jd_text?.length || 0) > 600 ? '...' : ''}
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
  { value: 'exam',     label: 'Coding Exam',         desc: 'Coding or multiple-choice assessment' },
  { value: 'human',   label: 'Human Video Interview', desc: 'Live video interview with a managed meeting link' },
  { value: 'offline', label: 'Offline Interview',     desc: 'In-person interview — sends email with date and location' },
  { value: 'client',  label: 'Client Interview',      desc: 'Log a real client-side interview and track its outcome' },
]

const HUMAN_VIDEO_PLATFORMS = [
  { value: 'google_meet', label: 'Google Meet', Icon: Video, disabled: false },
  { value: 'teams', label: 'Microsoft Teams', Icon: BriefcaseBusiness, disabled: true },
]

function ScheduleClientTeamModal({ open, onClose, onScheduled, member, template }) {
  const [type, setType] = useState('ai_voice')
  const [videoPlatform, setVideoPlatform] = useState('google_meet')
  const [platformStatus, setPlatformStatus] = useState({ google_meet: false, teams: false })
  const [mode, setMode] = useState('simple')
  const [difficulty, setDifficulty] = useState('medium')
  const [questionCount, setQuestionCount] = useState(10)
  const [scheduledAt, setScheduledAt] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setType('ai_voice')
    setVideoPlatform('google_meet')
    setMode('simple')
    setDifficulty('medium')
    setQuestionCount(10)
    setScheduledAt('')
    setLocation('')
    setNotes('')
    setError(null)
    // Load which platforms are configured
    api.getVideoPlatforms()
      .then(r => setPlatformStatus(r.data || {}))
      .catch(() => {})
  }, [open])

  async function schedule() {
    if (type === 'human') {
      if (!scheduledAt) {
        setError('Choose a date and time for the human interview.')
        return
      }
      if (videoPlatform === 'teams') {
        setError('Microsoft Teams scheduling needs organization setup before it can be used.')
        return
      }
      if (!platformStatus.google_meet) {
        setError('Google Meet is not configured yet. Add the Google Calendar service-account settings first.')
        return
      }
    }
    setScheduling(true)
    setError(null)
    try {
      await api.scheduleClientTeamInterview(template.id, member.id, {
        type,
        videoPlatform: type === 'human' ? videoPlatform : undefined,
        mode,
        difficulty,
        questionCount: Number(questionCount),
        scheduledAt:   scheduledAt || null,
        location:      location.trim() || null,
        notes:         notes.trim() || null,
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

        <Field label="Interview type">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {INTERVIEW_TYPES.map(t => (
              <label key={t.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1px solid ${type === t.value ? 'var(--brand-400)' : 'var(--border-default)'}`, background: type === t.value ? 'var(--brand-50)' : 'var(--bg-surface)', cursor: 'pointer' }}>
                <input type="radio" name="interview-type" value={t.value} checked={type === t.value} onChange={() => setType(t.value)} style={{ marginTop: 2, accentColor: 'var(--brand-500)' }} />
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
              <Field label="Questions" full>
                <input className="form-input" type="number" min="1" max="50" value={questionCount} onChange={e => setQuestionCount(e.target.value)} />
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
          </div>
        )}

        {(type === 'human' || type === 'offline' || type === 'client') && (
          <Field label={type === 'client' ? 'Scheduled interview date' : 'Date & time'}>
            <input className="form-input" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          </Field>
        )}

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

        {(type === 'offline' || type === 'client') && (
          <Field label="Notes" full>
            <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional details..." style={{ resize: 'vertical' }} />
          </Field>
        )}

        {error && <ErrorMessage message={error} />}
        <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={schedule} loading={scheduling} disabled={humanScheduleBlocked}>
            <Calendar size={14} />
            {type === 'client' ? 'Log client interview' : `Schedule ${selectedTypeInfo?.label || ''}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Client interview record modal (outcome tracking) ──────────────────────────

function ClientInterviewOutcomeModal({ open, onClose, onSaved, member, template, existing }) {
  const [form, setForm] = useState({ outcome: 'pending', feedback: '', interview_date: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm({
      outcome: existing?.outcome || 'pending',
      feedback: existing?.feedback || '',
      interview_date: existing?.interview_date ? existing.interview_date.split('T')[0] : '',
    })
    setError(null)
  }, [open, existing])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await api.saveClientInterviewRecord(template.id, member.id, form)
      onSaved()
      onClose()
    } catch (err) { setError(err.message || 'Could not save outcome.') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Client interview outcome" size="md">
      <div className="workspace-stack">
        <div className="detail-facts">
          <div className="detail-fact"><div className="detail-fact__label">Candidate</div><div className="detail-fact__value">{member?.first_name} {member?.last_name}</div></div>
          <div className="detail-fact"><div className="detail-fact__label">Client</div><div className="detail-fact__value">{template?.client_name}</div></div>
        </div>
        <div className="form-grid">
          <Field label="Interview date">
            <input className="form-input" type="date" value={form.interview_date} onChange={e => setForm(c => ({ ...c, interview_date: e.target.value }))} />
          </Field>
          <Field label="Outcome">
            <select className="form-input" value={form.outcome} onChange={e => setForm(c => ({ ...c, outcome: e.target.value }))}>
              <option value="pending">Pending</option>
              <option value="passed">Passed</option>
              <option value="failed">Did not clear</option>
              <option value="on_hold">On hold</option>
            </select>
          </Field>
          <Field label="Feedback / reason" full>
            <textarea className="form-input" rows={4} value={form.feedback} onChange={e => setForm(c => ({ ...c, feedback: e.target.value }))} placeholder="Feedback from the client or notes on the outcome..." style={{ resize: 'vertical' }} />
          </Field>
        </div>
        {error && <ErrorMessage message={error} />}
        <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>Save outcome</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Mandate detail ─────────────────────────────────────────────────────────────

function MandateDetail({ initialTemplate, onBack }) {
  const [template, setTemplate] = useState(initialTemplate)
  const [tab, setTab] = useState('overview')
  const [requirements, setRequirements] = useState([])
  const [reqModal, setReqModal] = useState(null)
  const [members, setMembers] = useState([])
  const [clientTeam, setClientTeam] = useState([])
  const [assignments, setAssignments] = useState([])
  const [reports, setReports] = useState([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [candidateSection, setCandidateSection] = useState('team')
  const [query, setQuery] = useState('')
  const [memberLimit, setMemberLimit] = useState(30)
  const [message, setMessage] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [addProspectsOpen, setAddProspectsOpen] = useState(false)
  const [sendJdTarget, setSendJdTarget] = useState(null)
  const [scheduleTarget, setScheduleTarget] = useState(null)
  const [outcomeTarget, setOutcomeTarget] = useState(null)
  const [outcomeExisting, setOutcomeExisting] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const tags = parseTags(template.tags)

  const loadRequirements = useCallback(async () => {
    try {
      const r = await api.getMandateRequirements(template.id)
      setRequirements(r.data || [])
    } catch { setRequirements([]) }
  }, [template.id])

  const loadCandidates = useCallback(async () => {
    setLoadingCandidates(true)
    try {
      const [memberRes, assignmentRes] = await Promise.all([
        api.getTemplateMatches(template.id),
        api.getTemplateAssignments(template.id),
      ])
      setMembers(memberRes.data || [])
      setAssignments(assignmentRes.data || [])
    } catch { setMembers([]); setAssignments([]) }
    finally { setLoadingCandidates(false) }
  }, [template.id])

  const loadClientTeam = useCallback(async () => {
    setLoadingTeam(true)
    try {
      const r = await api.getClientTeam(template.id)
      setClientTeam(r.data || [])
    } catch { setClientTeam([]) }
    finally { setLoadingTeam(false) }
  }, [template.id])

  useEffect(() => { void loadRequirements() }, [loadRequirements])
  useEffect(() => { if (tab === 'candidates') void loadCandidates() }, [tab, loadCandidates])
  useEffect(() => { if (tab === 'team') void loadClientTeam() }, [tab, loadClientTeam])
  useEffect(() => {
    if (tab !== 'reports') return
    api.getTeamReports('client')
      .then(r => setReports((r.data?.reports || []).filter(rp => Number(rp.client_template_id) === Number(template.id))))
      .catch(() => setReports([]))
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

  async function removeFromTeam(member) {
    if (!window.confirm(`Remove ${member.first_name} ${member.last_name} from the client team?`)) return
    setRemovingId(member.id)
    try {
      await api.removeFromClientTeam(template.id, member.id)
      await loadClientTeam()
      setMessage(`${member.first_name} ${member.last_name} removed from client team.`)
    } catch (err) { setMessage(err.message || 'Could not remove from team.') }
    finally { setRemovingId(null) }
  }

  async function cancelAssignment(assignment) {
    const name = `${assignment.candidate_first || ''} ${assignment.candidate_last || ''}`.trim()
    if (!window.confirm(`Cancel the scheduled interview for ${name}?`)) return
    setCancellingId(assignment.id)
    try {
      await api.cancelTemplateAssignment(template.id, assignment.id)
      await loadCandidates()
      setMessage(`Scheduled interview for ${name} was cancelled.`)
    } catch (err) { setMessage(err.message || 'Could not cancel the interview.') }
    finally { setCancellingId(null) }
  }

  async function openOutcomeModal(member) {
    const r = await api.getClientInterviewRecord(template.id, member.id).catch(() => ({ data: null }))
    setOutcomeExisting(r.data)
    setOutcomeTarget(member)
  }

  return (
    <div className="workspace-page workspace-stack">
      <div className="detail-header">
        <div className="detail-header__identity">
          <button type="button" className="detail-header__back" onClick={onBack}><ArrowLeft size={15} />Mandates</button>
          <div className="detail-header__title">
            <h2>{template.client_name}</h2>
            <p>{template.requirements || 'Client hiring mandate'}</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit mandate</Button>
      </div>

      <div className="workspace-tabs" aria-label="Mandate sections" style={{ alignSelf: 'flex-start' }}>
        {[['overview', 'Overview'], ['jd', 'Job description'], ['candidates', 'Candidates'], ['team', 'Client team'], ['reports', 'Reports']].map(([id, label]) => (
          <button key={id} type="button" className={`workspace-tabs__button${tab === id ? ' is-active' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {message && <div style={{ padding: 11, borderRadius: 8, background: 'var(--success-50)', color: 'var(--success-700)', fontSize: 12 }} onClick={() => setMessage(null)}>{message}</div>}

      <div className="workspace-panel detail-panel">

        {/* ── Overview tab ── */}
        {tab === 'overview' && (
          <div className="workspace-stack">
            <div className="detail-facts">
              {[['Client', template.client_name], ['Role', template.requirements || 'Not set'], ['Total headcount', template.headcount || 1], ['Client email', template.client_email || 'Not provided'], ['Created', formatDate(template.created)], ['Skills', tags.length]].map(([label, value]) => (
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
                <Button size="sm" onClick={() => setReqModal('new')}><Plus size={13} />Add profile</Button>
              </div>
              {requirements.length === 0 ? (
                <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>No requirement profiles yet. Add profiles to distinguish between different experience levels or roles within this mandate.</span>
              ) : (
                <div className="assignment-list">
                  {requirements.map(r => (
                    <div className="assignment-row" key={r.id}>
                      <div className="assignment-row__content">
                        <strong>{r.profile_name}</strong>
                        <span>
                          {r.years_min != null ? `${r.years_min}–${r.years_max ?? '+'}  yrs exp` : 'Experience not specified'} &middot; {r.headcount || 1} position{(r.headcount || 1) !== 1 ? 's' : ''}
                          {r.notes ? ` · ${r.notes}` : ''}
                        </span>
                      </div>
                      <button type="button" className="danger-icon-button" style={{ background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: 'var(--fg-muted)', cursor: 'pointer' }}
                        onClick={() => setReqModal(r)}>
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
          template.jd_text
            ? <div className="workspace-stack" style={{ gap: 14 }}>
              <div className="workspace-section-heading">
                <div><h3 style={{ fontSize: 16 }}>Job description</h3><p>Used for matching, communication, and AI interview context.</p></div>
                <FileText size={20} color="var(--brand-500)" />
              </div>
              <div style={{ padding: 18, border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--slate-50)', fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{template.jd_text}</div>
            </div>
            : <EmptyState message="No JD text attached. Edit the mandate to paste text or upload a document." />
        )}

        {/* ── Candidates tab ── */}
        {tab === 'candidates' && (
          loadingCandidates ? <Spinner center /> : (
            <div className="workspace-stack">
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
                            <button type="button" className="danger-icon-button" disabled={cancellingId === assignment.id} onClick={() => cancelAssignment(assignment)}><Trash2 size={14} /></button>
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
                      <div className="workspace-card" key={member.id} style={{ cursor: 'default' }}>
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
                      </div>
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
                <Button onClick={() => setAddProspectsOpen(true)}>
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
                <Button onClick={() => setAddProspectsOpen(true)}><Plus size={14} />Add prospects</Button>
              </div>

              {clientTeam.length === 0 ? (
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
                            {member.requirement_name && <span className="tag" style={{ marginTop: 4, display: 'inline-block' }}>{member.requirement_name}</span>}
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
                            <Button size="sm" variant="secondary" onClick={() => setSendJdTarget(member)}><Mail size={12} />Send JD</Button>
                            <Button size="sm" variant="secondary" onClick={() => setScheduleTarget(member)}><Calendar size={12} />Schedule</Button>
                            <Button size="sm" variant="secondary" onClick={() => openOutcomeModal(member)}><AlertCircle size={12} />Outcome</Button>
                            <button type="button" className="danger-icon-button" disabled={removingId === member.id}
                              onClick={() => removeFromTeam(member)} style={{ padding: '5px 8px' }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        {interview?.scheduled_at && (
                          <div style={{ paddingLeft: 46, marginTop: 6, fontSize: 11, color: 'var(--fg-muted)' }}>
                            <Clock size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            {formatDate(interview.scheduled_at)}{interview.location ? ` · ${interview.location}` : ''}
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
          reports.length === 0
            ? <EmptyState message="Reports for this mandate will appear after interviews are completed." />
            : (
              <div className="assignment-list">
                {reports.map(report => (
                  <div className="assignment-row" key={report.id}>
                    <Avatar name={`${report.candidate_first || ''} ${report.candidate_last || ''}`.trim()} size={30} />
                    <div className="assignment-row__content">
                      <strong>{report.candidate_first} {report.candidate_last}</strong>
                      <span>Overall score: {report.overall_score ?? 'Not scored'}</span>
                    </div>
                    <span className={`status-pill${report.decision === 'pass' ? ' status-pill--success' : ' status-pill--warning'}`}>{report.decision || 'Review'}</span>
                  </div>
                ))}
              </div>
            )
        )}
      </div>

      <EditMandateModal open={editOpen} template={template} onClose={() => setEditOpen(false)} onSaved={updated => { setTemplate(updated); setEditOpen(false) }} />

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

      {sendJdTarget && (
        <SendJDModal
          open={!!sendJdTarget}
          onClose={() => setSendJdTarget(null)}
          member={sendJdTarget}
          template={template}
          onSent={() => { setSendJdTarget(null); loadClientTeam(); setMessage(`JD sent to ${sendJdTarget.first_name}.`) }}
        />
      )}

      {scheduleTarget && (
        <ScheduleClientTeamModal
          open={!!scheduleTarget}
          onClose={() => setScheduleTarget(null)}
          member={scheduleTarget}
          template={template}
          onScheduled={() => { setScheduleTarget(null); loadClientTeam(); setMessage('Interview scheduled successfully.') }}
        />
      )}

      {outcomeTarget && (
        <ClientInterviewOutcomeModal
          open={!!outcomeTarget}
          onClose={() => { setOutcomeTarget(null); setOutcomeExisting(null) }}
          member={outcomeTarget}
          template={template}
          existing={outcomeExisting}
          onSaved={() => { setOutcomeTarget(null); setOutcomeExisting(null); loadClientTeam(); setMessage('Outcome saved.') }}
        />
      )}
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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.getClientTemplates()
      setTemplates(response.data || [])
    } catch (err) { setError(err.message || 'Could not load client mandates.') }
    finally { setLoading(false) }
  }, [])

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
        <div className="workspace-search">
          <Search size={16} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search clients, roles, or skills..." />
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
                    <span className="status-pill status-pill--brand">{template.headcount || 1} needed</span>
                  </div>
                  <div style={{ marginTop: 18 }}>
                    <div className="workspace-card__eyebrow">{template.client_name}</div>
                    <h3 className="workspace-card__title">{template.requirements || 'Role not specified'}</h3>
                    <p className="workspace-card__subtitle">{template.custom_info || 'Open this mandate to review the JD and manage candidates.'}</p>
                  </div>
                  <div className="workspace-card__meta">
                    <span><Mail size={13} /> {template.client_email || 'No client email'}</span>
                    <span><Users size={13} /> {template.headcount || 1} positions</span>
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
