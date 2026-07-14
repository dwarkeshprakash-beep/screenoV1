import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Button from '../shared/Button'
import ErrorMessage from '../shared/ErrorMessage'
import Modal from '../shared/Modal'
import * as api from '../../services/api'
import { serializeDatetimeLocal } from '../../utils/helpers'

const TYPES = [
  ['ai_voice', 'AI Voice'], ['exam', 'AI Exam'],
  ['human', 'Human Video'], ['offline', 'Offline'],
]

function blankStage(order, previousStage = null) {
  const scheduledAt = previousStage
    ? nextStageStart(previousStage.scheduledAt, previousStage.durationMinutes)
    : ''
  return {
    key: `${Date.now()}-${order}`, name: `Stage ${order}`, type: 'ai_voice',
    scheduledAt, durationMinutes: 25, difficulty: 'medium', questionCount: 10,
    requirePass: true, minimumScore: '', interviewerUserId: '', location: '', meetingUrl: '', notes: '',
  }
}

function toDatetimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function nextStageStart(value, durationMinutes) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  date.setMinutes(date.getMinutes() + (Number(durationMinutes) || 15))
  return toDatetimeLocal(date)
}

function alignAfterPreviousStage(value, previousStage) {
  if (!value || !previousStage?.scheduledAt) return value
  const date = new Date(value)
  const minimum = new Date(nextStageStart(previousStage.scheduledAt, previousStage.durationMinutes))
  if (Number.isNaN(date.getTime()) || Number.isNaN(minimum.getTime())) return value
  return date < minimum ? toDatetimeLocal(minimum) : value
}

function normalizeStageDates(stages) {
  const normalized = stages.map(stage => ({ ...stage }))
  for (let index = 1; index < normalized.length; index++) {
    normalized[index].scheduledAt = alignAfterPreviousStage(
      normalized[index].scheduledAt, normalized[index - 1]
    )
  }
  return normalized
}

function editableStage(stage, index) {
  return {
    id: stage.id,
    key: `saved-${stage.id}`,
    name: stage.name || `Stage ${index + 1}`,
    type: stage.type,
    scheduledAt: toDatetimeLocal(stage.scheduled_at),
    durationMinutes: stage.duration_minutes || 25,
    interviewMode: stage.interview_mode || 'simple',
    difficulty: stage.difficulty || 'medium',
    questionCount: stage.question_count || 10,
    requirePass: !!stage.require_pass,
    minimumScore: stage.minimum_score ?? '',
    interviewerUserId: stage.interviewer_user_id || '',
    location: stage.location || '',
    meetingUrl: stage.meeting_url || '',
    notes: stage.notes || '',
  }
}

