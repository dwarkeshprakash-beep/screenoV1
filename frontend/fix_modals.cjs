const fs = require('fs');

const FILE_PATH = 'src/pages/manager/ClientInterviewsPage.jsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

const startMarker = '// ── Mandate creation wizard ───────────────────────────────────────────────────';
const endMarker = '// ── Add prospects modal';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found');
  process.exit(1);
}

const NEW_MODALS = `// ── Mandate creation wizard ───────────────────────────────────────────────────

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
          } catch (e) {
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
            <button key={s} type="button" className={\`workspace-tabs__button\${step === s ? ' is-active' : ''}\`}
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
               const name = profile.profile_name || \`Role \${i + 1}\`
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
                      <input className="form-input" id={\`add-tag-\${profile.key}\`} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(profile.key, e.target.value); e.target.value = '' } }} placeholder="Add a skill tag" />
                      <Button variant="secondary" onClick={() => { const el = document.getElementById(\`add-tag-\${profile.key}\`); addTag(profile.key, el.value); el.value = '' }}>Add</Button>
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
              <input id={\`role-modal-jd-file\`} type="file" accept=".pdf,.doc,.docx,.txt" onChange={readJdFile} style={{ display: 'none' }} />
              <label htmlFor={\`role-modal-jd-file\`} className="product-button product-button--secondary product-button--md" style={{ alignSelf: 'flex-start', cursor: extractingFile ? 'wait' : 'pointer' }}>
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

`;

const newContent = content.substring(0, startIndex) + NEW_MODALS + content.substring(endIndex);
fs.writeFileSync(FILE_PATH, newContent);
console.log('Modals injected successfully.');
