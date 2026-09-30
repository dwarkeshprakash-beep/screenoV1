// CompetencyEditor - per-skill competency level, shown next to each skill (users.skill_competencies).
// A skill with no entry shows "N/A". Works on the whole map: every change sends the full next
// map to onSave. Used on the user's own profile and on a manager's view of a team member.

import { useState } from 'react'
import { X } from 'lucide-react'

export const COMPETENCY_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert']

const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }
const nameStyle = { fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)' }
const levelBadgeStyle = { fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 999, border: 0, background: 'var(--brand-50)', color: 'var(--brand-700)' }
const naBadgeStyle = { ...levelBadgeStyle, background: 'var(--bg-surface-alt)', color: 'var(--fg-subtle)' }
const removeButtonStyle = { display: 'inline-flex', border: 0, background: 'transparent', padding: 0, cursor: 'pointer', color: 'inherit', opacity: 0.6 }
const selectStyle = { fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--fg-primary)' }

/**
 * @param {string[]} skills - the profile's current skill list
 * @param {Object<string,string>} competencies - skill -> level; a missing key means "N/A"
 * @param {(next: Object<string,string>) => Promise<void>} onSave - persists the full next map; throw to show an error
 * @param {boolean} [editable=true] - false renders read-only badges
 * @param {string} [emptyText] - shown when there are no skills to set a competency against
 */
function CompetencyEditor({ skills, competencies, onSave, editable = true, emptyText }) {
  const [editingSkill, setEditingSkill] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function save(next) {
    setSaving(true)
    setError(null)
    try {
      await onSave(next)
      return true
    } catch (err) {
      setError(err.message || 'Could not update competency.')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleSetLevel(skill, level) {
    const next = { ...competencies }
    if (level) next[skill] = level
    else delete next[skill]
    if (await save(next)) setEditingSkill(null)
  }

  function handleRemove(skill) {
    const next = { ...competencies }
    delete next[skill]
    void save(next)
  }

  if (skills.length === 0) {
    return emptyText ? <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{emptyText}</span> : null
  }

  return (
    <div>
      {skills.map((skill, i) => {
        const level = competencies[skill]
        return (
          <div key={skill} style={{ ...rowStyle, borderTop: i ? '1px solid var(--border-default)' : '0' }}>
            <span style={nameStyle}>{skill}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {editable && editingSkill === skill ? (
                <select
                  autoFocus
                  value={level || ''}
                  disabled={saving}
                  onChange={e => handleSetLevel(skill, e.target.value)}
                  onBlur={() => setEditingSkill(null)}
                  aria-label={`Competency for ${skill}`}
                  style={selectStyle}
                >
                  <option value="">N/A</option>
                  {COMPETENCY_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={() => editable && setEditingSkill(skill)}
                  disabled={!editable}
                  style={{ ...(level ? levelBadgeStyle : naBadgeStyle), cursor: editable ? 'pointer' : 'default' }}
                >
                  {level || 'N/A'}
                </button>
              )}
              {editable && level && editingSkill !== skill && (
                <button type="button" onClick={() => handleRemove(skill)} disabled={saving} aria-label={`Remove ${skill} competency`} style={removeButtonStyle}>
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )
      })}
      {error && <div style={{ fontSize: 12, color: 'var(--danger-600)', marginTop: 6 }}>{error}</div>}
    </div>
  )
}

export default CompetencyEditor