function InterviewFlowModal({ open, mandate, member, initialFlowId = '', onClose, onStarted, onSaved }) {
  const [name, setName] = useState('Candidate interview flow')
  const [stages, setStages] = useState([blankStage(1)])
  const [users, setUsers] = useState([])
  const [flows, setFlows] = useState([])
  const [existingFlowId, setExistingFlowId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    Promise.all([api.getScheduleOrgUsers(), api.getMandateInterviewFlows(mandate.id)])
      .then(([userRes, flowRes]) => {
        setUsers((userRes.data || []).filter(user => Number(user.id) !== Number(member.user_id)))
        const loadedFlows = flowRes.data || []
        setFlows(loadedFlows)
        const selected = loadedFlows.find(flow => Number(flow.id) === Number(initialFlowId))
        if (selected) populateFlow(selected)
      })
      .catch(() => setError('Could not load flow setup information.'))
  }, [open, mandate.id, member.user_id, initialFlowId])

  function populateFlow(flow) {
    setExistingFlowId(String(flow.id))
    setName(flow.name)
    setStages(flow.stages.map(editableStage))
    setError(null)
  }

  function chooseFlow(value) {
    if (!value) {
      setExistingFlowId('')
      setName('Candidate interview flow')
      setStages([blankStage(1)])
      return
    }
    const flow = flows.find(item => Number(item.id) === Number(value))
    if (flow) populateFlow(flow)
  }

  function updateStage(key, field, value) {
    setStages(current => {
      const next = current.map(stage => ({ ...stage }))
      const index = next.findIndex(stage => stage.key === key)
      if (index < 0) return current
      next[index][field] = value
      if (!['scheduledAt', 'durationMinutes'].includes(field) || !value) return next

      if (field === 'scheduledAt' && index > 0) {
        next[index].scheduledAt = alignAfterPreviousStage(next[index].scheduledAt, next[index - 1])
      }
      for (let laterIndex = index + 1; laterIndex < next.length; laterIndex++) {
        next[laterIndex].scheduledAt = alignAfterPreviousStage(
          next[laterIndex].scheduledAt, next[laterIndex - 1]
        )
      }
      return next
    })
  }

  function addStage() {
    setStages(current => [...current, blankStage(current.length + 1, current.at(-1))])
  }

  function removeStage(key) {
    setStages(current => current.filter(stage => stage.key !== key).map((stage, index) => ({ ...stage, name: stage.name === `Stage ${index + 2}` ? `Stage ${index + 1}` : stage.name })))
  }

  function payload() {
    const orderedStages = normalizeStageDates(stages)
    if (orderedStages.some((stage, index) => stage.scheduledAt !== stages[index].scheduledAt)) {
      setStages(orderedStages)
    }
    const serializedStages = orderedStages.map(stage => ({
      ...stage,
      scheduledAt: serializeDatetimeLocal(stage.scheduledAt),
      scheduleTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      durationMinutes: Number(stage.durationMinutes),
      questionCount: Number(stage.questionCount),
      minimumScore: stage.minimumScore === '' ? null : Number(stage.minimumScore),
      interviewerUserId: stage.interviewerUserId ? Number(stage.interviewerUserId) : null,
    }))
    return {
      mandateId: mandate.id,
      name,
      stages: serializedStages,
    }
  }

  async function createAndStart() {
    setSaving(true)
    setError(null)
    try {
      const response = await api.createInterviewFlow(payload())
      await api.startInterviewFlow(response.data.id, member.id)
      onStarted()
    } catch (err) {
      setError(err.message || 'Could not create and start the flow.')
    } finally {
      setSaving(false)
    }
  }

  async function saveExisting() {
    if (!existingFlowId) return
    setSaving(true)
    setError(null)
    try {
      const response = await api.updateInterviewFlow(existingFlowId, payload())
      const saved = response.data
      setFlows(current => current.map(flow => Number(flow.id) === Number(saved.id) ? saved : flow))
      populateFlow(saved)
      onSaved?.(saved)
    } catch (err) {
      setError(err.message || 'Could not save the interview flow.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteExisting() {
    if (!existingFlowId || !window.confirm('Delete this saved interview flow? Candidate flows using it must be deleted first.')) return
    setSaving(true)
    setError(null)
    try {
      await api.deleteInterviewFlow(existingFlowId)
      setFlows(current => current.filter(flow => Number(flow.id) !== Number(existingFlowId)))
      chooseFlow('')
      onSaved?.(null)
    } catch (err) {
      setError(err.message || 'Could not delete the interview flow.')
    } finally {
      setSaving(false)
    }
  }

  async function startExisting() {
    if (!existingFlowId) return
    setSaving(true)
    setError(null)
    try {
      await api.startInterviewFlow(existingFlowId, member.id)
      onStarted()
    } catch (err) {
      setError(err.message || 'Could not start the selected flow.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={existingFlowId ? 'Edit interview flow' : 'Create interview flow'} size="lg">
      <div className="workspace-stack">
        {flows.length > 0 && (
          <div className="form-field">
            <span className="form-label">Use an existing flow</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="form-input" value={existingFlowId} onChange={event => chooseFlow(event.target.value)}>
                <option value="">Choose a saved flow</option>
                {flows.map(flow => <option key={flow.id} value={flow.id}>{flow.name} ({flow.stages.length} stages)</option>)}
              </select>
              <Button variant="secondary" onClick={startExisting} disabled={!existingFlowId} loading={saving}>Start</Button>
              <button type="button" className="danger-icon-button" title="Delete saved flow" onClick={deleteExisting} disabled={!existingFlowId || saving}><Trash2 size={15} /></button>
            </div>
          </div>
        )}

        <div className="form-field">
          <span className="form-label">{existingFlowId ? 'Flow name' : 'New flow name'}</span>
          <input className="form-input" value={name} onChange={event => setName(event.target.value)} />
        </div>

        {stages.map((stage, index) => {
          const needsInterviewer = stage.type === 'human' || stage.type === 'offline'
          return (
            <section key={stage.key} style={{ border: '1px solid var(--border-default)', borderRadius: 10, padding: 14 }}>
              <div className="workspace-section-heading" style={{ marginBottom: 12 }}>
                <h3 style={{ fontSize: 14 }}>Stage {index + 1}</h3>
                {stages.length > 1 && <button type="button" className="danger-icon-button" onClick={() => removeStage(stage.key)}><Trash2 size={14} /></button>}
              </div>
              <div className="form-grid">
                <label className="form-field"><span className="form-label">Stage name</span><input className="form-input" value={stage.name} onChange={event => updateStage(stage.key, 'name', event.target.value)} /></label>
                <label className="form-field"><span className="form-label">Type</span><select className="form-input" value={stage.type} onChange={event => updateStage(stage.key, 'type', event.target.value)}>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="form-field"><span className="form-label">Date and time</span><input className="form-input" type="datetime-local" min={index > 0 ? nextStageStart(stages[index - 1].scheduledAt, stages[index - 1].durationMinutes) : undefined} value={stage.scheduledAt} onChange={event => updateStage(stage.key, 'scheduledAt', event.target.value)} />{index > 0 && <span className="form-help">Can start as soon as the previous stage ends, including on the same day.</span>}</label>
                <label className="form-field"><span className="form-label">Duration (minutes)</span><input className="form-input" type="number" min="15" max="180" value={stage.durationMinutes} onChange={event => updateStage(stage.key, 'durationMinutes', event.target.value)} /></label>
                {(stage.type === 'ai_voice' || stage.type === 'exam') && <label className="form-field"><span className="form-label">Questions</span><input className="form-input" type="number" min="1" max="50" value={stage.questionCount} onChange={event => updateStage(stage.key, 'questionCount', event.target.value)} /></label>}
                {needsInterviewer && <label className="form-field"><span className="form-label">Interviewer</span><select className="form-input" value={stage.interviewerUserId} onChange={event => updateStage(stage.key, 'interviewerUserId', event.target.value)}><option value="">Select interviewer</option>{users.map(user => <option key={user.id} value={user.id}>{user.first_name} {user.last_name} ({user.email})</option>)}</select></label>}
                {stage.type === 'offline' && <label className="form-field form-field--full"><span className="form-label">Location</span><input className="form-input" value={stage.location} onChange={event => updateStage(stage.key, 'location', event.target.value)} /></label>}
                {stage.type === 'human' && <label className="form-field form-field--full"><span className="form-label">Meeting link</span><input className="form-input" value={stage.meetingUrl} onChange={event => updateStage(stage.key, 'meetingUrl', event.target.value)} placeholder="Google Meet or other managed link" /></label>}
                <label className="form-field"><span className="form-label">Progression</span><span style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 38 }}><input type="checkbox" checked={stage.requirePass} onChange={event => updateStage(stage.key, 'requirePass', event.target.checked)} /> Require pass to continue</span></label>
                {stage.requirePass && (stage.type === 'ai_voice' || stage.type === 'exam') && <label className="form-field"><span className="form-label">Minimum score (optional, 0-10)</span><input className="form-input" type="number" min="0" max="10" step="0.1" value={stage.minimumScore} onChange={event => updateStage(stage.key, 'minimumScore', event.target.value)} /></label>}
              </div>
            </section>
          )
        })}

        <Button variant="secondary" onClick={addStage}><Plus size={14} />Add stage</Button>
        {error && <ErrorMessage message={error} />}
        <div className="form-actions">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={existingFlowId ? saveExisting : createAndStart} loading={saving}>
            {existingFlowId ? 'Save flow changes' : 'Create flow and schedule stage 1'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default InterviewFlowModal
