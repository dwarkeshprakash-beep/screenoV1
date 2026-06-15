import { useCallback, useEffect, useState } from 'react'
import { CalendarPlus, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import Avatar from '../../components/shared/Avatar'
import Button from '../../components/shared/Button'
import EmptyState from '../../components/shared/EmptyState'
import ErrorMessage from '../../components/shared/ErrorMessage'
import Spinner from '../../components/shared/Spinner'
import MonthlyAssessmentAssignModal from '../../components/manager/MonthlyAssessmentAssignModal'
import * as api from '../../services/api'

function currentMonth() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(value, amount) {
  const [year, month] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + amount, 1))
  return date.toISOString().slice(0, 7)
}

function monthLabel(value) {
  const [year, month] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function MonthlyAssessmentPlanPage() {
  const [month, setMonth] = useState(currentMonth)
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [assignAssessment, setAssignAssessment] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.getMonthlyAssessmentPlan(month)
      setPlan(response.data)
    } catch (loadError) {
      setError(loadError.message || 'Could not load the monthly assessment plan.')
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { void load() }, [load])

  const subjects = plan?.subjects || []
  const activeSubjectCount = subjects.filter(subject => subject.candidates.length > 0).length
  const firstDay = `${month}-01`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: 'var(--fg-primary)' }}>{monthLabel(month)}</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--fg-muted)' }}>See who is taking each subject and who has no monthly assessment assigned.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={() => setMonth(value => shiftMonth(value, -1))} aria-label="Previous month" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', borderRadius: 8, padding: 7, cursor: 'pointer', display: 'inline-flex' }}><ChevronLeft size={16} /></button>
          <Button variant="secondary" onClick={() => setMonth(currentMonth())}>Current month</Button>
          <button type="button" onClick={() => setMonth(value => shiftMonth(value, 1))} aria-label="Next month" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', borderRadius: 8, padding: 7, cursor: 'pointer', display: 'inline-flex' }}><ChevronRight size={16} /></button>
        </div>
      </div>

      {loading ? <Spinner center /> : error ? <ErrorMessage message={error} /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
            {[
              ['Team members', plan?.teamCount || 0],
              ['Assigned this month', plan?.assignedCount || 0],
              ['Not assigned', plan?.unassigned?.length || 0],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: 16, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--fg-primary)' }}>{value}</div>
                <div style={{ marginTop: 3, fontSize: 12, color: 'var(--fg-muted)' }}>{label}</div>
              </div>
            ))}
          </div>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: 'var(--fg-primary)' }}>Subject assignments</h3>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{activeSubjectCount} active subject{activeSubjectCount === 1 ? '' : 's'}</span>
            </div>
            {subjects.length === 0 ? (
              <EmptyState message="Create a monthly assessment template before assigning candidates." />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(19rem, 1fr))', gap: 12 }}>
                {subjects.map(subject => (
                  <div key={subject.id} style={{ padding: 16, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 11 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 14, color: 'var(--fg-primary)' }}>{subject.subject_name}</h4>
                        <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--fg-muted)', textTransform: 'capitalize' }}>{subject.difficulty} | {subject.duration_months} month{Number(subject.duration_months) === 1 ? '' : 's'}</p>
                      </div>
                      <Button variant="secondary" onClick={() => setAssignAssessment(subject)}><CalendarPlus size={12} /> Assign more</Button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                      {subject.candidates.length === 0 && <div style={{ padding: '10px 0', fontSize: 12, color: 'var(--fg-muted)' }}>No candidates assigned this month.</div>}
                      {subject.candidates.map(candidate => {
                        const name = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim()
                        return (
                          <div key={candidate.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 9px', borderRadius: 8, background: 'var(--bg-surface-alt)' }}>
                            <Avatar name={name} size={26} />
                            <span>
                              <strong style={{ display: 'block', fontSize: 12, color: 'var(--fg-primary)' }}>{name}</strong>
                              <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{candidate.email}</span>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ padding: 16, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Users size={16} color="var(--warning-600)" />
              <h3 style={{ margin: 0, fontSize: 15, color: 'var(--fg-primary)' }}>Team members without an assessment</h3>
            </div>
            {plan?.unassigned?.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--success-600)' }}>Every team member has at least one assessment this month.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(15rem, 1fr))', gap: 8 }}>
                {plan.unassigned.map(member => {
                  const name = `${member.first_name || ''} ${member.last_name || ''}`.trim()
                  return (
                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 10, border: '1px solid var(--border-default)', borderRadius: 8 }}>
                      <Avatar name={name} size={28} />
                      <span>
                        <strong style={{ display: 'block', fontSize: 12, color: 'var(--fg-primary)' }}>{name}</strong>
                        <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{member.current_position || member.email}</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}

      <MonthlyAssessmentAssignModal
        open={Boolean(assignAssessment)}
        assessment={assignAssessment}
        defaultDate={firstDay}
        onClose={() => setAssignAssessment(null)}
        onDone={load}
      />
    </div>
  )
}

export default MonthlyAssessmentPlanPage
