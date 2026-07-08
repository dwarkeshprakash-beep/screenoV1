import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListChecks,
  Plus,
  Search,
  Sparkles,
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
import { parseStoredArray } from '../../utils/helpers'

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

function formatDate(value) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not set'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(value) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not set'
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function WizardModal({ open, onClose, onDone }) {
  const [step, setStep] = useState(1)
  const [subject, setSubject] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [durationMonths, setDurationMonths] = useState(3)
  const [subTopics, setSubTopics] = useState('')
  const [studyMaterial, setStudyMaterial] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatingMaterial, setGeneratingMaterial] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setStep(1)
    setSubject('')
    setDifficulty('medium')
    setDurationMonths(3)
    setSubTopics('')
    setStudyMaterial('')
    setError(null)
  }, [open])

  async function generateSubtopics() {
    if (!subject.trim()) return
    setGenerating(true)
    setError(null)
    try {
      const response = await api.generateSubtopics({
        subject: subject.trim(),
        difficulty,
      })
      setSubTopics(Array.isArray(response.data) ? response.data.join('\n') : response.data)
    } catch {
      setError('Could not generate sub-topics. You can enter them manually.')
    } finally {
      setGenerating(false)
    }
  }

  async function generateStudyMaterial() {
    const topics = subTopics.split('\n').map(item => item.trim()).filter(Boolean)
    if (topics.length === 0) {
      setError('Add or generate at least one sub-topic first.')
      return
    }
    setGeneratingMaterial(true)
    setError(null)
    try {
      const response = await api.generateAssessmentJD({
        subject: subject.trim(),
        subTopics: topics,
        difficulty,
      })
      setStudyMaterial(typeof response.data === 'string' ? response.data : JSON.stringify(response.data))
    } catch {
      setError('Could not generate study material. You can enter it manually.')
    } finally {
      setGeneratingMaterial(false)
    }
  }

  async function createSubject() {
    if (!subject.trim()) {
      setError('Subject name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const topics = subTopics.split('\n').map(item => item.trim()).filter(Boolean)
      await api.createMonthlyAssessment({
        subject: subject.trim(),
        sub_topics: JSON.stringify(topics),
        difficulty,
        jd_text: studyMaterial,
        duration_months: durationMonths,
      })
      await onDone?.()
      onClose()
    } catch (saveError) {
      setError(saveError.message || 'Could not create the subject.')
    } finally {
      setSaving(false)
    }
  }

  function nextStep() {
    if (step === 1 && !subject.trim()) {
      setError('Subject name is required.')
      return
    }
    setError(null)
    setStep(current => current + 1)
  }

  return (
    <Modal open={open} onClose={onClose} title="Create monthly subject" size="lg">
      <div className="workspace-stack">
        <div className="workspace-tabs" aria-label="Creation progress">
          {['Subject', 'Sub-topics', 'Study material'].map((label, index) => (
            <button
              key={label}
              type="button"
              className={`workspace-tabs__button${step === index + 1 ? ' is-active' : ''}`}
              onClick={() => {
                if (index === 0 || subject.trim()) setStep(index + 1)
              }}
            >
              <span>{index + 1}</span>
              {label}
            </button>
          ))}
        </div>

        {step === 1 && (
          <div className="form-grid">
            <div className="form-field form-field--full">
              <label htmlFor="monthly-subject" className="form-label">Subject name</label>
              <input
                id="monthly-subject"
                className="form-input"
                placeholder="Example: Advanced React"
                value={subject}
                onChange={event => setSubject(event.target.value)}
              />
              <span className="form-help">
                Only the subject name is required. AI can prepare the sub-topics from it.
              </span>
            </div>
            <div className="form-field">
              <label htmlFor="monthly-difficulty" className="form-label">Difficulty</label>
              <select
                id="monthly-difficulty"
                className="form-input"
                value={difficulty}
                onChange={event => setDifficulty(event.target.value)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="monthly-duration" className="form-label">Plan duration</label>
              <select
                id="monthly-duration"
                className="form-input"
                value={durationMonths}
                onChange={event => setDurationMonths(Number(event.target.value))}
              >
                {[1, 2, 3, 6, 12].map(months => (
                  <option key={months} value={months}>
                    {months} month{months === 1 ? '' : 's'}
                  </option>
                ))}
              </select>
            </div>
            <div
              className="form-field form-field--full"
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                padding: 12,
                borderRadius: 8,
                background: 'var(--warning-50)',
                color: 'var(--warning-700)',
              }}
            >
              <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
              <span className="form-help" style={{ color: 'inherit' }}>
                Candidates receive a secure one-time assessment link. Repeated tab switching can end the session.
              </span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="workspace-stack" style={{ gap: 14 }}>
            <div className="workspace-section-heading">
              <div>
                <h3 style={{ fontSize: 16 }}>Build the syllabus</h3>
                <p>Generate from the subject name or edit one sub-topic per line.</p>
              </div>
              <Button variant="secondary" onClick={generateSubtopics} loading={generating}>
                <Sparkles size={15} />
                Generate with AI
              </Button>
            </div>
            <textarea
              aria-label="Sub-topics"
              className="form-input"
              rows={10}
              placeholder="One sub-topic per line"
              value={subTopics}
              onChange={event => setSubTopics(event.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
        )}

        {step === 3 && (
          <div className="workspace-stack" style={{ gap: 14 }}>
            <div className="workspace-section-heading">
              <div>
                <h3 style={{ fontSize: 16 }}>Candidate study material</h3>
                <p>This content is included in the assignment communication.</p>
              </div>
              <Button variant="secondary" onClick={generateStudyMaterial} loading={generatingMaterial}>
                <Sparkles size={15} />
                Generate material
              </Button>
            </div>
            <textarea
              aria-label="Study material"
              className="form-input"
              rows={12}
              placeholder="Add preparation notes, focus areas, and learning resources..."
              value={studyMaterial}
              onChange={event => setStudyMaterial(event.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
        )}

        {error && (
          <div style={{ padding: 11, borderRadius: 8, background: 'var(--danger-50)', color: 'var(--danger-700)', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div className="form-actions">
          <Button variant="secondary" onClick={step > 1 ? () => setStep(current => current - 1) : onClose}>
            {step > 1 ? 'Back' : 'Cancel'}
          </Button>
          {step < 3 ? (
            <Button onClick={nextStep}>Continue</Button>
          ) : (
            <Button onClick={createSubject} loading={saving}>Create subject</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function SubjectDetailModal({ assessment, open, onClose, onAssign }) {
  if (!assessment) return null

  const topics = parseStoredArray(assessment.sub_topics)
  const enrollments = assessment.enrollments || []
  const activeEnrollments = enrollments.filter(item => item.status !== 'cancelled')

  return (
    <Modal open={open} onClose={onClose} title={assessment.subject_name} size="lg">
      <div className="workspace-stack">
        <div className="detail-facts">
          {[
            ['Difficulty', assessment.difficulty || 'Not set'],
            ['Duration', `${assessment.duration_months || 1} month${Number(assessment.duration_months) === 1 ? '' : 's'}`],
            ['Active assignments', activeEnrollments.length],
            ['Total assignment history', enrollments.length],
            ['Sub-topics', topics.length],
            ['Created', formatDate(assessment.created)],
          ].map(([label, value]) => (
            <div className="detail-fact" key={label}>
              <div className="detail-fact__label">{label}</div>
              <div className="detail-fact__value" style={{ textTransform: label === 'Difficulty' ? 'capitalize' : 'none' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        <section>
          <div className="workspace-section-heading" style={{ marginBottom: 10 }}>
            <div>
              <h3 style={{ fontSize: 15 }}>Sub-topics</h3>
              <p>The syllabus used to generate questions and preparation material.</p>
            </div>
          </div>
          {topics.length > 0 ? (
            <div className="tag-list">
              {topics.map(topic => <span className="tag" key={topic}>{topic}</span>)}
            </div>
          ) : (
            <div style={{ color: 'var(--fg-muted)', fontSize: 13 }}>No sub-topics added.</div>
          )}
        </section>

        <section>
          <div className="workspace-section-heading" style={{ marginBottom: 10 }}>
            <div>
              <h3 style={{ fontSize: 15 }}>Study material</h3>
              <p>The preparation guidance sent to assigned candidates.</p>
            </div>
          </div>
          <div style={{
            maxHeight: 260,
            overflowY: 'auto',
            padding: 16,
            border: '1px solid var(--border-default)',
            borderRadius: 10,
            background: 'var(--slate-50)',
            color: 'var(--fg-body)',
            fontSize: 13,
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
          }}>
            {assessment.ai_generated_jd || 'No study material added.'}
          </div>
        </section>

        {enrollments.length > 0 && (
          <section>
            <div className="workspace-section-heading" style={{ marginBottom: 10 }}>
              <div>
                <h3 style={{ fontSize: 15 }}>Assignment history</h3>
                <p>Every candidate previously assigned to this subject.</p>
              </div>
            </div>
            <div className="assignment-list">
              {enrollments.map(enrollment => {
                const name = `${enrollment.first_name || ''} ${enrollment.last_name || ''}`.trim()
                return (
                  <div className="assignment-row" key={enrollment.id}>
                    <Avatar name={name} size={30} />
                    <div className="assignment-row__content">
                      <strong>{name}</strong>
                      <span>{formatDateTime(enrollment.start_date)} - {formatDate(enrollment.end_date)}</span>
                    </div>
                    <span className={`status-pill${enrollment.status === 'cancelled' ? ' status-pill--danger' : ' status-pill--brand'}`}>
                      {enrollment.status || 'pending'}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
          <Button onClick={() => onAssign(assessment)}>
            <UserPlus size={15} />
            Assign candidates
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function MonthlyAssessmentPage() {
  const [tab, setTab] = useState('library')
  const [month, setMonth] = useState(currentMonth)
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear())
  const [query, setQuery] = useState('')
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

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [assessmentResponse, calendarResponse] = await Promise.all([
        api.getMonthlyAssessments(),
        api.getMonthlyAssessmentCalendar(),
      ])
      setAssessments(assessmentResponse.data || [])
      setCalendarData(calendarResponse.data || [])
    } catch {
      setError('Could not load monthly assessments.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadPlan = useCallback(async () => {
    setPlanLoading(true)
    setPlanError(null)
    try {
      const response = await api.getMonthlyAssessmentPlan(month)
      setPlan(response.data)
    } catch (loadError) {
      setPlanError(loadError.message || 'Could not load the monthly plan.')
    } finally {
      setPlanLoading(false)
    }
  }, [month])

  useEffect(() => { void loadAll() }, [loadAll])
  useEffect(() => { if (tab === 'plan') void loadPlan() }, [tab, loadPlan])

  async function refreshAll() {
    await Promise.all([loadAll(), loadPlan()])
  }

  async function cancelEnrollment(enrollment) {
    const name = `${enrollment.first_name || ''} ${enrollment.last_name || ''}`.trim()
    if (!window.confirm(`Cancel ${name}'s ${enrollment.subject_name || 'monthly assessment'} plan?`)) return

    setCancellingEnrollmentId(enrollment.id)
    setPlanError(null)
    try {
      await api.cancelMonthlyEnrollment(enrollment.id)
      await refreshAll()
    } catch (cancelError) {
      setPlanError(cancelError.message || 'Could not cancel the monthly assessment.')
    } finally {
      setCancellingEnrollmentId(null)
    }
  }

  const visibleAssessments = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return assessments
    return assessments.filter(assessment => {
      const topics = parseStoredArray(assessment.sub_topics).join(' ').toLowerCase()
      return String(assessment.subject_name || '').toLowerCase().includes(normalized)
        || String(assessment.difficulty || '').toLowerCase().includes(normalized)
        || topics.includes(normalized)
    })
  }, [assessments, query])

  const calendarRows = useMemo(() => {
    const byCandidate = new Map()

    for (const row of calendarData) {
      const progress = parseStoredArray(row.month_progress)
      const duration = Number(row.duration_months) || progress.length || 1
      const startDate = new Date(row.start_date || row.assessment_created || row.created)
      if (Number.isNaN(startDate.getTime())) continue

      const candidateKey = String(row.user_id || row.team_member_id || `${row.first_name || ''}-${row.last_name || ''}`)
      const name = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Candidate'
      const candidate = byCandidate.get(candidateKey) || {
        id: candidateKey,
        name,
        subjects: new Map(),
        months: Array.from({ length: 12 }, () => []),
      }

      if (row.subject_name) candidate.subjects.set(row.assessment_id || row.id, row.subject_name)

      for (let index = 0; index < duration; index += 1) {
        const monthDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + index, 1))
        if (monthDate.getUTCFullYear() !== calendarYear) continue

        const status = row.status === 'cancelled'
          ? 'cancelled'
          : (row.interview_status || row.status || progress[index] || 'pending')
        candidate.months[monthDate.getUTCMonth()].push({
          id: `${row.id}-${index}`,
          subject: row.subject_name || 'Assessment',
          status,
          startDate: row.start_date,
          endDate: row.end_date,
        })
      }

      byCandidate.set(candidateKey, candidate)
    }

    return [...byCandidate.values()]
      .map(row => ({
        ...row,
        subjects: [...row.subjects.values()],
      }))
      .filter(row => row.months.some(monthItems => monthItems.length > 0))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [calendarData, calendarYear])

  if (loading) return <Spinner center />
  if (error) return <ErrorMessage message={error} />

  const planSubjects = plan?.subjects || []
  const statusColors = {
    completed: 'var(--success-500)',
    scheduled: 'var(--brand-500)',
    cancelled: 'var(--danger-500)',
    pending: 'var(--brand-100)',
  }

  return (
    <div className="workspace-page workspace-stack">
      <div className="workspace-toolbar">
        <div className="workspace-tabs" aria-label="Monthly assessment sections">
          {[
            { id: 'library', label: 'Subject library', Icon: BookOpen },
            { id: 'plan', label: 'Monthly plan', Icon: ListChecks },
            { id: 'calendar', label: 'Yearly calendar', Icon: CalendarDays },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`workspace-tabs__button${tab === id ? ' is-active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        {tab === 'library' && (
          <Button onClick={() => setWizardOpen(true)}>
            <Plus size={15} />
            Create subject
          </Button>
        )}
      </div>

      {tab === 'library' && (
        <div className="workspace-stack">
          <div className="workspace-section-heading">
            <div className="workspace-intro">
              <h2>Reusable subject library</h2>
              <p>Create a subject once, review all its information, and assign it to different candidates each month.</p>
            </div>
            <div className="workspace-search">
              <Search size={16} />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search subjects or sub-topics..."
              />
            </div>
          </div>

          {assessments.length === 0 ? (
            <div className="workspace-panel">
              <EmptyState message="No subjects created yet. Create your first reusable monthly subject." />
            </div>
          ) : visibleAssessments.length === 0 ? (
            <div className="workspace-panel">
              <EmptyState message="No subjects match this search." />
            </div>
          ) : (
            <div className="workspace-grid workspace-grid--wide">
              {visibleAssessments.map(assessment => {
                const topics = parseStoredArray(assessment.sub_topics)
                const activeCount = (assessment.enrollments || []).filter(item => item.status !== 'cancelled').length
                return (
                  <button
                    type="button"
                    className="workspace-card"
                    key={assessment.id}
                    onClick={() => setSelectedAssessment(assessment)}
                  >
                    <div className="workspace-card__body">
                      <div className="workspace-card__topline">
                        <div className="workspace-card__icon"><BookOpen size={20} /></div>
                        <span className="status-pill status-pill--brand">{assessment.difficulty}</span>
                      </div>
                      <div style={{ marginTop: 18 }}>
                        <div className="workspace-card__eyebrow">Monthly subject</div>
                        <h3 className="workspace-card__title">{assessment.subject_name}</h3>
                        <p className="workspace-card__subtitle">
                          {topics.length > 0
                            ? `${topics.slice(0, 3).join(', ')}${topics.length > 3 ? ` and ${topics.length - 3} more` : ''}`
                            : 'No sub-topics added yet'}
                        </p>
                      </div>
                      <div className="workspace-card__meta">
                        <span><Clock3 size={13} /> {assessment.duration_months || 1} month plan</span>
                        <span><Users size={13} /> {activeCount} active</span>
                        <span><ListChecks size={13} /> {topics.length} sub-topics</span>
                      </div>
                      <div className="workspace-card__footer">
                        <span className="workspace-card__link">
                          View full subject <ArrowRight size={13} />
                        </span>
                        <span style={{ color: 'var(--fg-subtle)', fontSize: 11 }}>{formatDate(assessment.created)}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'plan' && (
        <div className="workspace-stack">
          <div className="month-navigator">
            <div className="workspace-intro">
              <h2>{monthLabel(month)}</h2>
              <p>See assigned candidates, open capacity, and cancellation controls for this month.</p>
            </div>
            <div className="month-navigator__actions">
              <button type="button" className="icon-button" onClick={() => setMonth(value => shiftMonth(value, -1))} aria-label="Previous month">
                <ChevronLeft size={16} />
              </button>
              <Button variant="secondary" size="sm" onClick={() => setMonth(currentMonth())}>This month</Button>
              <button type="button" className="icon-button" onClick={() => setMonth(value => shiftMonth(value, 1))} aria-label="Next month">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {planLoading ? <Spinner center /> : planError ? <ErrorMessage message={planError} /> : (
            <>
              <div className="stat-grid">
                {[
                  ['Organization members', plan?.teamCount || 0],
                  ['Assigned this month', plan?.assignedCount || 0],
                  ['Not assigned', plan?.unassigned?.length || 0],
                ].map(([label, value]) => (
                  <div className="stat-card" key={label}>
                    <div className="stat-card__value">{value}</div>
                    <div className="stat-card__label">{label}</div>
                  </div>
                ))}
              </div>

              <section className="workspace-stack" style={{ gap: 12 }}>
                <div className="workspace-section-heading">
                  <div>
                    <h3 style={{ fontSize: 16 }}>Subject assignments</h3>
                    <p>{planSubjects.filter(subject => subject.candidates.length > 0).length} subjects active in {monthLabel(month)}.</p>
                  </div>
                </div>

                {planSubjects.length === 0 ? (
                  <div className="workspace-panel">
                    <EmptyState message="No subjects are available. Create a subject from the library first." />
                  </div>
                ) : (
                  <div className="workspace-grid workspace-grid--wide">
                    {planSubjects.map(subject => (
                      <div className="workspace-card" key={subject.id}>
                        <div className="workspace-card__body">
                          <div className="workspace-card__topline">
                            <div>
                              <div className="workspace-card__eyebrow">Subject plan</div>
                              <h3 className="workspace-card__title">{subject.subject_name}</h3>
                              <p className="workspace-card__subtitle" style={{ textTransform: 'capitalize' }}>
                                {subject.difficulty} difficulty, {subject.duration_months} month{Number(subject.duration_months) === 1 ? '' : 's'}
                              </p>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => setAssignAssessment(subject)}>
                              <UserPlus size={13} />
                              Assign
                            </Button>
                          </div>

                          <div className="assignment-list">
                            {subject.candidates.length === 0 ? (
                              <div style={{ padding: '12px 0', color: 'var(--fg-muted)', fontSize: 12 }}>
                                No candidates assigned in this month.
                              </div>
                            ) : subject.candidates.map(candidate => {
                              const name = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim()
                              return (
                                <div className="assignment-row" key={candidate.id}>
                                  <Avatar name={name} size={28} />
                                  <div className="assignment-row__content">
                                    <strong>{name}</strong>
                                    <span>{formatDateTime(candidate.start_date)} - {formatDate(candidate.end_date)}</span>
                                  </div>
                                  <button
                                    type="button"
                                    className="danger-icon-button"
                                    disabled={cancellingEnrollmentId === candidate.id}
                                    onClick={() => cancelEnrollment({ ...candidate, subject_name: subject.subject_name })}
                                    aria-label={`Cancel ${name}'s assignment`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="workspace-panel detail-panel">
                <div className="workspace-section-heading" style={{ marginBottom: 14 }}>
                  <div>
                    <h3 style={{ fontSize: 16 }}>Members without an assessment</h3>
                    <p>People still available for a plan in {monthLabel(month)}.</p>
                  </div>
                  <span className="status-pill status-pill--warning">{plan?.unassigned?.length || 0} available</span>
                </div>
                {!plan?.unassigned?.length ? (
                  <div style={{ color: 'var(--success-600)', fontSize: 13 }}>
                    Every organization member has an assessment this month.
                  </div>
                ) : (
                  <div className="workspace-grid">
                    {plan.unassigned.map(member => {
                      const name = `${member.first_name || ''} ${member.last_name || ''}`.trim()
                      return (
                        <div className="member-row" key={member.id}>
                          <Avatar name={name} size={30} />
                          <div className="member-row__content">
                            <strong>{name}</strong>
                            <span>{member.current_position || member.email}</span>
                          </div>
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

      {tab === 'calendar' && (
        <div className="workspace-panel calendar-shell">
          <div className="month-navigator" style={{ border: 0, borderBottom: '1px solid var(--border-default)', borderRadius: 0, boxShadow: 'none' }}>
            <div className="workspace-intro">
              <h2>{calendarYear} assessment calendar</h2>
              <p>Annual visibility of candidate plans and their current status.</p>
            </div>
            <div className="month-navigator__actions">
              <button type="button" className="icon-button" onClick={() => setCalendarYear(year => year - 1)} aria-label="Previous year">
                <ChevronLeft size={16} />
              </button>
              <Button variant="secondary" size="sm" onClick={() => setCalendarYear(new Date().getFullYear())}>
                Current year
              </Button>
              <button type="button" className="icon-button" onClick={() => setCalendarYear(year => year + 1)} aria-label="Next year">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="calendar-scroll">
            <div className="calendar-grid">
              <div className="calendar-grid__header">
                <div className="workspace-card__eyebrow">Candidate / assessments</div>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(label => (
                  <div key={label} style={{ textAlign: 'center', color: 'var(--fg-muted)', fontSize: 11, fontWeight: 700 }}>{label}</div>
                ))}
              </div>

              {calendarRows.length === 0 ? (
                <EmptyState message="No assignments were found for this year." />
              ) : calendarRows.map((row, index) => (
                <div
                  key={`${row.id}-${index}`}
                  className="calendar-grid__row"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    <Avatar name={row.name} size={28} />
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', overflow: 'hidden', color: 'var(--fg-primary)', fontSize: 12, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</strong>
                      <span style={{ display: 'block', overflow: 'hidden', marginTop: 2, color: 'var(--fg-muted)', fontSize: 10, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.subjects.length === 1 ? row.subjects[0] : `${row.subjects.length} planned assessments`}
                      </span>
                    </span>
                  </div>
                  {row.months.map((monthItems, monthIndex) => (
                    <div key={monthIndex} className="calendar-cell">
                      {monthItems.length === 0 ? (
                        <span className="calendar-empty-slot" title="No plan" />
                      ) : (
                        <div className="calendar-cell__stack">
                          {monthItems.map(item => (
                            <span
                              key={item.id}
                              className="calendar-plan-chip"
                              title={`${item.subject}: ${item.status}`}
                            >
                              <span
                                className="calendar-plan-chip__dot"
                                style={{ background: statusColors[item.status] || statusColors.pending }}
                              />
                              <span>{item.subject}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, padding: '14px 20px', borderTop: '1px solid var(--border-default)' }}>
            {Object.entries(statusColors).map(([label, color]) => (
              <div key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', fontSize: 11, textTransform: 'capitalize' }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      <WizardModal open={wizardOpen} onClose={() => setWizardOpen(false)} onDone={refreshAll} />
      <MonthlyAssessmentAssignModal
        open={Boolean(assignAssessment)}
        assessment={assignAssessment}
        defaultDate={`${month}-01`}
        onClose={() => setAssignAssessment(null)}
        onDone={refreshAll}
      />
      <SubjectDetailModal
        assessment={selectedAssessment}
        open={Boolean(selectedAssessment)}
        onClose={() => setSelectedAssessment(null)}
        onAssign={assessment => {
          setSelectedAssessment(null)
          setAssignAssessment(assessment)
        }}
      />
    </div>
  )
}

export default MonthlyAssessmentPage
