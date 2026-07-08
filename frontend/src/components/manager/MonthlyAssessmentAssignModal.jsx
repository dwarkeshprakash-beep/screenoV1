import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import Avatar from '../shared/Avatar'
import * as api from '../../services/api'

function toDateTimeLocalValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function nextWeekDateTime() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  date.setHours(10, 0, 0, 0)
  return toDateTimeLocalValue(date)
}

function initialAssessmentDate(defaultDate) {
  if (!defaultDate) return nextWeekDateTime()
  return String(defaultDate).includes('T') ? defaultDate : `${defaultDate}T10:00`
}

function MonthlyAssessmentAssignModal({
  open,
  assessment,
  defaultDate,
  onClose,
  onDone,
}) {
  const [team, setTeam] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [assessmentDate, setAssessmentDate] = useState(initialAssessmentDate(defaultDate))
  const [questionCount, setQuestionCount] = useState(10)
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [query, setQuery] = useState('')
  const [conflicts, setConflicts] = useState(new Map())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setSelectedIds(new Set())
    setAssessmentDate(initialAssessmentDate(defaultDate))
    setQuestionCount(10)
    setDurationMinutes(60)
    setQuery('')
    setError(null)
    async function loadTeam() {
      setLoading(true)
      try {
        const response = await api.getTeam()
        setTeam(response.data || [])
      } catch {
        setTeam([])
        setError('Could not load team members.')
      } finally {
        setLoading(false)
      }
    }
    void loadTeam()
  }, [open, defaultDate])

  useEffect(() => {
    if (!open || !assessmentDate) return
    let active = true
    const month = assessmentDate.slice(0, 7)
    async function loadConflicts() {
      try {
        const response = await api.getMonthlyAssessmentPlan(month)
        if (!active) return
        const next = new Map()
        for (const subject of response.data?.subjects || []) {
          for (const candidate of subject.candidates || []) {
            next.set(Number(candidate.team_member_id), {
              subject: subject.subject_name,
              startDate: candidate.start_date,
              endDate: candidate.end_date,
              durationMonths: subject.duration_months,
            })
          }
        }
        setConflicts(next)
        setSelectedIds(current => new Set(
          [...current].filter(id => !next.has(Number(id)))
        ))
      } catch {
        if (active) setConflicts(new Map())
      }
    }
    void loadConflicts()
    return () => { active = false }
  }, [open, assessmentDate])

  const visibleTeam = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return team
    return team.filter(member => {
      const name = `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase()
      return name.includes(normalized)
        || String(member.email || '').toLowerCase().includes(normalized)
        || String(member.employee_id || '').toLowerCase().includes(normalized)
    })
  }, [query, team])

  function toggleMember(memberId) {
    if (conflicts.has(Number(memberId))) return
    setSelectedIds(current => {
      const next = new Set(current)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }

  async function handleAssign() {
    if (!assessmentDate) {
      setError('Assessment start date is required.')
      return
    }
    if (selectedIds.size === 0) {
      setError('Select at least one candidate.')
      return
    }
    if (!Number.isInteger(Number(questionCount)) || Number(questionCount) < 1 || Number(questionCount) > 50) {
      setError('Question count must be between 1 and 50.')
      return
    }
    if (!Number.isInteger(Number(durationMinutes)) || Number(durationMinutes) < 15 || Number(durationMinutes) > 180) {
      setError('Exam duration must be between 15 and 180 minutes.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.assignMonthlyAssessment(assessment.id, {
        assessment_date: assessmentDate,
        question_count: Number(questionCount),
        duration_minutes: Number(durationMinutes),
        team_member_ids: Array.from(selectedIds),
      })
      await onDone?.()
      onClose()
    } catch (assignError) {
      setError(assignError.message || 'Could not assign the assessment.')
    } finally {
      setSaving(false)
    }
  }

  if (!open || !assessment) return null

  return (
    <Modal open={open} onClose={saving ? () => {} : onClose} title={`Assign ${assessment.subject_name}`} size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--brand-50)', color: 'var(--brand-700)', fontSize: 12 }}>
          This reuses the existing subject, sub-topics, difficulty, and study material. Candidates receive a secure assessment link for the selected time.
        </div>
        <div>
          <label htmlFor="monthly-assessment-date" style={{ display: 'block', marginBottom: 5, fontSize: 12, fontWeight: 600, color: 'var(--fg-body)' }}>
            Assessment date and time
          </label>
          <input id="monthly-assessment-date" type="datetime-local" value={assessmentDate} onChange={event => setAssessmentDate(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', border: '1px solid var(--border-default)', borderRadius: 8, fontFamily: 'inherit' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label htmlFor="monthly-question-count" style={{ display: 'block', marginBottom: 5, fontSize: 12, fontWeight: 600, color: 'var(--fg-body)' }}>
              Questions
            </label>
            <input id="monthly-question-count" type="number" min="1" max="50" value={questionCount} onChange={event => setQuestionCount(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', border: '1px solid var(--border-default)', borderRadius: 8, fontFamily: 'inherit' }} />
          </div>
          <div>
            <label htmlFor="monthly-duration" style={{ display: 'block', marginBottom: 5, fontSize: 12, fontWeight: 600, color: 'var(--fg-body)' }}>
              Duration minutes
            </label>
            <input id="monthly-duration" type="number" min="15" max="180" value={durationMinutes} onChange={event => setDurationMinutes(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', border: '1px solid var(--border-default)', borderRadius: 8, fontFamily: 'inherit' }} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--border-default)', borderRadius: 8 }}>
          <Search size={14} color="var(--fg-subtle)" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search team members..." style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 13 }} />
        </div>
        <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: 9 }}>
          {loading ? (
            <div style={{ padding: 22, textAlign: 'center', fontSize: 12, color: 'var(--fg-muted)' }}>Loading team...</div>
          ) : visibleTeam.length === 0 ? (
            <div style={{ padding: 22, textAlign: 'center', fontSize: 12, color: 'var(--fg-muted)' }}>No team members found.</div>
          ) : visibleTeam.map(member => {
            const name = `${member.first_name || ''} ${member.last_name || ''}`.trim()
            const conflict = conflicts.get(Number(member.id))
            return (
              <label key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--border-default)', cursor: conflict ? 'not-allowed' : 'pointer', opacity: conflict ? 0.72 : 1 }}>
                <input type="checkbox" disabled={Boolean(conflict)} checked={selectedIds.has(member.id)} onChange={() => toggleMember(member.id)} style={{ accentColor: 'var(--brand-500)' }} />
                <Avatar name={name} size={28} />
                <span style={{ flex: 1 }}>
                  <strong style={{ display: 'block', fontSize: 13, color: 'var(--fg-primary)' }}>{name}</strong>
                  {conflict ? (
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--danger-600)', marginTop: 2 }}>
                      Already assigned: {conflict.subject} | {new Date(conflict.startDate).toLocaleDateString()} - {new Date(conflict.endDate).toLocaleDateString()} | {conflict.durationMonths} month{Number(conflict.durationMonths) === 1 ? '' : 's'}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{member.email}</span>
                  )}
                </span>
              </label>
            )
          })}
        </div>
        {error && <div style={{ padding: '9px 11px', borderRadius: 8, background: 'var(--danger-50)', color: 'var(--danger-700)', fontSize: 12 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button disabled={saving} onClick={handleAssign}>{saving ? 'Assigning...' : selectedIds.size > 0 ? `Assign ${selectedIds.size} candidate${selectedIds.size === 1 ? '' : 's'}` : 'Assign candidates'}</Button>
        </div>
      </div>
    </Modal>
  )
}

export default MonthlyAssessmentAssignModal
