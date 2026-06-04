// components/manager/ScheduleModal.jsx
// 4-step modal to schedule an AI interview.

import { useState, useEffect } from 'react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import * as api from '../../services/api'

const STEP_LABELS = ['Type', 'Configure', 'Questions', 'Confirm']

function PillOption({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 18px',
        borderRadius: 99,
        border: `1px solid ${selected ? 'var(--brand-500)' : 'var(--border-default)'}`,
        background: selected ? 'var(--brand-50)' : 'transparent',
        color: selected ? 'var(--brand-600)' : 'var(--fg-body)',
        fontSize: 13,
        fontWeight: selected ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.12s',
      }}
    >
      {label}
    </button>
  )
}

function CardOption({ title, desc, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '14px 16px',
        borderRadius: 10,
        border: `2px solid ${selected ? 'var(--brand-500)' : 'var(--border-default)'}`,
        background: selected ? 'var(--brand-50)' : 'var(--bg-surface)',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'all 0.12s',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14, color: selected ? 'var(--brand-600)' : 'var(--fg-primary)' }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>{desc}</div>
    </button>
  )
}

const label = (text) => (
  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--fg-primary)', marginBottom: 6 }}>
    {text}
  </label>
)

/**
 * 4-step schedule modal.
 * @param {boolean} open
 * @param {Function} onClose
 * @param {Object|null} member - pre-selected member (or null for bulk or template use)
 * @param {Array} selectedIds - for bulk schedule
 * @param {Object|null} template - pre-fills form when opened from TemplatesPage
 * @param {Function} onDone
 */
