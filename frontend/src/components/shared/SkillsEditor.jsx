// SkillsEditor - skill chips with remove (x) buttons and an "Add skill" control.
// Works on the whole list (users.tags): every change sends the full next list to onSave.
// Used on the user's own profile and on a manager's view of a team member.

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import Button from './Button'

const MAX_SKILL_LENGTH = 40

const baseChipStyle = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '3px 9px', borderRadius: 999, fontWeight: 600 }
const skillChipStyle = { ...baseChipStyle, background: 'var(--brand-50)', color: 'var(--brand-700)' }
const removeButtonStyle = { display: 'inline-flex', border: 0, background: 'transparent', padding: 0, cursor: 'pointer', color: 'inherit', opacity: 0.6 }
const addChipStyle = { ...baseChipStyle, background: 'transparent', color: 'var(--brand-600)', border: '1px dashed var(--brand-200)', cursor: 'pointer' }
const inputStyle = { width: 180, padding: '4px 10px', fontSize: 12, border: '1px solid var(--border-default)', borderRadius: 999, background: 'var(--bg-surface)', color: 'var(--fg-primary)' }

/**
 * @param {string[]} skills - current list
 * @param {(next: string[]) => Promise<void>} onSave - persists the full next list; throw to show an error
 * @param {boolean} [editable=true] - false renders read-only chips
 * @param {string} [emptyText] - shown when the list is empty
 */
function SkillsEditor({ skills, onSave, editable = true, emptyText }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const existingKeys = new Set(skills.map(s => s.toLowerCase()))

  async function save(next) {
    setSaving(true)
    setError(null)
    try {
      await onSave(next)
      return true
    } catch (err) {
      setError(err.message || 'Could not update skills.')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    const skill = draft.trim()
    if (!skill) return
    if (existingKeys.has(skill.toLowerCase())) {
      setError(`"${skill}" is already listed.`)
      return
    }
    if (await save([...skills, skill])) {
      setDraft('')
      setAdding(false)
    }
  }

  function handleRemove(skill) {
    void save(skills.filter(s => s !== skill))
  }

  function cancelAdd() {
    setAdding(false)
    setDraft('')
    setError(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {skills.length === 0 && !adding && emptyText && (
          <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{emptyText}</span>
        )}

        {skills.map(s => (
          <span key={s} style={skillChipStyle}>
            {s}
            {editable && (
              <button type="button" onClick={() => handleRemove(s)} disabled={saving} aria-label={`Remove ${s}`} style={removeButtonStyle}>
                <X size={12} />
              </button>
            )}
          </span>
        ))}

        {/* Add control - a dashed chip that expands into an inline input */}
        {editable && !adding && (
          <button type="button" onClick={() => setAdding(true)} disabled={saving} style={addChipStyle}>
            <Plus size={12} /> Add skill
          </button>
        )}
        {editable && adding && (
          <form onSubmit={handleAdd} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <input
              autoFocus
              value={draft}
              onChange={e => { setDraft(e.target.value); setError(null) }}
              onKeyDown={e => { if (e.key === 'Escape') cancelAdd() }}
              placeholder="e.g. GraphQL"
              maxLength={MAX_SKILL_LENGTH}
              disabled={saving}
              aria-label="New skill"
              style={inputStyle}
            />
            <Button type="submit" size="sm" loading={saving} disabled={!draft.trim()}>Add</Button>
            <Button variant="ghost" size="sm" onClick={cancelAdd} disabled={saving}>Cancel</Button>
          </form>
        )}
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--danger-600)', marginTop: 6 }}>{error}</div>}
    </div>
  )
}

export default SkillsEditor
