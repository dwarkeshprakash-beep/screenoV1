import { useEffect, useMemo, useState } from 'react'
import { Plus, Sparkles, X } from 'lucide-react'
import Button from '../../shared/Button'
import ErrorMessage from '../../shared/ErrorMessage'
import Modal from '../../shared/Modal'
import * as api from '../../../services/api'
import { formatDate } from '../../../utils/helpers'
import Field from './Field'
import RequirementProfilesEditor from './RequirementProfilesEditor'
import { parseTags, newRequirementProfile, normalizeRequirementProfilesForSave } from './mandateHelpers'

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

function CreateMandateModal({ open, onClose, onCreated }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ clientName: '', clientEmail: '', requirements: '', customInfo: '' })
  const [profiles, setProfiles] = useState([newRequirementProfile()])
  const [tagsByRole, setTagsByRole] = useState({})
  const [extractingTags, setExtractingTags] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [existingMandates, setExistingMandates] = useState([])
  const [companiesLoading, setCompaniesLoading] = useState(false)
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false)
  const [highlightedCompanyIndex, setHighlightedCompanyIndex] = useState(-1)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [bdes, setBdes] = useState([])
  const [assignedBdeId, setAssignedBdeId] = useState('')

  useEffect(() => {
    if (!open) return
    setStep(1)
    setForm({ clientName: '', clientEmail: '', requirements: '', customInfo: '' })
    setProfiles([newRequirementProfile()])
    setTagsByRole({})
    setExtractingTags({})
    setError(null)
    setSelectedCompany(null)
    setEditingTemplate(null)
    setCompanyMenuOpen(false)
    setHighlightedCompanyIndex(-1)
    setAssignedBdeId('')
    // The two loaders run in parallel - neither awaits the other.
    async function loadExistingMandates() {
      setCompaniesLoading(true)
      try {
        const response = await api.getClientTemplates('all')
        setExistingMandates(response.data || [])
      } catch {
        setExistingMandates([])
      } finally {
        setCompaniesLoading(false)
      }
    }
    async function loadBdes() {
      try {
        const response = await api.getClientTemplateBdes()
        setBdes(response.data || [])
      } catch {
        setBdes([])
      }
    }
    loadExistingMandates()
    loadBdes()
  }, [open])

  const companies = useMemo(() => {
    const grouped = new Map()
    existingMandates.forEach(mandate => {
      const name = String(mandate.client_name || '').trim()
      if (!name) return
      const key = name.toLowerCase()
      if (!grouped.has(key)) grouped.set(key, { name, mandates: [] })
      grouped.get(key).mandates.push(mandate)
    })
    return [...grouped.values()]
      .map(company => ({
        ...company,
        mandates: company.mandates.sort((a, b) => new Date(b.updated_at || b.created || 0) - new Date(a.updated_at || a.created || 0)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [existingMandates])

  const companyMatches = useMemo(() => {
    const query = form.clientName.trim().toLowerCase()
    return companies
      .filter(company => !query || company.name.toLowerCase().includes(query))
      .slice(0, 8)
  }, [companies, form.clientName])

  useEffect(() => {
    setHighlightedCompanyIndex(companyMatches.length ? 0 : -1)
  }, [companyMatches])

  function update(key, value) { setForm(current => ({ ...current, [key]: value })) }

  function selectCompany(company) {
    const latest = company.mandates[0]
    setSelectedCompany(company)
    setEditingTemplate(null)
    setForm(current => ({
      ...current,
      clientName: company.name,
      clientEmail: latest?.client_email || current.clientEmail,
    }))
    setCompanyMenuOpen(false)
    setHighlightedCompanyIndex(-1)
    setError(null)
  }

  function startNewForCompany(company = selectedCompany) {
    const latest = company?.mandates?.[0]
    setEditingTemplate(null)
    setSelectedCompany(company || null)
    setStep(1)
    setForm({
      clientName: company?.name || form.clientName,
      clientEmail: latest?.client_email || '',
      requirements: '',
      customInfo: '',
    })
    setProfiles([newRequirementProfile()])
    setTagsByRole({})
    setError(null)
  }

  async function editExistingMandate(template) {
    if (template.archived_at) return
    setSaving(true)
    setError(null)
    try {
      const requirementResponse = await api.getMandateRequirements(template.id)
      const loadedProfiles = (requirementResponse.data || []).map(newRequirementProfile)
      const nextProfiles = loadedProfiles.length ? loadedProfiles : [newRequirementProfile({
        profile_name: template.requirements || '',
        jd_text: template.jd_text || '',
        headcount: template.headcount || 1,
      })]
      const nextTags = {}
      nextProfiles.forEach(profile => {
        const source = (requirementResponse.data || []).find(item => Number(item.id) === Number(profile.id))
        nextTags[profile.key] = parseTags(source?.tags || template.tags)
      })
      setEditingTemplate(template)
      setSelectedCompany(companies.find(company => company.name.toLowerCase() === String(template.client_name || '').toLowerCase()) || null)
      setForm({
        clientName: template.client_name || '',
        clientEmail: template.client_email || '',
        requirements: template.requirements || '',
        customInfo: template.custom_info || '',
      })
      setProfiles(nextProfiles)
      setTagsByRole(nextTags)
      setAssignedBdeId(template.assigned_bde_id ? String(template.assigned_bde_id) : '')
      setStep(1)
    } catch (err) {
      setError(err.message || 'Could not load the existing mandate.')
    } finally {
      setSaving(false)
    }
  }

  async function continueToTags() {
    if (!form.clientName.trim()) { setError('Client name is required.'); return }
    const profileError = validateRequirementProfilesForSave(profiles)
    if (profileError) { setError(profileError); return }

    setExtractingTags({ _all: true })
    setError(null)

    try {
      const newTagsByRole = { ...tagsByRole }
      await Promise.all(profiles.map(async profile => {
        const jd = String(profile.jd_text || '').trim()
        if (jd && !(newTagsByRole[profile.key] || []).length) {
          try {
            const response = await api.extractTemplateTags(jd)
            newTagsByRole[profile.key] = Array.isArray(response.data) ? response.data : []
          } catch {
            newTagsByRole[profile.key] = []
          }
        } else if (!newTagsByRole[profile.key]) {
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
    const profile = profiles.find(item => item.key === profileKey)
    if (!profile) return
    const jd = String(profile.jd_text || '').trim()
    if (!jd) { setError('Add a job description to this role before regenerating skills.'); return }
    setExtractingTags(current => ({ ...current, [profileKey]: true }))
    setError(null)
    try {
      const response = await api.extractTemplateTags(jd)
      setTagsByRole(current => ({ ...current, [profileKey]: Array.isArray(response.data) ? response.data : [] }))
    } catch (err) {
      setError(err.message || 'Could not regenerate matching skills.')
    } finally {
      setExtractingTags(current => ({ ...current, [profileKey]: false }))
    }
  }

  function addTag(profileKey, tagString) {
    const tag = tagString.trim()
    if (!tag) return
    setTagsByRole(current => {
      const existing = current[profileKey] || []
      return existing.some(item => item.toLowerCase() === tag.toLowerCase())
        ? current
        : { ...current, [profileKey]: [...existing, tag] }
    })
  }

  function removeTag(profileKey, tagString) {
    setTagsByRole(current => ({
      ...current,
      [profileKey]: (current[profileKey] || []).filter(tag => tag !== tagString),
    }))
  }

  async function saveMandate() {
    setSaving(true)
    setError(null)
    try {
      const normalizedProfiles = normalizeRequirementProfilesForSave(profiles)
        .map((profile, index) => ({
          ...profile,
          tags: JSON.stringify(tagsByRole[profiles[index].key] || []),
        }))
      const payload = {
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
        assigned_bde_id: assignedBdeId ? Number(assignedBdeId) : undefined,
      }
      if (editingTemplate) await api.updateClientTemplate(editingTemplate.id, payload)
      else await api.createClientTemplate(payload)
      await onCreated()
      onClose()
    } catch (err) {
      setError(err.message || (editingTemplate ? 'Could not update the mandate.' : 'Could not save the mandate.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editingTemplate ? 'Edit existing mandate' : 'Create client mandate'} size="lg">
      <div className="workspace-stack">
        <div className="workspace-tabs" aria-label="Mandate creation progress">
          {[['1. Mandate brief', 1], ['2. Matching skills', 2]].map(([label, currentStep]) => (
            <button key={currentStep} type="button" className={'workspace-tabs__button' + (step === currentStep ? ' is-active' : '')}
              onClick={() => currentStep === 1 ? setStep(1) : (form.clientName.trim() && setStep(2))}>
              {label}
            </button>
          ))}
        </div>

        {editingTemplate && (
          <div style={{ padding: 11, borderRadius: 9, background: 'var(--info-50)', color: 'var(--info-700)', fontSize: 12 }}>
            Editing the existing mandate for <strong>{editingTemplate.client_name}</strong>. Saving will update that mandate and move it to the top of the library.
          </div>
        )}

        {step === 1 ? (
          <div className="form-grid">
            <Field label="Client company" help="Search existing companies or create a new company entry.">
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  value={form.clientName}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={companyMenuOpen}
                  aria-controls="company-search-options"
                  aria-activedescendant={highlightedCompanyIndex >= 0 ? `company-option-${highlightedCompanyIndex}` : undefined}
                  onFocus={() => setCompanyMenuOpen(true)}
                  onChange={event => {
                    update('clientName', event.target.value)
                    setSelectedCompany(null)
                    setCompanyMenuOpen(true)
                  }}
                  onKeyDown={event => {
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                      event.preventDefault()
                      setCompanyMenuOpen(true)
                      if (!companyMatches.length) return
                      setHighlightedCompanyIndex(current => {
                        if (event.key === 'ArrowDown') return current < companyMatches.length - 1 ? current + 1 : 0
                        return current > 0 ? current - 1 : companyMatches.length - 1
                      })
                    } else if (event.key === 'Enter' && companyMenuOpen && highlightedCompanyIndex >= 0) {
                      event.preventDefault()
                      selectCompany(companyMatches[highlightedCompanyIndex])
                    } else if (event.key === 'Escape') {
                      setCompanyMenuOpen(false)
                      setHighlightedCompanyIndex(-1)
                    }
                  }}
                  placeholder="Start typing a company name"
                  autoComplete="off"
                />
                {companyMenuOpen && (
                  <div id="company-search-options" role="listbox" style={{ position: 'absolute', zIndex: 20, top: 'calc(100% + 5px)', left: 0, right: 0, maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--bg-surface)', boxShadow: 'var(--shadow-lg)' }}>
                    {companiesLoading && <div style={{ padding: 12, color: 'var(--fg-muted)', fontSize: 12 }}>Loading companies…</div>}
                    {!companiesLoading && companyMatches.map((company, index) => (
                      <button id={`company-option-${index}`} role="option" aria-selected={highlightedCompanyIndex === index} key={company.name.toLowerCase()} type="button" onMouseDown={event => event.preventDefault()} onMouseEnter={() => setHighlightedCompanyIndex(index)} onClick={() => selectCompany(company)}
                        style={{ width: '100%', padding: '10px 12px', border: 0, borderBottom: '1px solid var(--border-default)', background: highlightedCompanyIndex === index ? 'var(--brand-50)' : 'transparent', textAlign: 'left', cursor: 'pointer' }}>
                        <strong style={{ display: 'block', color: 'var(--fg-primary)', fontSize: 13 }}>{company.name}</strong>
                        <span style={{ color: 'var(--fg-muted)', fontSize: 11 }}>{company.mandates.length} existing mandate{company.mandates.length === 1 ? '' : 's'}</span>
                      </button>
                    ))}
                    {!companiesLoading && form.clientName.trim() && (
                      <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => { setSelectedCompany(null); setEditingTemplate(null); setCompanyMenuOpen(false) }}
                        style={{ width: '100%', padding: '11px 12px', border: 0, background: 'var(--brand-50)', color: 'var(--brand-700)', textAlign: 'left', fontWeight: 700, cursor: 'pointer' }}>
                        <Plus size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />Create new company “{form.clientName.trim()}”
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Field>
            <Field label="Client email" help="Optional contact for the company.">
              <input className="form-input" type="email" value={form.clientEmail} onChange={event => update('clientEmail', event.target.value)} placeholder="contact@client.com" />
            </Field>

            <Field label="Assign BDE (optional)" help="Lets a BDE view this mandate too. Leave unselected if not needed.">
              <select className="form-input" value={assignedBdeId} onChange={event => setAssignedBdeId(event.target.value)}>
                <option value="">No BDE assigned</option>
                {bdes.map(b => <option key={b.id} value={b.id}>{b.first_name} {b.last_name} ({b.email})</option>)}
              </select>
            </Field>

            {selectedCompany && !editingTemplate && (
              <div className="form-field form-field--full" style={{ padding: 12, border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--bg-surface-alt)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{selectedCompany.name} already exists</strong>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>Edit an existing mandate or create a separate role mandate for this company.</div>
                  </div>
                  <Button size="sm" onClick={() => startNewForCompany(selectedCompany)}><Plus size={12} />Create new mandate</Button>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {selectedCompany.mandates.map(mandate => (
                    <div key={mandate.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--fg-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mandate.requirements || 'Role not specified'}</div>
                        <div style={{ color: 'var(--fg-muted)', fontSize: 10, marginTop: 2 }}>{mandate.archived_at ? 'Archived' : 'Active'} · modified {formatDate(mandate.updated_at || mandate.created)}</div>
                      </div>
                      <Button variant="secondary" size="sm" disabled={!!mandate.archived_at} onClick={() => editExistingMandate(mandate)}>
                        {mandate.archived_at ? 'Archived' : 'Edit existing'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Field label="Mandate summary" full help="Optional high-level summary. Add exact roles, each with its own JD.">
              <textarea className="form-input" rows={3} value={form.requirements} onChange={event => update('requirements', event.target.value)} placeholder="Example: Engineering hiring for backend and frontend roles" style={{ resize: 'vertical' }} />
            </Field>
            <RequirementProfilesEditor profiles={profiles} setProfiles={setProfiles} allowEmpty={false} />
            <Field label="Internal notes" full help="Visible to managers, not candidates.">
              <textarea className="form-input" rows={3} value={form.customInfo} onChange={event => update('customInfo', event.target.value)} style={{ resize: 'vertical' }} />
            </Field>
          </div>
        ) : (
          <div className="workspace-stack" style={{ gap: 20 }}>
            {profiles.map((profile, index) => {
              const roleTags = tagsByRole[profile.key] || []
              const name = profile.profile_name || 'Role ' + (index + 1)
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
                    <input className="form-input" id={'add-tag-' + profile.key} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addTag(profile.key, event.target.value); event.target.value = '' } }} placeholder="Add a skill tag" />
                    <Button variant="secondary" onClick={() => { const element = document.getElementById('add-tag-' + profile.key); addTag(profile.key, element.value); element.value = '' }}>Add</Button>
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
            : <Button onClick={saveMandate} loading={saving}>{editingTemplate ? 'Update mandate' : 'Save mandate'}</Button>}
        </div>
      </div>
    </Modal>
  )
}

export default CreateMandateModal
