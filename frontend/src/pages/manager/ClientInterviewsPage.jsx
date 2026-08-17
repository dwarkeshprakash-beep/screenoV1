import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, BriefcaseBusiness, Calendar, CheckCircle2,
  Clock, FileText, Mail, Plus, ChevronLeft, ChevronRight,
  Search, Sparkles, Trash2, Upload, UserCheck, Users, X, AlertCircle, Video,
  LayoutGrid, List,
} from 'lucide-react'
import Avatar from '../../components/shared/Avatar'
import Button from '../../components/shared/Button'
import EmptyState from '../../components/shared/EmptyState'
import ErrorMessage from '../../components/shared/ErrorMessage'
import Modal from '../../components/shared/Modal'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import DeleteMandateModal from '../../components/manager/DeleteMandateModal'
import ReportRecipientsSelector from '../../components/manager/ReportRecipientsSelector'
import InterviewFlowModal from '../../components/manager/InterviewFlowModal'
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

// â”€â”€ Mandate creation wizard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    setCompaniesLoading(true)
    api.getClientTemplates('all')
      .then(response => setExistingMandates(response.data || []))
      .catch(() => setExistingMandates([]))
      .finally(() => setCompaniesLoading(false))
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
function EditMandateModal({ open, template, onClose, onSaved }) {
  const [form, setForm] = useState({})
  const [tags, setTags] = useState([])
  const [saving, setSaving] = useState(false)
  const [extractingFile, setExtractingFile] = useState(false)
  const [extractingTags, setExtractingTags] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm({ client_name: template.client_name || '', client_email: template.client_email || '', requirements: template.requirements || '', custom_info: template.custom_info || '', jd_text: template.jd_text || '' })
    setTags(parseTags(template.tags))
    setError(null)
  }, [open, template])

  async function readJdFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setExtractingFile(true)
    setError(null)
    try {
      const response = await api.extractTextFromFile(file)
      setForm(current => ({ ...current, jd_text: response.data?.text || '' }))
    } catch (err) {
      setError(err.message || 'Could not read the JD document.')
    } finally {
      setExtractingFile(false)
    }
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
      const payload = { ...form, tags: JSON.stringify(tags) }
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
          <Field label="Internal notes" full><textarea className="form-input" rows={4} value={form.custom_info || ''} onChange={e => setForm(c => ({ ...c, custom_info: e.target.value }))} style={{ resize: 'vertical' }} /></Field>
          <Field label="Mandate job description" full help="This is the shared JD. Role profiles can keep their own JDs.">
            <div className="workspace-stack" style={{ gap: 8 }}>
              <input id="edit-mandate-jd-file" type="file" accept=".pdf,.doc,.docx,.txt" onChange={readJdFile} style={{ display: 'none' }} />
              <label htmlFor="edit-mandate-jd-file" className="product-button product-button--secondary product-button--sm" style={{ alignSelf: 'flex-start', cursor: extractingFile ? 'wait' : 'pointer' }}>
                <Upload size={13} />{extractingFile ? 'Reading…' : 'Upload JD file'}
              </label>
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

// â”€â”€ Requirement profile modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Add prospects modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
          <Field label="Assign to requirement profile" help="Required â€” tracks which profile each prospect is for.">
            <select className="form-input" value={requirementId} onChange={e => setRequirementId(e.target.value)}>
              <option value="">Select a profile...</option>
              {requirements.map(r => <option key={r.id} value={r.id}>{r.profile_name}{r.years_min != null ? ` (${r.years_min}â€“${r.years_max ?? '+'} yrs)` : ''}</option>)}
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
          <Field label="Assign to requirement profile" help="Required â€” tracks which profile each prospect is for.">
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

// â”€â”€ Send JD modal (with custom message + preview) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
            <p style={{ margin: '0 0 10px', fontWeight: 600, color: 'var(--fg-primary)' }}>Subject: [{template?.client_name}] Job opportunity â€” {roleName}</p>
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

