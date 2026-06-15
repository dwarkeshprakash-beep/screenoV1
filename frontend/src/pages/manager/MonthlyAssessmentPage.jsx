import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import MonthlyAssessmentAssignModal from '../../components/manager/MonthlyAssessmentAssignModal'
import Avatar from '../../components/shared/Avatar'
import Button from '../../components/shared/Button'
import EmptyState from '../../components/shared/EmptyState'
import ErrorMessage from '../../components/shared/ErrorMessage'
import Modal from '../../components/shared/Modal'
import Spinner from '../../components/shared/Spinner'
import * as api from '../../services/api'

// ── helpers ───────────────────────────────────────────────────

function parseStoredArray(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(value, amount) {
  const [year, month] = value.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1 + amount, 1))
  return d.toISOString().slice(0, 7)
}

function monthLabel(value) {
  const [year, month] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// ── field styles for wizard ────────────────────────────────────

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--fg-body)',
  marginBottom: 5,
}

const fieldStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid var(--border-default)',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

// ── Create Subject wizard ─────────────────────────────────────

function WizardModal({ open, onClose, onDone }) {
  const [step, setStep] = useState(1)
  const [subject, setSubject] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [durationMonths, setDurationMonths] = useState(3)
  const [subTopics, setSubTopics] = useState('')
  const [jdText, setJdText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatingJd, setGeneratingJd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const steps = ['Subject details', 'Sub-topics', 'Study material']

  useEffect(() => {
    if (!open) return
    setStep(1)
    setSubject('')
    setDifficulty('medium')
    setDurationMonths(3)
    setSubTopics('')
    setJdText('')
    setError(null)
  }, [open])

  async function handleGenerateSubtopics() {
    if (!subject.trim()) return
    setGenerating(true)
    setError(null)
    try {
      const response = await api.generateSubtopics({ subject: subject.trim(), difficulty })
      setSubTopics(Array.isArray(response.data) ? response.data.join('\n') : response.data)
    } catch {
      setError('Could not generate sub-topics.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleGenerateJD() {
    setGeneratingJd(true)
    setError(null)
    try {
      const topics = subTopics.split('\n').map(t => t.trim()).filter(Boolean)
      const response = await api.generateAssessmentJD({ subject: subject.trim(), subTopics: topics, difficulty })
      setJdText(typeof response.data === 'string' ? response.data : JSON.stringify(response.data))
    } catch {
      setError('Could not generate study material.')
    } finally {
      setGeneratingJd(false)
    }
  }

  function goNext() {
    if (step === 1 && !subject.trim()) { setError('Subject is required.'); return }
    setError(null)
    setStep(c => c + 1)
  }

  async function handleCreate() {
    if (!subject.trim()) { setError('Subject is required.'); return }
    setSaving(true)
    setError(null)
    try {
      const topics = subTopics.split('\n').map(t => t.trim()).filter(Boolean)
      await api.createMonthlyAssessment({
        subject: subject.trim(),
        sub_topics: JSON.stringify(topics),
        difficulty,
        jd_text: jdText,
        duration_months: durationMonths,
      })
      await onDone?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not create the subject.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title={`Create subject — Step ${step}: ${steps[step - 1]}`} size="lg">
      <div style={{ padding: '10px 0' }}>
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="monthly-subject" style={labelStyle}>Subject name</label>
              <input id="monthly-subject" type="text" placeholder="e.g. Advanced React" value={subject} onChange={e => setSubject(e.target.value)} style={fieldStyle} />
              <div style={{ marginTop: 5, fontSize: 11, color: 'var(--fg-muted)' }}>Only the subject name is needed — AI can generate sub-topics.</div>
            </div>
            <div>
              <span style={labelStyle}>Difficulty</span>
              <div style={{ display: 'flex', gap: 10 }}>
                {['easy', 'medium', 'hard'].map(opt => (
                  <button key={opt} type="button" onClick={() => setDifficulty(opt)} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${difficulty === opt ? 'var(--brand-500)' : 'var(--border-default)'}`, background: difficulty === opt ? 'var(--brand-500)' : 'var(--bg-surface)', color: difficulty === opt ? 'var(--bg-surface)' : 'var(--fg-body)', fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>{opt}</button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="monthly-duration" style={labelStyle}>Duration</label>
              <select id="monthly-duration" value={durationMonths} onChange={e => setDurationMonths(Number(e.target.value))} style={fieldStyle}>
                {[1, 2, 3, 6, 12].map(m => <option key={m} value={m}>{m} month{m === 1 ? '' : 's'}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: 12, borderRadius: 8, background: 'var(--danger-50)', border: '1px solid var(--danger-200)' }}>
              <AlertCircle size={16} color="var(--danger-500)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: 'var(--danger-700)', lineHeight: 1.5 }}>Assignments use a one-time link. Tab switching is warned and repeated violations terminate the assessment.</div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '0 0 15px' }}>Add sub-topics manually or generate them from the subject name.</p>
            <Button variant="secondary" onClick={handleGenerateSubtopics} disabled={generating || !subject.trim()}>{generating ? 'Generating...' : 'Generate with AI'}</Button>
            <textarea aria-label="Sub-topics" placeholder="One sub-topic per line" value={subTopics} onChange={e => setSubTopics(e.target.value)} style={{ ...fieldStyle, height: 170, marginTop: 15, resize: 'vertical' }} />
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>Generate or edit the study material that candidates receive with this subject.</p>
            <Button variant="secondary" onClick={handleGenerateJD} disabled={generatingJd}>{generatingJd ? 'Generating...' : 'Generate study material'}</Button>
            <div style={{ border: '1px solid var(--border-default)', borderRadius: 8, padding: 15, background: 'var(--bg-surface-alt)' }}>
              <label htmlFor="monthly-study-material" style={labelStyle}>Study material</label>
              <textarea id="monthly-study-material" value={jdText} onChange={e => setJdText(e.target.value)} style={{ ...fieldStyle, height: 220, resize: 'vertical' }} />
            </div>
          </div>
        )}

        {error && <div style={{ color: 'var(--danger-700)', fontSize: 13, marginTop: 15 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-default)' }}>
          <Button variant="secondary" onClick={step > 1 ? () => setStep(c => c - 1) : onClose}>{step > 1 ? 'Back' : 'Cancel'}</Button>
          {step < steps.length
            ? <Button onClick={goNext}>Next step</Button>
            : <Button onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create subject'}</Button>}
        </div>
      </div>
    </Modal>
  )
}

// ── Subject detail modal ───────────────────────────────────────

function SubjectDetailModal({ assessment, open, onClose, onAssign }) {
  if (!assessment) return null
  const topics = parseStoredArray(assessment.sub_topics)
  const enrollments = assessment.enrollments || []
  return (
    <Modal open={open} onClose={onClose} title={assessment.subject_name} size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '6px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            ['Difficulty', assessment.difficulty],
            ['Duration', `${assessment.duration_months} month${Number(assessment.duration_months) === 1 ? '' : 's'}`],
            ['Total assignments', enrollments.length],
          ].map(([lbl, val]) => (
            <div key={lbl} style={{ padding: 12, borderRadius: 9, background: 'var(--bg-surface-alt)' }}>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{lbl}</div>
              <strong style={{ fontSize: 13, textTransform: lbl === 'Difficulty' ? 'capitalize' : 'none' }}>{val}</strong>
            </div>
          ))}
        </div>

        <div>
          <h3 style={{ fontSize: 13, margin: '0 0 8px' }}>Sub-topics</h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {topics.length > 0
              ? topics.map(t => <span key={t} style={{ padding: '4px 8px', borderRadius: 999, background: 'var(--brand-50)', color: 'var(--brand-700)', fontSize: 12 }}>{t}</span>)
              : <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>No sub-topics added.</span>}
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: 13, margin: '0 0 8px' }}>Study material</h3>
          <div style={{ maxHeight: 200, overflowY: 'auto', padding: 12, borderRadius: 9, border: '1px solid var(--border-default)', whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.6, color: 'var(--fg-body)' }}>
            {assessment.ai_generated_jd || 'No study material added.'}
          </div>
        </div>

        {enrollments.length > 0 && (
          <div>
            <h3 style={{ fontSize: 13, margin: '0 0 8px' }}>Assignment history</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {enrollments.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-surface-alt)', fontSize: 12 }}>
                  <strong>{e.first_name} {e.last_name}</strong>
                  <span style={{ color: 'var(--fg-muted)' }}>{e.start_date ? new Date(e.start_date).toLocaleDateString() : 'Date not set'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={() => onAssign(assessment)}><UserPlus size={14} /> Assign candidates</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main page ──────────────────────────────────────────────────

function MonthlyAssessmentPage() {
  const [tab, setTab] = useState('subjects')
  const [month, setMonth] = useState(currentMonth)
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear())

  const [assessments, setAssessments] = useState([])
  const [plan, setPlan] = useState(null)
  const [calendarData, setCalendarData] = useState([])

  const [loading, setLoading] = useState(true)
  const [planLoading, setPlanLoading] = useState(false)
  const [error, setError] = useState(null)
  const [planError, setPlanError] = useState(null)

  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedAssessment, setSelectedAssessment] = useState(null)
  const [assignAssessment, setAssignAssessment] = useState(null)
  const [cancellingEnrollmentId, setCancellingEnrollmentId] = useState(null)

  useEffect(() => { void loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [assessmentRes, calendarRes] = await Promise.all([
        api.getMonthlyAssessments(),
        api.getMonthlyAssessmentCalendar(),
      ])
      setAssessments(assessmentRes.data || [])
      setCalendarData(calendarRes.data || [])
    } catch {
      setError('Could not load assessments.')
    } finally {
      setLoading(false)
    }
  }

  const loadPlan = useCallback(async () => {
    setPlanLoading(true)
    setPlanError(null)
    try {
      const res = await api.getMonthlyAssessmentPlan(month)
      setPlan(res.data)
    } catch (err) {
      setPlanError(err.message || 'Could not load the monthly plan.')
    } finally {
      setPlanLoading(false)
    }
  }, [month])

  useEffect(() => { if (tab === 'subjects') void loadPlan() }, [tab, loadPlan])

  async function handleRefresh() {
    await Promise.all([loadAll(), loadPlan()])
  }

  function openAssign(assessment) {
    setSelectedAssessment(null)
    setAssignAssessment(assessment)
  }

  async function cancelEnrollment(enrollment) {
    const name = `${enrollment.first_name || ''} ${enrollment.last_name || ''}`.trim()
    if (!window.confirm(`Cancel ${name}'s ${enrollment.subject_name || 'monthly assessment'} plan?`)) {
      return
    }
    setCancellingEnrollmentId(enrollment.id)
    setPlanError(null)
    try {
      await api.cancelMonthlyEnrollment(enrollment.id)
      await handleRefresh()
    } catch (cancelError) {
      setPlanError(cancelError.message || 'Could not cancel the monthly assessment.')
    } finally {
      setCancellingEnrollmentId(null)
    }
  }

  // ── yearly calendar computation ──────────────────────────────

  const calendarRows = calendarData.map(row => {
    const progress = parseStoredArray(row.month_progress)
    const duration = Number(row.duration_months) || progress.length || 1
    const startDate = new Date(row.start_date || row.assessment_created || row.created)
    if (Number.isNaN(startDate.getTime())) return null
    const months = new Array(12).fill(null)
    for (let i = 0; i < duration; i++) {
      const md = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + i, 1))
      if (md.getUTCFullYear() === calendarYear) {
        months[md.getUTCMonth()] = row.status === 'cancelled'
          ? 'cancelled'
          : (progress[i] || row.interview_status || 'pending')
      }
    }
    return {
      id: row.id,
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      subject: row.subject_name,
      months,
    }
  }).filter(Boolean).filter(row => row.months.some(Boolean))

  const statusColors = {
    completed: 'var(--success-500)',
    scheduled: 'var(--brand-500)',
    cancelled: 'var(--danger-500)',
    pending:   'var(--brand-100)',
  }

  const tabBtn = active => ({
    background: 'transparent', border: 0, padding: '10px 14px', fontSize: 13,
    fontWeight: active ? 600 : 500,
    color: active ? 'var(--brand-700)' : 'var(--fg-muted)',
    borderBottom: active ? '2px solid var(--brand-500)' : '2px solid transparent',
    marginBottom: -1, cursor: 'pointer', fontFamily: 'inherit',
  })

  if (loading) return <Spinner center />
  if (error) return <ErrorMessage message={error} />

  const subjects = plan?.subjects || []

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* ── tab row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-default)', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[{ id: 'subjects', label: 'Subjects' }, { id: 'calendar', label: 'Yearly calendar' }].map(item => (
            <button key={item.id} type="button" onClick={() => setTab(item.id)} style={tabBtn(tab === item.id)}>{item.label}</button>
          ))}
        </div>
        {tab === 'subjects' && (
          <Button onClick={() => setWizardOpen(true)} style={{ marginBottom: 1 }}><Plus size={14} /> Create subject</Button>
        )}
      </div>

      {/* ── SUBJECTS TAB ── */}
      {tab === 'subjects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* month navigator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--fg-primary)' }}>{monthLabel(month)}</h2>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--fg-muted)' }}>Who is taking each subject and who has no assessment assigned this month.</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => setMonth(v => shiftMonth(v, -1))} aria-label="Previous month" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', borderRadius: 8, padding: 7, cursor: 'pointer', display: 'inline-flex' }}><ChevronLeft size={16} /></button>
              <Button variant="secondary" onClick={() => setMonth(currentMonth())}>This month</Button>
              <button type="button" onClick={() => setMonth(v => shiftMonth(v, 1))} aria-label="Next month" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', borderRadius: 8, padding: 7, cursor: 'pointer', display: 'inline-flex' }}><ChevronRight size={16} /></button>
            </div>
          </div>

          {planLoading ? <Spinner center /> : planError ? <ErrorMessage message={planError} /> : (
            <>
              {/* stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                {[
                  ['Team members', plan?.teamCount || 0],
                  ['Assigned this month', plan?.assignedCount || 0],
                  ['Not assigned', plan?.unassigned?.length || 0],
                ].map(([lbl, val]) => (
                  <div key={lbl} style={{ padding: 16, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10 }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--fg-primary)' }}>{val}</div>
                    <div style={{ marginTop: 3, fontSize: 12, color: 'var(--fg-muted)' }}>{lbl}</div>
                  </div>
                ))}
              </div>

              {/* subject cards */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--fg-primary)' }}>Subject assignments</h3>
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{subjects.filter(s => s.candidates.length > 0).length} active this month</span>
                </div>
                {subjects.length === 0 ? (
                  <EmptyState message="No subjects created yet. Create one to start assigning candidates." />
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(19rem, 1fr))', gap: 12 }}>
                    {subjects.map(subject => {
                      const fullTemplate = assessments.find(a => a.id === subject.id)
                      return (
                        <div key={subject.id} style={{ padding: 16, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 11 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                            <div
                              style={{ cursor: 'pointer', flex: 1 }}
                              onClick={() => fullTemplate && setSelectedAssessment(fullTemplate)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && fullTemplate) setSelectedAssessment(fullTemplate) }}
                            >
                              <h4 style={{ margin: 0, fontSize: 14, color: 'var(--brand-700)' }}>{subject.subject_name}</h4>
                              <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--fg-muted)', textTransform: 'capitalize' }}>{subject.difficulty} · {subject.duration_months} month{Number(subject.duration_months) === 1 ? '' : 's'}</p>
                            </div>
                            <Button variant="secondary" onClick={() => openAssign(subject)}>
                              <CalendarPlus size={12} /> Assign
                            </Button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 14 }}>
                            {subject.candidates.length === 0
                              ? <div style={{ padding: '10px 0', fontSize: 12, color: 'var(--fg-muted)' }}>No candidates assigned this month.</div>
                              : subject.candidates.map(c => {
                                const name = `${c.first_name || ''} ${c.last_name || ''}`.trim()
                                return (
                                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 8, background: 'var(--bg-surface-alt)' }}>
                                    <Avatar name={name} size={26} />
                                    <span style={{ flex: 1, minWidth: 0 }}>
                                      <strong style={{ display: 'block', fontSize: 12, color: 'var(--fg-primary)' }}>{name}</strong>
                                      <span style={{ display: 'block', fontSize: 10, color: 'var(--fg-muted)', marginTop: 2 }}>
                                        {new Date(c.start_date).toLocaleDateString()} - {new Date(c.end_date).toLocaleDateString()}
                                        {' | '}{subject.duration_months} month{Number(subject.duration_months) === 1 ? '' : 's'}
                                      </span>
                                    </span>
                                    <button
                                      type="button"
                                      disabled={cancellingEnrollmentId === c.id}
                                      onClick={() => cancelEnrollment({ ...c, subject_name: subject.subject_name })}
                                      title="Cancel this monthly assessment"
                                      style={{ border: 0, background: 'transparent', color: 'var(--danger-600)', cursor: cancellingEnrollmentId === c.id ? 'wait' : 'pointer', padding: 5, display: 'inline-flex' }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* unassigned members */}
              <section style={{ padding: 16, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 11 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Users size={16} color="var(--warning-600)" />
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--fg-primary)' }}>Team members without an assessment this month</h3>
                </div>
                {!plan?.unassigned?.length
                  ? <div style={{ fontSize: 12, color: 'var(--success-600)' }}>Every team member has at least one assessment this month.</div>
                  : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))', gap: 8 }}>
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
        </div>
      )}

      {/* ── YEARLY CALENDAR TAB ── */}
      {tab === 'calendar' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <strong style={{ fontSize: 15, color: 'var(--fg-primary)' }}>{calendarYear} assessment plan</strong>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => setCalendarYear(y => y - 1)} aria-label="Previous year" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', borderRadius: 7, padding: 6, cursor: 'pointer', display: 'inline-flex' }}><ChevronLeft size={15} /></button>
              <button type="button" onClick={() => setCalendarYear(new Date().getFullYear())} style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>Current year</button>
              <button type="button" onClick={() => setCalendarYear(y => y + 1)} aria-label="Next year" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', borderRadius: 7, padding: 6, cursor: 'pointer', display: 'inline-flex' }}><ChevronRight size={15} /></button>
            </div>
          </div>

          <div style={{ minWidth: 820 }}>
            <div style={{ display: 'flex', marginBottom: 12 }}>
              <div style={{ width: 150, fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>Candidate · Subject</div>
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => (
                <div key={m} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)' }}>{m}</div>
              ))}
            </div>

            {calendarRows.length === 0
              ? <EmptyState message="No assignments found for this year." />
              : calendarRows.map((row, i) => (
                <div key={`${row.id}-${i}`} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderTop: i === 0 ? 0 : '1px solid var(--border-default)' }}>
                  <div style={{ width: 150, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={row.name} size={24} />
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</strong>
                      <span style={{ display: 'block', fontSize: 10, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.subject}</span>
                    </span>
                  </div>
                  {row.months.map((status, mi) => (
                    <div key={mi} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                      {status
                        ? <div
                            title={`${status.charAt(0).toUpperCase() + status.slice(1)} — ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][mi]}`}
                            style={{ width: 16, height: 16, borderRadius: 4, background: statusColors[status] || statusColors.pending, border: '1px solid rgba(0,0,0,0.06)' }}
                          />
                        : <div style={{ width: 16, height: 16, borderRadius: 4, background: 'transparent', border: '1px dashed var(--border-default)' }} />}
                    </div>
                  ))}
                </div>
              ))}
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border-default)' }}>
            {Object.entries(statusColors).map(([lbl, color]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-muted)', textTransform: 'capitalize' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: color, border: '1px solid rgba(0,0,0,0.06)', display: 'inline-block' }} />
                {lbl}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── modals ── */}
      <WizardModal open={wizardOpen} onClose={() => setWizardOpen(false)} onDone={handleRefresh} />

      <MonthlyAssessmentAssignModal
        open={Boolean(assignAssessment)}
        assessment={assignAssessment}
        defaultDate={`${month}-01`}
        onClose={() => setAssignAssessment(null)}
        onDone={handleRefresh}
      />

      <SubjectDetailModal
        assessment={selectedAssessment}
        open={Boolean(selectedAssessment)}
        onClose={() => setSelectedAssessment(null)}
        onAssign={a => { setSelectedAssessment(null); setAssignAssessment(a) }}
      />
    </div>
  )
}

export default MonthlyAssessmentPage