function ScheduleModal({ open, onClose, member, selectedIds = [], template, onDone }) {
  const [step, setStep]     = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  // Member picker — used when opened from TemplatesPage with no pre-selected member
  const [teamList, setTeamList]     = useState([])
  const [pickedMember, setPickedMember] = useState(null)

  const [form, setForm] = useState({
    mode: 'internal_monthly',
    interviewMode: 'simple',
    transcriptionMode: 'api',
    maxAttempts: 3,
    cooldownHours: 24,
    windowDays: 7,
    reportTiming: 'all',
    jdText: '',
    focusAreas: '',
    difficulty: 'medium',
  })

  // Pre-fill form from template when modal opens
  useEffect(() => {
    if (!open) return
    if (template) {
      setForm(f => ({
        ...f,
        maxAttempts: template.attempts || 3,
        focusAreas: template.description || '',
      }))
    }
    // Load team for member picker if no member pre-selected
    if (!member && selectedIds.length === 0) {
      api.getTeam().then(r => setTeamList(r.data || [])).catch(() => {})
    }
  }, [open])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  // Resolved member: pre-selected prop or picked from dropdown
  const resolvedMember = member || pickedMember

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    const ids = resolvedMember ? [resolvedMember.id] : selectedIds
    if (!ids.length) {
      setError('Please select a team member.')
      setLoading(false)
      return
    }
    try {
      await Promise.all(ids.map(candidateId =>
        api.createSchedule({ ...form, candidateId, type: 'ai_voice' })
      ))
      onDone && onDone()
      handleClose()
    } catch (err) {
      setError(err.message || 'Could not schedule. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setStep(1)
    setError(null)
    setPickedMember(null)
    onClose()
  }

  const fieldStyle = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <Modal open={open} onClose={handleClose} title="Schedule Interview" size="md">
      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
        {STEP_LABELS.map((l, i) => (
          <div key={l} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              height: 3,
              background: i + 1 <= step ? 'var(--brand-500)' : 'var(--border-default)',
              borderRadius: 2,
              marginBottom: 4,
              transition: 'background 0.2s',
            }} />
            <span style={{ fontSize: 11, color: i + 1 <= step ? 'var(--brand-500)' : 'var(--fg-muted)' }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Type */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            {label('Interview mode')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <CardOption title="Client Mock Interview" desc="Simulate a client-facing scenario" selected={form.mode === 'client_mock'} onClick={() => set('mode', 'client_mock')} />
              <CardOption title="Internal Monthly Assessment" desc="Regular team skill check-in" selected={form.mode === 'internal_monthly'} onClick={() => set('mode', 'internal_monthly')} />
            </div>
          </div>
          <div>
            {label('AI question style')}
            <div style={{ display: 'flex', gap: 8 }}>
              <CardOption title="Simple" desc="10 pre-generated questions" selected={form.interviewMode === 'simple'} onClick={() => set('interviewMode', 'simple')} />
              <CardOption title="Adaptive" desc="AI asks follow-up questions dynamically" selected={form.interviewMode === 'adaptive'} onClick={() => set('interviewMode', 'adaptive')} />
            </div>
          </div>
          <div>
            {label('Transcription method')}
            <div style={{ display: 'flex', gap: 8 }}>
              <CardOption title="Local (Whisper.js)" desc="Runs on server, fully private" selected={form.transcriptionMode === 'local'} onClick={() => set('transcriptionMode', 'local')} />
              <CardOption title="API (Groq)" desc="Faster, requires internet" selected={form.transcriptionMode === 'api'} onClick={() => set('transcriptionMode', 'api')} />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            {label('Number of attempts')}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[3, 5, 'Unlimited'].map(v => (
                <PillOption key={v} label={String(v)} selected={form.maxAttempts === (v === 'Unlimited' ? -1 : v)} onClick={() => set('maxAttempts', v === 'Unlimited' ? -1 : v)} />
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              {label('Cooldown between attempts (hours)')}
              <input type="number" style={fieldStyle} value={form.cooldownHours} onChange={e => set('cooldownHours', parseInt(e.target.value, 10))} min={1} />
            </div>
            <div>
              {label('Window (days link is active)')}
              <input type="number" style={fieldStyle} value={form.windowDays} onChange={e => set('windowDays', parseInt(e.target.value, 10))} min={1} />
            </div>
          </div>
          <div>
            {label('Generate report')}
            <div style={{ display: 'flex', gap: 8 }}>
              <PillOption label="After each attempt" selected={form.reportTiming === 'each'} onClick={() => set('reportTiming', 'each')} />
              <PillOption label="After all attempts" selected={form.reportTiming === 'all'} onClick={() => set('reportTiming', 'all')} />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Questions */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            {label('Job description (paste or leave blank)')}
            <textarea rows={5} style={{ ...fieldStyle, resize: 'vertical' }} placeholder="Paste the JD here for more targeted questions…" value={form.jdText} onChange={e => set('jdText', e.target.value)} />
          </div>
          <div>
            {label('Focus areas for AI')}
            <textarea rows={3} style={{ ...fieldStyle, resize: 'vertical' }} placeholder="e.g. Focus on system design and .NET performance…" value={form.focusAreas} onChange={e => set('focusAreas', e.target.value)} />
          </div>
          <div>
            {label('Difficulty')}
            <div style={{ display: 'flex', gap: 8 }}>
              <PillOption label="Easy" selected={form.difficulty === 'easy'} onClick={() => set('difficulty', 'easy')} />
              <PillOption label="Medium" selected={form.difficulty === 'medium'} onClick={() => set('difficulty', 'medium')} />
              <PillOption label="Hard" selected={form.difficulty === 'hard'} onClick={() => set('difficulty', 'hard')} />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div>
          {/* Member picker — only shown when no member was pre-selected */}
          {!member && selectedIds.length === 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Send to *</label>
              <select
                style={{ ...fieldStyle, marginBottom: 0 }}
                value={pickedMember ? pickedMember.id : ''}
                onChange={e => {
                  const m = teamList.find(t => t.id === parseInt(e.target.value, 10))
                  setPickedMember(m || null)
                }}
              >
                <option value="">Select a team member…</option>
                {teamList.map(m => (
                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.email})</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ background: 'var(--bg-surface-alt)', borderRadius: 10, padding: 16, marginBottom: 16, fontSize: 13 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>Interview Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, color: 'var(--fg-body)' }}>
              <div><span style={{ color: 'var(--fg-muted)' }}>Mode:</span> {form.mode === 'client_mock' ? 'Client Mock' : 'Internal Monthly'}</div>
              <div><span style={{ color: 'var(--fg-muted)' }}>Style:</span> {form.interviewMode === 'simple' ? 'Simple' : 'Adaptive'}</div>
              <div><span style={{ color: 'var(--fg-muted)' }}>Transcription:</span> {form.transcriptionMode}</div>
              <div><span style={{ color: 'var(--fg-muted)' }}>Attempts:</span> {form.maxAttempts === -1 ? 'Unlimited' : form.maxAttempts}</div>
              <div><span style={{ color: 'var(--fg-muted)' }}>Window:</span> {form.windowDays} days</div>
              <div><span style={{ color: 'var(--fg-muted)' }}>Difficulty:</span> {form.difficulty}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16 }}>
            {resolvedMember
              ? `Sending to: ${resolvedMember.first_name} ${resolvedMember.last_name} (${resolvedMember.email})`
              : selectedIds.length > 0
                ? `Sending to ${selectedIds.length} selected member${selectedIds.length !== 1 ? 's' : ''}`
                : 'No member selected — please select one above.'}
          </div>
          {error && <p style={{ color: 'var(--danger-500)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Button variant="secondary" onClick={step > 1 ? () => setStep(s => s - 1) : handleClose}>
          {step > 1 ? 'Back' : 'Cancel'}
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(s => s + 1)}>Next →</Button>
        ) : (
          <Button loading={loading} onClick={handleSubmit}>Schedule and Send Invite →</Button>
        )}
      </div>
    </Modal>
  )
}

export default ScheduleModal