// â”€â”€ Schedule interview modal (5 types) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const INTERVIEW_TYPES = [
  { value: 'ai_voice', label: 'AI Voice Interview', desc: 'Automated voice interview with AI-generated questions' },
  { value: 'exam', label: 'Coding Exam', desc: 'Coding or multiple-choice assessment' },
  { value: 'human', label: 'Human Video Interview', desc: 'Live video interview with a managed meeting link' },
  { value: 'offline', label: 'Offline Interview', desc: 'In-person interview â€” sends email with date and location' },
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
  const [interviewerUserId, setInterviewerUserId] = useState('')
  const [organizationUsers, setOrganizationUsers] = useState([])
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
    setInterviewerUserId('')
    setError(null)
    // Load which platforms are configured
    api.getVideoPlatforms()
      .then(r => setPlatformStatus(r.data || {}))
      .catch(() => { })
    api.getScheduleOrgUsers()
      .then(response => setOrganizationUsers((response.data || []).filter(user => Number(user.id) !== Number(member.user_id))))
      .catch(() => setOrganizationUsers([]))
  }, [open, member.user_id])

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
    if ((type === 'human' || type === 'offline') && !interviewerUserId) {
      setError('Select an interviewer.')
      return false
    }
    if ((type === 'ai_voice' || type === 'exam') && (Number(durationMinutes) < 2 || Number(durationMinutes) > 180)) {
      setError('Duration must be between 2 and 180 minutes.')
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
        interviewerUserId: interviewerUserId ? Number(interviewerUserId) : null,
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
                <input className="form-input" type="number" min="2" max="180" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} />
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
              <input className="form-input" type="number" min="2" max="180" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} />
            </Field>
          </div>
        )}

        <Field label="Date & time">
          <input className="form-input" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
        </Field>

        {/* Video platform selector â€” only for human interviews */}
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

        {(type === 'human' || type === 'offline') && (
          <Field label="Interviewer" help="Any other candidate in your organization can conduct this interview.">
            <select className="form-input" value={interviewerUserId} onChange={e => setInterviewerUserId(e.target.value)}>
              <option value="">Select interviewer...</option>
              {organizationUsers.map(user => <option key={user.id} value={user.id}>{user.first_name} {user.last_name} ({user.email})</option>)}
            </select>
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

// â”€â”€ Mandate detail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
            <div style={{ marginTop: 3, color: 'var(--fg-muted)', fontSize: 12 }}>{template?.client_name || 'Client'} Â· {roleName}</div>
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

function MandateDetail({ initialTemplate }) {
  const navigate = useNavigate()
  const { setPageMeta } = useOutletContext()
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
  const [flowRuns, setFlowRuns] = useState([])
  const [scheduleRows, setScheduleRows] = useState([])
  const [flowRunsError, setFlowRunsError] = useState(null)
  const [scheduleQuery, setScheduleQuery] = useState('')
  const [scheduleKind, setScheduleKind] = useState('all')
  const [scheduleStatus, setScheduleStatus] = useState('all')
  const [scheduleType, setScheduleType] = useState('all')
  const [retryDates, setRetryDates] = useState({})
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
  const [scheduleChoiceTarget, setScheduleChoiceTarget] = useState(null)
  const [flowTarget, setFlowTarget] = useState(null)
  const [flowEditTarget, setFlowEditTarget] = useState(null)
  const [roundsTarget, setRoundsTarget] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: () => { } })
  const tags = parseTags(template.tags)
  const isArchived = !!template.archived_at

  useEffect(() => {
    setPageMeta({
      title: `Client Mandate · ${template.client_name}`,
      subtitle: template.requirements || 'Manage candidates, interviews, and outcomes',
    })
    return () => setPageMeta(null)
  }, [setPageMeta, template.client_name, template.requirements])

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
  useEffect(() => {
    if (tab !== 'flows') return
    setFlowRunsError(null)
    Promise.all([
      api.getMandateInterviewFlowRuns(template.id),
      api.getMandateSchedules(template.id),
    ])
      .then(([runsResponse, schedulesResponse]) => {
        setFlowRuns(runsResponse.data || [])
        setScheduleRows(schedulesResponse.data || [])
      })
      .catch(err => setFlowRunsError(err.message || 'Failed to load schedules'))
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

  const groupedFlowRuns = [...flowRuns.reduce((map, row) => {
    if (!map.has(row.run_id)) map.set(row.run_id, { ...row, stages: [] })
    map.get(row.run_id).stages.push(row)
    return map
  }, new Map()).values()]

  const scheduleMatchesQuery = item => {
    const normalized = scheduleQuery.trim().toLowerCase()
    if (!normalized) return true
    return [item.candidate_first, item.candidate_last, item.candidate_email, item.flow_name, item.stage_name]
      .some(value => String(value || '').toLowerCase().includes(normalized))
  }
  const scheduleMatchesStatus = status => {
    if (scheduleStatus === 'all') return true
    if (scheduleStatus === 'upcoming') return !['completed', 'cancelled'].includes(status)
    return status === scheduleStatus
  }
  const visibleSingleSchedules = scheduleRows.filter(row => (
    !row.flow_stage_run_id
    && scheduleKind !== 'flow'
    && scheduleMatchesQuery(row)
    && scheduleMatchesStatus(row.status)
    && (scheduleType === 'all' || row.type === scheduleType)
  ))
  const visibleFlowRuns = groupedFlowRuns.filter(run => (
    scheduleKind !== 'single'
    && scheduleMatchesQuery(run)
    && scheduleMatchesStatus(run.run_status)
    && (scheduleType === 'all' || run.stages.some(stage => stage.type === scheduleType))
  ))

  async function refreshFlowRuns() {
    const [runsResponse, schedulesResponse] = await Promise.all([
      api.getMandateInterviewFlowRuns(template.id),
      api.getMandateSchedules(template.id),
    ])
    setFlowRuns(runsResponse.data || [])
    setScheduleRows(schedulesResponse.data || [])
  }

  async function continuePausedRun(runId) {
    try {
      await api.continueInterviewFlowRun(runId)
      await refreshFlowRuns()
    } catch (err) { setFlowRunsError(err.message || 'Could not continue flow') }
  }

  async function processExpiredRun(runId) {
    try {
      setFlowRunsError(null)
      await api.processExpiredInterviewFlowRun(runId)
      await refreshFlowRuns()
      setMessage({ text: 'Expired stage processed and flow progression applied.', type: 'success' })
    } catch (err) {
      setFlowRunsError(err.message || 'Could not process the expired stage')
    }
  }

  async function retryPausedRun(runId) {
    const value = retryDates[runId]
    if (!value) { setFlowRunsError('Choose a new retry date and time.'); return }
    try {
      await api.retryInterviewFlowRun(runId, serializeDatetimeLocal(value))
      await refreshFlowRuns()
    } catch (err) { setFlowRunsError(err.message || 'Could not retry stage') }
  }

  function deleteCandidateFlow(run) {
    setConfirmDialog({
      open: true,
      title: 'Delete candidate interview flow',
      message: `Permanently delete ${run.candidate_first} ${run.candidate_last}'s flow, including its interviews, reports, feedback, and completed history?`,
      danger: true,
      confirmText: 'Delete flow',
      onConfirm: async () => {
        try {
          await api.deleteInterviewFlowRun(run.run_id)
          await refreshFlowRuns()
          setMessage({ text: 'Candidate interview flow deleted.', type: 'success' })
        } catch (err) {
          setFlowRunsError(err.message || 'Could not delete candidate interview flow')
        }
      },
    })
  }

  return (
    <div className="workspace-page workspace-stack">
      <div className="mandate-detail-toolbar">
        <Link className="detail-header__back" to="/manager/clients"><ArrowLeft size={15} />All mandates</Link>
        <div className="workspace-tabs" aria-label="Mandate sections">
          {[['overview', 'Overview'], ['jd', 'Job description'], ['candidates', 'Candidates'], ['team', 'Client team'], ['flows', 'Schedules'], ['reports', 'Reports']].map(([id, label]) => (
            <button key={id} type="button" className={`workspace-tabs__button${tab === id ? ' is-active' : ''}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <div className="mandate-detail-toolbar__actions">
          {isArchived && <span className="status-pill">Archived</span>}
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

        {/* â”€â”€ Overview tab â”€â”€ */}
        {tab === 'overview' && (
          <div className="workspace-stack">
            <div className="detail-facts">
              {[['Client', template.client_name], ['Role', template.requirements || 'Not set'], ['Hiring target', template.headcount ?? 1], ['Hired', template.hired_count ?? 0], ['Pipeline', template.pipeline_count ?? 0], ['Client email', template.client_email || 'Not provided'], ['Created', formatDate(template.created)], ['Skills', tags.length]].map(([label, value]) => (
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
                <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)} disabled={isArchived}><Sparkles size={13} />Edit JD and skills</Button>
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
                          {r.years_min != null ? `${r.years_min}â€“${r.years_max ?? '+'}  yrs exp` : 'Experience not specified'} &middot; {r.hired_count ?? 0} hired / {r.headcount ?? 1} target &middot; {r.pipeline_count ?? 0} pipeline
                          {r.notes ? ` Â· ${r.notes}` : ''}
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

        {/* â”€â”€ JD tab â”€â”€ */}
        {tab === 'jd' && (
          (template.jd_text || requirements.some(r => r.jd_text))
            ? <div className="workspace-stack" style={{ gap: 14 }}>
              <div className="workspace-section-heading">
                <div><h3 style={{ fontSize: 16 }}>Job description</h3><p>Used for matching, communication, and AI interview context.</p></div>
                <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)} disabled={isArchived}><FileText size={13} />Edit mandate JD</Button>
              </div>
              {template.jd_text && (
                <section>
                  <h4 style={{ fontSize: 13, margin: '0 0 8px', color: 'var(--fg-primary)' }}>Mandate JD</h4>
                  <div style={{ padding: 18, border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--slate-50)', fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{template.jd_text}</div>
                </section>
              )}
              {requirements.filter(r => r.jd_text).map(r => (
                <section key={r.id}>
                  <div className="workspace-section-heading" style={{ marginBottom: 8 }}>
                    <h4 style={{ fontSize: 13, margin: 0, color: 'var(--fg-primary)' }}>{r.profile_name || 'Role'} JD</h4>
                    <Button variant="secondary" size="sm" onClick={() => setReqModal(r)} disabled={isArchived}>Edit role JD</Button>
                  </div>
                  <div style={{ padding: 18, border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--slate-50)', fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{r.jd_text}</div>
                </section>
              ))}
            </div>
            : <div className="workspace-stack" style={{ alignItems: 'center' }}>
              <EmptyState message="No JD text attached. Add a mandate JD or edit a role profile." />
              <Button onClick={() => setEditOpen(true)} disabled={isArchived}><FileText size={14} />Add mandate JD</Button>
            </div>
        )}

        {/* â”€â”€ Candidates tab â”€â”€ */}
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
                            <span>{assignment.candidate_email} Â· {assignment.question_count} questions Â· {formatDate(assignment.created)}</span>
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

        {/* â”€â”€ Client Team tab â”€â”€ */}
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
                            <Button size="sm" variant="secondary" onClick={() => setScheduleChoiceTarget(member)} disabled={isArchived}><Calendar size={12} />Schedule</Button>
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
                        {interview?.interviewer_first && (
                          <div style={{ paddingLeft: 46, marginTop: 5, fontSize: 11, color: 'var(--fg-muted)' }}>
                            Interviewer: {interview.interviewer_first} {interview.interviewer_last}
                            {interview.assignment_status ? ` Â· ${interview.assignment_status}` : ''}
                          </div>
                        )}
                        {interview?.assignment_status === 'completed' && (
                          <div style={{ marginLeft: 46, marginTop: 8, padding: 10, borderRadius: 8, background: 'var(--bg-surface-alt)', fontSize: 12, color: 'var(--fg-body)' }}>
                            <strong>Interviewer feedback ({interview.interviewer_outcome})</strong>
                            {interview.interviewer_first && <span> Â· {interview.interviewer_first} {interview.interviewer_last}</span>}
                            {interview.feedback && <p style={{ margin: '5px 0 0' }}>{interview.feedback}</p>}
                            {interview.feedback_file_url && <a href={interview.feedback_file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 5 }}>{interview.original_filename || 'Feedback document'}</a>}
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

        {tab === 'flows' && (
          <div className="workspace-stack">
            <div className="workspace-section-heading"><div><h3>Schedules</h3><p>All one-time interviews and candidate flows for this mandate.</p></div></div>
            {flowRunsError && <ErrorMessage message={flowRunsError} />}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10 }}>
              <label style={{ position: 'relative', gridColumn: 'span 2' }}>
                <Search size={14} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--fg-subtle)' }} />
                <input className="form-input" style={{ paddingLeft: 34 }} value={scheduleQuery} onChange={event => setScheduleQuery(event.target.value)} placeholder="Search candidate name or email..." />
              </label>
              <select className="form-input" value={scheduleKind} onChange={event => setScheduleKind(event.target.value)} aria-label="Schedule kind">
                <option value="all">All schedules</option><option value="single">Single interviews</option><option value="flow">Interview flows</option>
              </select>
              <select className="form-input" value={scheduleStatus} onChange={event => setScheduleStatus(event.target.value)} aria-label="Schedule status">
                <option value="all">All statuses</option><option value="upcoming">Upcoming</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
              </select>
              <select className="form-input" value={scheduleType} onChange={event => setScheduleType(event.target.value)} aria-label="Interview type">
                <option value="all">All interview types</option><option value="ai_voice">AI Voice</option><option value="exam">AI Exam</option><option value="human">Human Video</option><option value="offline">Offline</option>
              </select>
            </div>

            {visibleSingleSchedules.length > 0 && (
              <section className="workspace-card">
                <div className="workspace-card__body">
                  <div className="workspace-section-heading"><div><h3>Single interviews</h3><p>{visibleSingleSchedules.length} matching schedule{visibleSingleSchedules.length === 1 ? '' : 's'}</p></div></div>
                  <div className="assignment-list">
                    {visibleSingleSchedules.map(interview => (
                      <div className="assignment-row" key={interview.interview_id}>
                        <span className="status-pill">{INTERVIEW_TYPES.find(item => item.value === interview.type)?.label || interview.type}</span>
                        <div className="assignment-row__content">
                          <strong>{interview.candidate_first} {interview.candidate_last}</strong>
                          <span>{interview.scheduled_at ? formatDateTime(interview.scheduled_at) : formatDate(interview.created)}{interview.location ? ` | ${interview.location}` : ''}</span>
                          {interview.interviewer_first && <span>Interviewer: {interview.interviewer_first} {interview.interviewer_last}</span>}
                        </div>
                        {interview.decision && <span className={`status-pill${interview.decision === 'pass' ? ' status-pill--success' : ' status-pill--danger'}`}>{interview.decision === 'pass' ? 'passed' : 'failed'}</span>}
                        <span className={`status-pill${interview.status === 'completed' ? ' status-pill--success' : interview.status === 'cancelled' ? ' status-pill--danger' : ' status-pill--brand'}`}>{interview.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {visibleSingleSchedules.length === 0 && visibleFlowRuns.length === 0 && !flowRunsError
              ? <EmptyState message="No schedules match these filters." />
              : visibleFlowRuns.map(run => (
                <section key={run.run_id} className="workspace-card">
                  <div className="workspace-card__body">
                    <div className="workspace-section-heading">
                      <div><h3>{run.candidate_first} {run.candidate_last}</h3><p>{run.flow_name}</p></div>
                      <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Button size="sm" variant="secondary" onClick={() => setFlowEditTarget({
                          runId: run.run_id,
                          member: { id: run.client_team_id, user_id: run.candidate_user_id, first_name: run.candidate_first, last_name: run.candidate_last },
                        })}>Edit</Button>
                        <button type="button" className="danger-icon-button" title="Delete candidate flow" onClick={() => deleteCandidateFlow(run)}><Trash2 size={14} /></button>
                        <span className={`status-pill${run.run_status === 'completed' ? ' status-pill--success' : run.run_status.includes('paused') ? ' status-pill--danger' : ' status-pill--brand'}`}>{run.run_status.replaceAll('_', ' ')}</span>
                      </div>
                    </div>
                    <div className="assignment-list" style={{ marginTop: 12 }}>
                      {run.stages.map(stage => (
                        <div className="assignment-row" key={`${stage.stage_run_id}-${stage.file_id || 0}`}>
                          <span className="status-pill">{stage.stage_order}</span>
                          <div className="assignment-row__content">
                            <strong>{stage.stage_name}</strong>
                            <span>{stage.type} Â· attempt {stage.attempt_number} Â· {stage.stage_status}</span>
                            {stage.feedback && <span>Feedback: {stage.feedback}</span>}
                          </div>
                          {stage.interviewer_first && <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{stage.interviewer_first} {stage.interviewer_last}</span>}
                          {stage.file_url && <a href={stage.file_url} target="_blank" rel="noreferrer" className="product-button product-button--secondary product-button--sm">{stage.original_filename}</a>}
                        </div>
                      ))}
                    </div>
                    {run.run_status === 'paused_failed' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        <input className="form-input" style={{ maxWidth: 230 }} type="datetime-local" value={retryDates[run.run_id] || ''} onChange={event => setRetryDates(current => ({ ...current, [run.run_id]: event.target.value }))} />
                        <Button size="sm" variant="secondary" onClick={() => retryPausedRun(run.run_id)}>Retry stage</Button>
                        <Button size="sm" onClick={() => continuePausedRun(run.run_id)}>Continue anyway</Button>
                      </div>
                    )}
                    {run.run_status === 'paused_schedule_required' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <input className="form-input" style={{ maxWidth: 230 }} type="datetime-local" value={retryDates[run.run_id] || ''} onChange={event => setRetryDates(current => ({ ...current, [run.run_id]: event.target.value }))} />
                        <Button size="sm" onClick={() => retryPausedRun(run.run_id)}>Schedule stage</Button>
                      </div>
                    )}
                    {run.run_status === 'active' && run.stages.some(stage => (
                      Number(stage.stage_order) === Number(run.current_stage_order)
                      && stage.stage_status === 'scheduled'
                      && stage.interview_status === 'scheduled'
                      && ['ai_voice', 'exam'].includes(stage.type)
                      && stage.interview_due_at
                      && new Date(stage.interview_due_at) <= new Date()
                    )) && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--status-danger)' }}>Current stage expired without attendance.</span>
                        <Button size="sm" onClick={() => processExpiredRun(run.run_id)}>Process no-show</Button>
                      </div>
                    )}
                    {run.run_status === 'active' && run.stages.some(stage => (
                      Number(stage.stage_order) === Number(run.current_stage_order)
                      && stage.stage_status === 'scheduled'
                      && stage.interview_status === 'scheduled'
                      && ['human', 'offline'].includes(stage.type)
                      && stage.interview_due_at
                      && new Date(stage.interview_due_at) <= new Date()
                    )) && (
                      <div style={{ marginTop: 12 }}>
                        <span style={{ fontSize: 12, color: 'var(--warning-700)' }}>Interview completed. Awaiting interviewer feedback before the next stage can begin.</span>
                      </div>
                    )}
                  </div>
                </section>
              ))}
          </div>
        )}

        {/* â”€â”€ Reports tab â”€â”€ */}
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

      <Modal open={!!scheduleChoiceTarget} onClose={() => setScheduleChoiceTarget(null)} title="Schedule candidate" size="sm">
        <div className="workspace-stack">
          <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: 13 }}>Choose a one-time interview or an ordered multi-stage flow.</p>
          <Button onClick={() => { setScheduleTarget(scheduleChoiceTarget); setScheduleChoiceTarget(null) }}><Calendar size={14} />Schedule a single interview</Button>
          <Button variant="secondary" onClick={() => { setFlowTarget(scheduleChoiceTarget); setScheduleChoiceTarget(null) }}><Sparkles size={14} />Create interview flow</Button>
        </div>
      </Modal>

      {flowTarget && (
        <InterviewFlowModal
          open={!!flowTarget}
          mandate={template}
          member={flowTarget}
          onClose={() => setFlowTarget(null)}
          onStarted={() => { setFlowTarget(null); loadClientTeam(); setMessage({ text: 'Interview flow started. Stage 1 is scheduled.', type: 'success' }) }}
        />
      )}

      {flowEditTarget && (
        <InterviewFlowModal
          open={!!flowEditTarget}
          mandate={template}
          member={flowEditTarget.member}
          initialRunId={flowEditTarget.runId}
          onClose={() => setFlowEditTarget(null)}
          onStarted={() => { setFlowEditTarget(null); refreshFlowRuns(); setMessage({ text: 'Interview flow started.', type: 'success' }) }}
          onSaved={() => { refreshFlowRuns(); setMessage({ text: 'Interview flow updated.', type: 'success' }) }}
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

// â”€â”€ List page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PAGE_SIZE = 10

function Pagination({ page, pages, total, onChange }) {
  if (pages <= 1) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
        Page {page} of {pages} · {total} records
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={13} />Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next<ChevronRight size={13} />
        </Button>
      </div>
    </div>
  )
}

function MandateListView({ templates }) {
  return (
    <div className="workspace-panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', fontSize: 11, background: 'var(--bg-surface-alt)' }}>
              <th style={{ padding: '11px 14px' }}>Client</th>
              <th style={{ padding: '11px 14px' }}>Role / requirement</th>
              <th style={{ padding: '11px 14px' }}>Positions</th>
              <th style={{ padding: '11px 14px' }}>JD</th>
              <th style={{ padding: '11px 14px' }}>Last modified</th>
              <th style={{ padding: '11px 14px' }}>Status</th>
              <th style={{ padding: '11px 14px', width: 120 }}></th>
            </tr>
          </thead>
          <tbody>
            {templates.map(template => (
              <tr key={template.id} style={{ borderTop: '1px solid var(--border-default)', color: 'var(--fg-primary)', fontSize: 12 }}>
                <td style={{ padding: '12px 14px' }}>
                  <strong style={{ display: 'block', fontSize: 13 }}>{template.client_name}</strong>
                  <span style={{ color: 'var(--fg-muted)', fontSize: 11 }}>{template.client_email || 'No client email'}</span>
                </td>
                <td style={{ padding: '12px 14px', maxWidth: 320 }}>{template.requirements || 'Role not specified'}</td>
                <td style={{ padding: '12px 14px' }}>{template.hired_count ?? 0} hired / {template.headcount ?? 1}</td>
                <td style={{ padding: '12px 14px' }}>{template.jd_text ? 'Ready' : 'Missing'}</td>
                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>{formatDate(template.updated_at || template.created)}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span className={'status-pill ' + (template.archived_at ? '' : 'status-pill--brand')}>{template.archived_at ? 'Archived' : 'Active'}</span>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <Link className="product-button product-button--secondary product-button--sm" to={`/manager/clients/${template.id}`}>Open <ArrowRight size={12} /></Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ClientInterviewsPage() {
  const { mandateId } = useParams()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [detailLoading, setDetailLoading] = useState(!!mandateId)
  const [detailError, setDetailError] = useState(null)
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [listState, setListState] = useState('active')
  const [view, setView] = useState('cards')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.getClientTemplates(listState)
      const sorted = (response.data || []).sort((a, b) =>
        new Date(b.updated_at || b.created || 0) - new Date(a.updated_at || a.created || 0))
      setTemplates(sorted)
    } catch (err) {
      setError(err.message || 'Could not load client mandates.')
    } finally {
      setLoading(false)
    }
  }, [listState])

  useEffect(() => { if (!mandateId) void load() }, [load, mandateId])
  useEffect(() => {
    setPage(1)
  }, [query, listState])

  useEffect(() => {
    if (!mandateId) {
      setSelectedTemplate(null)
      setDetailError(null)
      setDetailLoading(false)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    setDetailError(null)
    api.getClientTemplate(mandateId)
      .then(response => { if (!cancelled) setSelectedTemplate(response.data) })
      .catch(err => { if (!cancelled) setDetailError(err.message || 'Could not load this mandate.') })
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [mandateId])

  const visibleTemplates = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return templates.filter(template => !normalized
      || String(template.client_name || '').toLowerCase().includes(normalized)
      || String(template.requirements || '').toLowerCase().includes(normalized)
      || String(template.client_email || '').toLowerCase().includes(normalized)
      || String(template.candidate_search_text || '').toLowerCase().includes(normalized)
      || parseTags(template.tags).join(' ').toLowerCase().includes(normalized))
  }, [query, templates])

  const mandatePages = Math.max(1, Math.ceil(visibleTemplates.length / PAGE_SIZE))
  const safePage = Math.min(page, mandatePages)
  const pageTemplates = visibleTemplates.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    if (page > mandatePages) setPage(mandatePages)
  }, [page, mandatePages])

  if (mandateId && detailLoading) return <Spinner center />
  if (mandateId && detailError) return <div className="workspace-page"><ErrorMessage message={detailError} /></div>
  if (mandateId && selectedTemplate) return <MandateDetail initialTemplate={selectedTemplate} />

  const hasActiveFilters = query.trim() !== '' || listState !== 'active'

  function clearFilters() {
    setQuery('')
    setListState('active')
    setPage(1)
  }

  return (
    <div className="workspace-page workspace-stack">
      <div className="workspace-toolbar">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 280, flexWrap: 'wrap' }}>
          <div className="workspace-search" style={{ flex: '1 1 420px' }}>
            <Search size={16} />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search clients, roles, skills, or assigned candidates..."
              aria-label="Search client mandates"
            />
          </div>

          <>
              <div style={{ display: 'inline-flex', gap: 4, padding: 4, border: '1px solid var(--border-default)', borderRadius: 999, background: 'var(--bg-surface)' }} aria-label="Mandate status filter">
                {MANDATE_FILTERS.map(filter => (
                  <button key={filter.value} type="button" onClick={() => setListState(filter.value)} aria-pressed={listState === filter.value}
                    style={{ border: 0, borderRadius: 999, padding: '7px 12px', background: listState === filter.value ? 'var(--brand-500)' : 'transparent', color: listState === filter.value ? 'white' : 'var(--fg-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {filter.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'inline-flex', padding: 3, border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--bg-surface)' }} aria-label="Mandate display">
                <button type="button" aria-label="Card view" aria-pressed={view === 'cards'} onClick={() => setView('cards')} style={{ display: 'inline-flex', padding: 7, border: 0, borderRadius: 6, background: view === 'cards' ? 'var(--brand-50)' : 'transparent', color: view === 'cards' ? 'var(--brand-600)' : 'var(--fg-muted)', cursor: 'pointer' }}><LayoutGrid size={15} /></button>
                <button type="button" aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')} style={{ display: 'inline-flex', padding: 7, border: 0, borderRadius: 6, background: view === 'list' ? 'var(--brand-50)' : 'transparent', color: view === 'list' ? 'var(--brand-600)' : 'var(--fg-muted)', cursor: 'pointer' }}><List size={15} /></button>
              </div>
              {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X size={13} />Clear filters</Button>}
          </>
        </div>
        <Button onClick={() => setWizardOpen(true)}><Plus size={15} />New mandate</Button>
      </div>

      <>
          {loading && <Spinner center />}
          {error && <ErrorMessage message={error} />}
          {!loading && !error && templates.length === 0 && <div className="workspace-panel"><EmptyState message="No client mandates yet. Create one to begin matching organization members." /></div>}
          {!loading && !error && templates.length > 0 && visibleTemplates.length === 0 && <div className="workspace-panel"><EmptyState message="No client mandates match this search." /></div>}
          {!loading && !error && pageTemplates.length > 0 && view === 'list' && (
            <MandateListView templates={pageTemplates} />
          )}
          {!loading && !error && pageTemplates.length > 0 && view === 'cards' && (
            <div className="workspace-grid workspace-grid--wide">
              {pageTemplates.map(template => {
                const tags = parseTags(template.tags)
                return (
                  <Link className="workspace-card" key={template.id} to={`/manager/clients/${template.id}`}>
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
                        <span style={{ color: 'var(--fg-subtle)', fontSize: 11 }}>Modified {formatDate(template.updated_at || template.created)}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
          {!loading && !error && visibleTemplates.length > 0 && (
            <Pagination page={safePage} pages={mandatePages} total={visibleTemplates.length} onChange={setPage} />
          )}
      </>

      <CreateMandateModal open={wizardOpen} onClose={() => setWizardOpen(false)} onCreated={load} />
    </div>
  )
}

export default ClientInterviewsPage

