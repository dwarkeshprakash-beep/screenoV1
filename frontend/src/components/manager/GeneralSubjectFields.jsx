// GeneralSubjectFields - subject, focus areas and notes for a general assessment.
// A general assessment has no client mandate or monthly subject behind it, so these
// fields are what the AI builds its questions from (alongside the candidate's resume).
// Rendered by ScheduleModal's Configure step only when no mandate/monthly context is set.

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import Button from '../shared/Button'
import * as api from '../../services/api'

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', marginBottom: 8 }
const hintStyle = { margin: '6px 0 0', fontSize: 12, color: 'var(--fg-muted)' }

/**
 * @param {string} subjectName - what the assessment is about, e.g. "React"
 * @param {string} focusAreas - one focus area per line (textarea value)
 * @param {string} contextNotes - optional brief / JD for the question generator
 * @param {string} difficulty - passed to the AI suggestion so topics match the level
 * @param {(field: string, value: string) => void} onChange - updates one field
 */
function GeneralSubjectFields({ subjectName, focusAreas, contextNotes, difficulty, onChange }) {
  // Local state for the AI "Suggest" call only - field values are owned by the modal
  const [suggesting, setSuggesting] = useState(false)
  const [suggestError, setSuggestError] = useState(null)

  const canSuggest = subjectName.trim().length > 0 && !suggesting

  // Fill focus areas from the subject name; replaces what is there
  async function suggest() {
    setSuggesting(true)
    setSuggestError(null)
    try {
      const response = await api.suggestScheduleFocusAreas({ subject: subjectName.trim(), difficulty })
      const suggestions = response.data || []
      if (suggestions.length === 0) setSuggestError('No suggestions came back. Add focus areas manually.')
      else onChange('focusAreas', suggestions.join('\n'))
    } catch (err) {
      setSuggestError(err.message || 'Could not suggest focus areas.')
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 14, border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--bg-surface-alt)' }}>
      <div>
        <label htmlFor="schedule-subject" style={labelStyle}>Subject</label>
        <input
          id="schedule-subject"
          className="form-input"
          maxLength={200}
          placeholder="e.g. React, SQL, System design"
          value={subjectName}
          onChange={event => onChange('subjectName', event.target.value)}
          style={{ width: '100%' }}
        />
        <p style={hintStyle}>Questions are generated for this subject. It is also the assessment title in history and reports.</p>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <label htmlFor="schedule-focus-areas" style={{ ...labelStyle, marginBottom: 0 }}>Focus areas <span style={{ fontWeight: 500 }}>(optional)</span></label>
          <Button variant="secondary" size="sm" onClick={suggest} loading={suggesting} disabled={!canSuggest}>
            <Sparkles size={14} />
            Suggest with AI
          </Button>
        </div>
        <textarea
          id="schedule-focus-areas"
          className="form-input"
          rows={4}
          placeholder="One focus area per line, e.g. Hooks, Context API"
          value={focusAreas}
          onChange={event => onChange('focusAreas', event.target.value)}
          style={{ width: '100%', resize: 'vertical' }}
        />
        {suggestError && <p style={{ ...hintStyle, color: 'var(--danger-700)' }}>{suggestError}</p>}
      </div>

      <div>
        <label htmlFor="schedule-context-notes" style={labelStyle}>Notes for the AI <span style={{ fontWeight: 500 }}>(optional)</span></label>
        <textarea
          id="schedule-context-notes"
          className="form-input"
          rows={3}
          maxLength={4000}
          placeholder="A short brief or job description - what should this assessment check?"
          value={contextNotes}
          onChange={event => onChange('contextNotes', event.target.value)}
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>
    </div>
  )
}

export default GeneralSubjectFields
