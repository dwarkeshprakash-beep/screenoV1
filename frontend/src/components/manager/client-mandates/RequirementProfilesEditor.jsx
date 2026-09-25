import { useState } from 'react'
import { FileText, Plus, Trash2, Upload, X } from 'lucide-react'
import Button from '../../shared/Button'
import * as api from '../../../services/api'
import Field from './Field'
import { newRequirementProfile, normalizeRequirementProfilesForSave } from './mandateHelpers'

function requirementProfilesHeadcount(profiles) {
  return normalizeRequirementProfilesForSave(profiles)
    .reduce((sum, profile) => sum + Number(profile.headcount || 0), 0)
}

function RequirementProfilesEditor({ profiles, setProfiles, allowEmpty = false }) {
  function updateProfileFields(key, patch) {
    setProfiles(current => current.map(profile => (
      profile.key === key ? { ...profile, ...patch } : profile
    )))
  }

  function updateProfile(key, field, value) {
    updateProfileFields(key, { [field]: value })
  }

  function removeProfile(key) {
    setProfiles(current => current.length > 1 || allowEmpty ? current.filter(profile => profile.key !== key) : current)
  }

  function clearRoleJdFile(profileKey) {
    updateProfileFields(profileKey, { jd_file_path: null, jd_original_filename: '' })
  }

  const totalHeadcount = requirementProfilesHeadcount(profiles)
  const [extractingFiles, setExtractingFiles] = useState({})
  const [fileErrors, setFileErrors] = useState({})

  async function readRoleJdFile(event, profileKey) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setExtractingFiles(c => ({ ...c, [profileKey]: true }))
    setFileErrors(c => ({ ...c, [profileKey]: null }))
    try {
      const response = await api.uploadJdFile(file)
      const { text, filePath, fileName } = response.data || {}
      const patch = { jd_file_path: filePath || null, jd_original_filename: fileName || file.name }
      if (String(text || '').trim()) patch.jd_text = text
      updateProfileFields(profileKey, patch)
    } catch (err) {
      setFileErrors(c => ({ ...c, [profileKey]: err.message || 'Could not upload JD file.' }))
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

              <Field label="Role JD" full help="Paste JD below or upload PDF/DOC/DOCX/TXT. The uploaded file is kept even if text extraction misses something.">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input id={`role-jd-file-${profile.key}`} type="file" accept=".pdf,.doc,.docx,.txt" onChange={e => readRoleJdFile(e, profile.key)} style={{ display: 'none' }} />
                  <label htmlFor={`role-jd-file-${profile.key}`} className="product-button product-button--secondary product-button--md" style={{ alignSelf: 'flex-start', cursor: extractingFiles[profile.key] ? 'wait' : 'pointer' }}>
                    <Upload size={14} />{extractingFiles[profile.key] ? 'Uploading...' : 'Upload JD file'}
                  </label>
                  {profile.jd_original_filename && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-muted)' }}>
                      <FileText size={13} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.jd_original_filename}</span>
                      <button type="button" onClick={() => clearRoleJdFile(profile.key)} title="Remove file" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--fg-muted)', display: 'inline-flex' }}>
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {fileErrors[profile.key] && <span style={{ color: 'var(--danger-500)', fontSize: 11 }}>{fileErrors[profile.key]}</span>}
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

export default RequirementProfilesEditor
