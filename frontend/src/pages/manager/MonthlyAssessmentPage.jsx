import { useEffect, useState } from 'react'
import { AlertCircle, CalendarRange, ChevronLeft, ChevronRight, Plus, UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import MonthlyAssessmentAssignModal from '../../components/manager/MonthlyAssessmentAssignModal'
import Avatar from '../../components/shared/Avatar'
import Button from '../../components/shared/Button'
import EmptyState from '../../components/shared/EmptyState'
import ErrorMessage from '../../components/shared/ErrorMessage'
import Modal from '../../components/shared/Modal'
import Spinner from '../../components/shared/Spinner'
import * as api from '../../services/api'

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

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--slate-700)',
  marginBottom: 5,
}

const fieldStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid var(--slate-300)',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

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
  const steps = ['Subject details', 'Sub-topics', 'AI study material']

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
      const topics = subTopics.split('\n').map(topic => topic.trim()).filter(Boolean)
      const response = await api.generateAssessmentJD({
        subject: subject.trim(),
        subTopics: topics,
        difficulty,
      })
      setJdText(typeof response.data === 'string' ? response.data : JSON.stringify(response.data))
    } catch {
      setError('Could not generate study material.')
    } finally {
      setGeneratingJd(false)
    }
  }

  function goNext() {
    if (step === 1 && !subject.trim()) {
      setError('Subject is required.')
      return
    }
    setError(null)
    setStep(current => current + 1)
  }

  async function handleCreate() {
    if (!subject.trim()) {
      setError('Subject is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const topics = subTopics.split('\n').map(topic => topic.trim()).filter(Boolean)
      await api.createMonthlyAssessment({
        subject: subject.trim(),
        sub_topics: JSON.stringify(topics),
        difficulty,
        jd_text: jdText,
        duration_months: durationMonths,
      })
      await onDone?.()
      onClose()
    } catch (createError) {
      setError(createError.message || 'Could not create the template.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title={`Create template - Step ${step}: ${steps[step - 1]}`} size="lg">
      <div style={{ padding: '10px 0' }}>
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="monthly-subject" style={labelStyle}>Subject name</label>
              <input id="monthly-subject" type="text" placeholder="e.g. Advanced React" value={subject} onChange={event => setSubject(event.target.value)} style={fieldStyle} />
              <div style={{ marginTop: 5, fontSize: 11, color: 'var(--slate-500)' }}>Only the subject name is required. AI can generate the sub-topics.</div>
            </div>
            <div>
              <span style={labelStyle}>Difficulty</span>
              <div style={{ display: 'flex', gap: 10 }}>
                {['easy', 'medium', 'hard'].map(option => (
                  <button key={option} type="button" onClick={() => setDifficulty(option)} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${difficulty === option ? 'var(--brand-500)' : 'var(--slate-300)'}`, background: difficulty === option ? 'var(--brand-500)' : 'var(--bg-surface)', color: difficulty === option ? 'var(--bg-surface)' : 'var(--slate-700)', fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>{option}</button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="monthly-duration" style={labelStyle}>Template duration</label>
              <select id="monthly-duration" value={durationMonths} onChange={event => setDurationMonths(Number(event.target.value))} style={fieldStyle}>
                {[1, 2, 3, 6, 12].map(months => <option key={months} value={months}>{months} month{months === 1 ? '' : 's'}</option>)}
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
            <p style={{ fontSize: 13, color: 'var(--slate-600)', margin: '0 0 15px' }}>Add sub-topics manually or generate them from the subject name.</p>
            <Button variant="secondary" onClick={handleGenerateSubtopics} disabled={generating || !subject.trim()}>{generating ? 'Generating...' : 'Generate with AI'}</Button>
            <textarea aria-label="Sub-topics" placeholder="One sub-topic per line" value={subTopics} onChange={event => setSubTopics(event.target.value)} style={{ ...fieldStyle, height: 170, marginTop: 15, resize: 'vertical' }} />
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <p style={{ fontSize: 13, color: 'var(--slate-600)', margin: 0 }}>Generate or edit the study material reused whenever this template is assigned.</p>
            <Button variant="secondary" onClick={handleGenerateJD} disabled={generatingJd}>{generatingJd ? 'Generating...' : 'Generate study material'}</Button>
            <div style={{ border: '1px solid var(--slate-200)', borderRadius: 8, padding: 15, background: 'var(--slate-50)' }}>
              <label htmlFor="monthly-study-material" style={labelStyle}>JD / study material</label>
              <textarea id="monthly-study-material" value={jdText} onChange={event => setJdText(event.target.value)} style={{ ...fieldStyle, height: 220, resize: 'vertical' }} />
            </div>
          </div>
        )}

        {error && <div style={{ color: 'var(--danger-700)', fontSize: 13, marginTop: 15 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--slate-100)' }}>
          <Button variant="secondary" onClick={step > 1 ? () => setStep(current => current - 1) : onClose}>{step > 1 ? 'Back' : 'Cancel'}</Button>
          {step < steps.length
            ? <Button onClick={goNext}>Next step</Button>
            : <Button onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create template'}</Button>}
        </div>
      </div>
    </Modal>
  )
}

function MonthlyAssessmentPage() {
  const navigate = useNavigate()
  const [assessments, setAssessments] = useState([])
  const [calendarData, setCalendarData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('subjects')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedAssessment, setSelectedAssessment] = useState(null)
  const [assignAssessment, setAssignAssessment] = useState(null)
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear())

  useEffect(() => { void loadAll() }, [])

  async function loadAll() {
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
      setError('Could not load assessments.')
    } finally {
      setLoading(false)
    }
  }

  function openAssignment(assessment) {
    setSelectedAssessment(null)
    setAssignAssessment(assessment)
  }

  if (loading) return <Spinner center />
  if (error) return <ErrorMessage message={error} />

  const calendarRows = calendarData.map(row => {
    const progress = parseStoredArray(row.month_progress)
    const duration = Number(row.duration_months) || progress.length || 1
    const startDate = new Date(row.start_date || row.assessment_created || row.created)
    const months = new Array(12).fill(null)
    for (let index = 0; index < duration; index += 1) {
      const monthDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + index, 1))
      if (monthDate.getUTCFullYear() === calendarYear) months[monthDate.getUTCMonth()] = progress[index] || 'pending'
    }
    return {
      id: row.id,
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      subject: row.subject_name,
      months,
    }
  }).filter(row => row.months.some(Boolean))

  const statusColors = {
    completed: 'var(--success-500)',
    scheduled: 'var(--info-500)',
    cancelled: 'var(--danger-500)',
    pending: 'var(--bg-surface-alt, var(--slate-200))',
  }

  return (
    <div style={{ maxWidth: 1050 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <Button variant="secondary" onClick={() => navigate('/manager/monthly/plan')}><CalendarRange size={16} /> Monthly plan</Button>
        <Button onClick={() => setWizardOpen(true)}><Plus size={16} /> Create template</Button>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--slate-200)', marginBottom: 24 }}>
        {[{ id: 'subjects', label: 'Subject templates' }, { id: 'calendar', label: 'Yearly calendar' }].map(item => (
          <button key={item.id} type="button" onClick={() => setTab(item.id)} style={{ background: 'transparent', border: 0, padding: '10px 14px', fontSize: 13, fontWeight: tab === item.id ? 600 : 500, color: tab === item.id ? 'var(--brand-700)' : 'var(--slate-500)', borderBottom: tab === item.id ? '2px solid var(--brand-500)' : '2px solid transparent', marginBottom: -1, cursor: 'pointer', fontFamily: 'inherit' }}>{item.label}</button>
        ))}
      </div>

      {tab === 'subjects' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
          {assessments.length === 0 ? <EmptyState message="No templates created yet." /> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>
                  {['Subject', 'Difficulty', 'Duration', 'Total assignments', 'Status', ''].map(label => <th key={label} style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {assessments.map((assessment, index) => (
                  <tr key={assessment.id} onClick={() => setSelectedAssessment(assessment)} style={{ borderBottom: index === assessments.length - 1 ? 'none' : '1px solid var(--slate-100)', cursor: 'pointer' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-700)' }}>{assessment.subject_name}</div>
                      {parseStoredArray(assessment.sub_topics).length > 0 && <div style={{ maxWidth: 330, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>{parseStoredArray(assessment.sub_topics).slice(0, 3).join(', ')}</div>}
                    </td>
                    <td style={{ padding: '14px 16px' }}><span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 9999, background: 'var(--slate-100)', color: 'var(--slate-700)', fontSize: 11, fontWeight: 500, textTransform: 'capitalize' }}>{assessment.difficulty}</span></td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--slate-700)' }}>{assessment.duration_months} month{Number(assessment.duration_months) === 1 ? '' : 's'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--slate-700)' }}>{assessment.enrollments?.length || 0}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 9999, background: assessment.status === 'active' ? 'var(--success-50)' : 'var(--slate-100)', color: assessment.status === 'active' ? 'var(--success-600)' : 'var(--slate-600)', fontSize: 12, fontWeight: 500 }}>
                        <span style={{ width: 6, height: 6, borderRadius: 9999, background: assessment.status === 'active' ? 'var(--success-500)' : 'var(--slate-400)' }} />
                        {(assessment.status || 'pending').replace(/^./, letter => letter.toUpperCase())}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <Button variant="secondary" onClick={event => { event.stopPropagation(); openAssignment(assessment) }}><UserPlus size={13} /> Assign</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'calendar' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <strong style={{ fontSize: 15, color: 'var(--slate-900)' }}>{calendarYear} assessment plan</strong>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => setCalendarYear(year => year - 1)} aria-label="Previous year" style={{ border: '1px solid var(--slate-300)', background: 'var(--bg-surface)', borderRadius: 7, padding: 6, cursor: 'pointer', display: 'inline-flex' }}><ChevronLeft size={15} /></button>
              <button type="button" onClick={() => setCalendarYear(new Date().getFullYear())} style={{ border: '1px solid var(--slate-300)', background: 'var(--bg-surface)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>Current year</button>
              <button type="button" onClick={() => setCalendarYear(year => year + 1)} aria-label="Next year" style={{ border: '1px solid var(--slate-300)', background: 'var(--bg-surface)', borderRadius: 7, padding: 6, cursor: 'pointer', display: 'inline-flex' }}><ChevronRight size={15} /></button>
            </div>
          </div>
          <div style={{ minWidth: 800 }}>
            <div style={{ display: 'flex', marginBottom: 15 }}>
              <div style={{ width: 140, fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Candidate</div>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => <div key={month} style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--slate-500)' }}>{month}</div>)}
            </div>
            {calendarRows.length === 0 ? <EmptyState message="No assignments in this year." /> : calendarRows.map((row, index) => (
              <div key={row.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderTop: index === 0 ? 0 : '1px solid var(--slate-100)' }}>
                <div style={{ width: 140, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar name={row.name} size={24} />
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</strong>
                    <span style={{ display: 'block', fontSize: 10, color: 'var(--slate-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.subject}</span>
                  </span>
                </div>
                {row.months.map((status, monthIndex) => (
                  <div key={monthIndex} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <div title={status || 'Not scheduled'} style={{ width: 14, height: 14, borderRadius: 4, background: status ? (statusColors[status] || statusColors.pending) : 'transparent', border: status ? 0 : '1px solid var(--slate-100)' }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 15, marginTop: 20, paddingTop: 15, borderTop: '1px solid var(--slate-100)' }}>
            {Object.entries(statusColors).map(([label, color]) => <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--slate-600)', textTransform: 'capitalize' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />{label}</div>)}
          </div>
        </div>
      )}

      <WizardModal open={wizardOpen} onClose={() => setWizardOpen(false)} onDone={loadAll} />
      <MonthlyAssessmentAssignModal open={Boolean(assignAssessment)} assessment={assignAssessment} onClose={() => setAssignAssessment(null)} onDone={loadAll} />

      <Modal open={Boolean(selectedAssessment)} onClose={() => setSelectedAssessment(null)} title={selectedAssessment?.subject_name || 'Template details'} size="lg">
        {selectedAssessment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '6px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                ['Difficulty', selectedAssessment.difficulty],
                ['Duration', `${selectedAssessment.duration_months} month${Number(selectedAssessment.duration_months) === 1 ? '' : 's'}`],
                ['Assignments', selectedAssessment.enrollments?.length || 0],
              ].map(([label, value]) => <div key={label} style={{ padding: 12, borderRadius: 9, background: 'var(--slate-50)' }}><div style={{ fontSize: 11, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div><strong style={{ fontSize: 13, textTransform: label === 'Difficulty' ? 'capitalize' : 'none' }}>{value}</strong></div>)}
            </div>
            <div>
              <h3 style={{ fontSize: 13, margin: '0 0 8px' }}>Sub-topics</h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {parseStoredArray(selectedAssessment.sub_topics).map(topic => <span key={topic} style={{ padding: '4px 8px', borderRadius: 999, background: 'var(--brand-50)', color: 'var(--brand-700)', fontSize: 12 }}>{topic}</span>)}
                {parseStoredArray(selectedAssessment.sub_topics).length === 0 && <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>No sub-topics added.</span>}
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 13, margin: '0 0 8px' }}>JD / study material</h3>
              <div style={{ maxHeight: 220, overflowY: 'auto', padding: 12, borderRadius: 9, border: '1px solid var(--slate-200)', whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.6, color: 'var(--slate-700)' }}>{selectedAssessment.ai_generated_jd || 'No study material generated.'}</div>
            </div>
            <div>
              <h3 style={{ fontSize: 13, margin: '0 0 8px' }}>Assignment history</h3>
              {(selectedAssessment.enrollments || []).length === 0 ? <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>This template has not been assigned yet.</span> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {selectedAssessment.enrollments.map(enrollment => <div key={enrollment.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 10px', borderRadius: 8, background: 'var(--slate-50)', fontSize: 12 }}><strong>{enrollment.first_name} {enrollment.last_name}</strong><span style={{ color: 'var(--slate-500)' }}>{enrollment.start_date ? new Date(enrollment.start_date).toLocaleDateString() : 'Date not set'}</span></div>)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Button onClick={() => openAssignment(selectedAssessment)}><UserPlus size={14} /> Assign candidates</Button></div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default MonthlyAssessmentPage
