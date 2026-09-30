import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import Button from '../../shared/Button'
import ErrorMessage from '../../shared/ErrorMessage'
import Modal from '../../shared/Modal'
import ReportRecipientsSelector from '../ReportRecipientsSelector'
import * as api from '../../../services/api'
import { serializeDatetimeLocal } from '../../../utils/helpers'
import Field from './Field'
import { INTERVIEW_TYPES } from './mandateHelpers'

function ScheduleClientTeamModal({ open, onClose, onScheduled, member, template }) {
  const [step, setStep] = useState('details')
  const [type, setType] = useState('ai_voice')
  const [manualMeetingUrl, setManualMeetingUrl] = useState('')
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
    setMode('simple')
    setDifficulty('medium')
    setQuestionCount(10)
    setDurationMinutes(25)
    setScheduledAt('')
    setLocation('')
    setNotes('')
    setManualMeetingUrl('')
    setReportUserIds([])
    setInterviewerUserId('')
    setError(null)
    async function loadOrganizationUsers() {
      try {
        const response = await api.getScheduleOrgUsers()
        setOrganizationUsers((response.data || []).filter(user => Number(user.id) !== Number(member.user_id)))
      } catch {
        setOrganizationUsers([])
      }
    }
    loadOrganizationUsers()
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
    if (type === 'human' && !/^https?:\/\//i.test(manualMeetingUrl.trim())) {
      setError('Paste a valid meeting link (starting with http:// or https://).')
      return false
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
        manualMeetingUrl: type === 'human' ? manualMeetingUrl.trim() : undefined,
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
  const humanScheduleBlocked = type === 'human' && (!scheduledAt || !manualMeetingUrl.trim())

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

        {type === 'human' && (
          <Field label="Meeting link" help="Paste the Google Meet, Zoom, Teams, or other link for this interview.">
            <input className="form-input" value={manualMeetingUrl} onChange={e => setManualMeetingUrl(e.target.value)} placeholder="https://..." />
          </Field>
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

export default ScheduleClientTeamModal
