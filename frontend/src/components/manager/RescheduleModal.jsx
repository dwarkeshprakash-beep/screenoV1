// components/manager/RescheduleModal.jsx
// Lets a manager move an interview to a new date/time. Reused from both the
// calendar event modal and the schedule list view in SchedulePage.

import { useEffect, useState } from 'react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import * as api from '../../services/api'
import { serializeDatetimeLocal } from '../../utils/helpers'

function toDateTimeLocalValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function RescheduleModal({ open, interview, onClose, onDone }) {
  const [scheduledAt, setScheduledAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !interview) return
    const current = interview.scheduledAt || interview.scheduled_at || interview.start
    const base = current ? new Date(current) : new Date()
    setScheduledAt(toDateTimeLocalValue(Number.isNaN(base.getTime()) ? new Date() : base))
    setError(null)
  }, [open, interview])

  async function submit() {
    if (!interview) return
    const parsed = serializeDatetimeLocal(scheduledAt)
    if (!parsed) {
      setError('Choose a valid date and time.')
      return
    }
    if (new Date(parsed) <= new Date()) {
      setError('Scheduled time must be in the future.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.rescheduleInterview(interview.id, {
        scheduledAt: parsed,
        scheduleTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      await onDone?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not reschedule interview.')
    } finally {
      setSaving(false)
    }
  }

  if (!open || !interview) return null

  const candidateName = interview.candidateName || interview.title || 'Candidate'

  return (
    <Modal open={open} onClose={saving ? undefined : onClose} title="Reschedule interview" size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
          Pick a new date and time for <strong style={{ color: 'var(--fg-primary)' }}>{candidateName}</strong>.
          A fresh magic link will be emailed to the candidate for the new time.
        </p>
        <div>
          <label htmlFor="reschedule-at" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', marginBottom: 8 }}>
            New date and time
          </label>
          <input
            id="reschedule-at"
            type="datetime-local"
            value={scheduledAt}
            onChange={event => setScheduledAt(event.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', border: '1px solid var(--border-default)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13 }}
          />
        </div>
        {error && (
          <div style={{ padding: '9px 11px', borderRadius: 8, background: 'var(--danger-50)', color: 'var(--danger-700)', fontSize: 12 }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button disabled={saving} loading={saving} onClick={submit}>Reschedule</Button>
        </div>
      </div>
    </Modal>
  )
}

export default RescheduleModal
