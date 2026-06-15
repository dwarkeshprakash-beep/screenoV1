import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import Avatar from '../shared/Avatar'
import * as api from '../../services/api'

function nextWeekDate() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
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
  const [assessmentDate, setAssessmentDate] = useState(defaultDate || nextWeekDate())
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setSelectedIds(new Set())
    setAssessmentDate(defaultDate || nextWeekDate())
    setQuery('')
    setError(null)
    setLoading(true)
    api.getTeam()
      .then(response => setTeam(response.data || []))
      .catch(() => {
        setTeam([])
        setError('Could not load team members.')
      })
      .finally(() => setLoading(false))
  }, [open, defaultDate])

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
    setSaving(true)
    setError(null)
    try {
      await api.assignMonthlyAssessment(assessment.id, {
        assessment_date: assessmentDate,
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
          This reuses the existing subject, sub-topics, difficulty, and study material. Candidates receive the assignment email for the selected date.
        </div>
        <div>
          <label htmlFor="monthly-assessment-date" style={{ display: 'block', marginBottom: 5, fontSize: 12, fontWeight: 600, color: 'var(--fg-body)' }}>
            Assessment start date
          </label>
          <input id="monthly-assessment-date" type="date" value={assessmentDate} onChange={event => setAssessmentDate(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', border: '1px solid var(--border-default)', borderRadius: 8, fontFamily: 'inherit' }} />
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
            return (
              <label key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--border-default)', cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedIds.has(member.id)} onChange={() => toggleMember(member.id)} style={{ accentColor: 'var(--brand-500)' }} />
                <Avatar name={name} size={28} />
                <span style={{ flex: 1 }}>
                  <strong style={{ display: 'block', fontSize: 13, color: 'var(--fg-primary)' }}>{name}</strong>
                  <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{member.email}</span>
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
