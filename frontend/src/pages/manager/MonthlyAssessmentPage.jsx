import { useState, useEffect } from 'react'
import { Plus, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import Avatar from '../../components/shared/Avatar'
import * as api from '../../services/api'

function defaultAssessmentDate() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString().slice(0, 10)
}

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

function WizardModal({ open, onClose, onDone }) {
  const [step, setStep] = useState(1)
  const steps = ['Subject details', 'Sub-topics', 'AI Study Material', 'Assign Candidates']

  // Step 1 state
  const [subject, setSubject] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [customDifficulty, setCustomDifficulty] = useState('')
  // Step 2 state
  const [subTopics, setSubTopics] = useState('')
  const [generating, setGenerating] = useState(false)
  // Step 3 state
  const [jdText, setJdText] = useState('')
  const [generatingJd, setGeneratingJd] = useState(false)
  // Step 4 state
  const [durationMonths, setDurationMonths] = useState(3)
  const [assessmentDate, setAssessmentDate] = useState(defaultAssessmentDate)
  const [teamList, setTeamList] = useState([])
  const [selectedMemberIds, setSelectedMemberIds] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setStep(1); setSubject(''); setDifficulty('medium'); setSubTopics(''); setJdText(''); setDurationMonths(3); setAssessmentDate(defaultAssessmentDate()); setSelectedMemberIds([]); setError(null)
    async function loadTeam() {
      try {
        const response = await api.getTeam()
        setTeamList(response.data || [])
      } catch {
        setTeamList([])
      }
    }
    void loadTeam()
  }, [open])

  async function handleGenerateSubtopics() {
    if (!subject) return
    setGenerating(true)
    setError(null)
    try {
      const res = await api.generateSubtopics({ subject, difficulty })
      setSubTopics(Array.isArray(res.data) ? res.data.join('\n') : res.data)
    } catch { setError('Could not generate subtopics.') }
    finally { setGenerating(false) }
  }

  async function handleGenerateJD() {
    setGeneratingJd(true)
    setError(null)
    try {
      const topics = subTopics.split('\n').map(t => t.trim()).filter(Boolean)
      const res = await api.generateAssessmentJD({ subject, subTopics: topics, difficulty })
      setJdText(typeof res.data === 'string' ? res.data : JSON.stringify(res.data))
    } catch { setError('Could not generate study material.') }
    finally { setGeneratingJd(false) }
  }

  async function handleCreate() {
    if (!subject) { setError('Subject is required.'); return }
    if (!assessmentDate) { setError('Assessment start date is required.'); return }
    if (selectedMemberIds.length === 0) { setError('Select at least one candidate.'); return }
    setSaving(true)
    setError(null)
    try {
      const topics = subTopics.split('\n').map(t => t.trim()).filter(Boolean)
      await api.createMonthlyAssessment({
        subject,
        sub_topics: JSON.stringify(topics),
        difficulty: difficulty === 'custom' ? (customDifficulty || 'custom') : difficulty,
        jd_text: jdText,
        duration_months: durationMonths,
        assessment_date: assessmentDate,
        team_member_ids: selectedMemberIds,
      })
      if (onDone) onDone()
      onClose()
    } catch (err) { setError(err.message || 'Could not create assessment.') }
    finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title={`Create Assessment - Step ${step}: ${steps[step-1]}`} size="lg">
      <div style={{ padding: '10px 0' }}>
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 5 }}>Subject Name</label>
              <input type="text" placeholder="e.g. Advanced React" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--slate-300)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 5 }}>Difficulty</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {['easy', 'medium', 'hard', 'custom'].map(d => (
                  <button key={d} onClick={() => setDifficulty(d)} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${difficulty === d ? 'var(--brand-500)' : 'var(--slate-300)'}`, background: difficulty === d ? 'var(--brand-500)' : 'var(--bg-surface)', color: difficulty === d ? 'var(--bg-surface)' : 'var(--slate-700)', fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>{d}</button>
                ))}
              </div>
              {difficulty === 'custom' && (
                <input type="text" placeholder="e.g. 2–3 years experience, senior level" value={customDifficulty} onChange={e => setCustomDifficulty(e.target.value)} style={{ marginTop: 8, width: '100%', padding: '8px 12px', border: '1px solid var(--slate-300)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              )}
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--slate-600)', marginBottom: 15 }}>Add sub-topics manually or use AI to generate them based on the subject.</p>
            <Button variant="secondary" onClick={handleGenerateSubtopics} disabled={generating || !subject}>
              {generating ? 'Generating...' : 'Generate with AI ✨'}
            </Button>
            <textarea placeholder="Sub-topics (one per line)..." value={subTopics} onChange={e => setSubTopics(e.target.value)} style={{ width: '100%', height: 150, padding: '9px 12px', border: '1px solid var(--slate-300)', borderRadius: 8, fontSize: 13, marginTop: 15, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }} />
          </div>
        )}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <p style={{ fontSize: 13, color: 'var(--slate-600)', margin: 0 }}>Generate study material and guidelines for the candidates.</p>
            <Button variant="secondary" onClick={handleGenerateJD} disabled={generatingJd}>
              {generatingJd ? 'Generating...' : 'Generate study material ✨'}
            </Button>
            <div style={{ border: '1px solid var(--slate-200)', borderRadius: 8, padding: 15, background: 'var(--slate-50)' }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px' }}>Generated JD / Study Material</p>
              <textarea value={jdText} onChange={e => setJdText(e.target.value)} style={{ width: '100%', height: 200, padding: '9px 12px', border: '1px solid var(--slate-300)', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
          </div>
        )}
        {step === 4 && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Enforced Rules</p>
            <div style={{ background: 'var(--danger-50)', padding: 12, borderRadius: 8, border: '1px solid var(--danger-200)', display: 'flex', gap: 8, marginBottom: 15 }}>
              <AlertCircle size={16} color="var(--danger-500)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: 'var(--danger-700)', lineHeight: 1.5 }}>
                - Cannot be rescheduled.<br/>
                - 1 time link, must complete once started.<br/>
                - Tab switching results in warning, then termination.
              </div>
            </div>
            
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 5 }}>Assessment Start Date</label>
              <input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--slate-300)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 12 }} />
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 5 }}>Duration</label>
              <select value={durationMonths} onChange={e => setDurationMonths(Number(e.target.value))} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--slate-300)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}>
                <option value={1}>1 Month</option>
                <option value={2}>2 Months</option>
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 5 }}>Assign Candidates</label>
              <div style={{ border: '1px solid var(--slate-200)', borderRadius: 8, maxHeight: 200, overflowY: 'auto', padding: 8 }}>
                {teamList.map(m => (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(m.id)}
                      onChange={() => setSelectedMemberIds(prev =>
                        prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                      )}
                    />
                    {m.first_name} {m.last_name}
                    {m.availability && <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>• {m.availability}</span>}
                  </label>
                ))}
                {teamList.length === 0 && <div style={{ fontSize: 12, color: 'var(--slate-500)', padding: 4 }}>No team members available.</div>}
              </div>
            </div>
          </div>
        )}

        {error && <div style={{ color: 'var(--danger-700)', fontSize: 13, marginTop: 15 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--slate-100)' }}>
          <Button variant="secondary" onClick={step > 1 ? () => setStep(s => s - 1) : onClose}>
            {step > 1 ? '← Back' : 'Cancel'}
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep(s => s + 1)}>Next Step →</Button>
          ) : (
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create Assessment'}</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function MonthlyAssessmentPage() {
  const [assessments, setAssessments] = useState([])
  const [calendarData, setCalendarData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('subjects')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedAssessment, setSelectedAssessment] = useState(null)
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear())

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true); setError(null)
    try {
      const [subjRes, calRes] = await Promise.all([
        api.getMonthlyAssessments(),
        api.getMonthlyAssessmentCalendar(),
      ])
      setAssessments(subjRes.data || [])
      setCalendarData(calRes.data || [])
    } catch { setError('Could not load assessments.') }
    finally { setLoading(false) }
  }

  if (loading) return <Spinner center />
  if (error) return <ErrorMessage message={error} />

  const calRows = calendarData.map(row => {
    const progress = parseStoredArray(row.month_progress)
    const duration = Number(row.duration_months) || progress.length || 1
    const startDate = new Date(row.start_date || row.assessment_created || row.created)
    const months = new Array(12).fill(null)
    for (let index = 0; index < duration; index += 1) {
      const monthDate = new Date(Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth() + index,
        1
      ))
      if (monthDate.getUTCFullYear() === calendarYear) {
        months[monthDate.getUTCMonth()] = progress[index] || 'pending'
      }
    }
    return {
      id: row.id,
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      subject: row.subject_name,
      months,
    }
  }).filter(row => row.months.some(Boolean))

  const STATUS_COLORS = {
    completed: 'var(--success-500)',
    scheduled: 'var(--info-500)',
    cancelled: 'var(--danger-500)',
    pending:   'var(--bg-surface-alt, var(--slate-200))',
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 24 }}>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus size={16} style={{ marginRight: 6 }} /> Create Subject
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--slate-200)', marginBottom: 24 }}>
        {[{ id: 'subjects', label: 'Subjects & Rules' }, { id: 'calendar', label: 'Yearly Calendar' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: 'transparent', border: 0, padding: '10px 14px', fontSize: 13, fontWeight: tab === t.id ? 600 : 500, color: tab === t.id ? 'var(--brand-700)' : 'var(--slate-500)', borderBottom: tab === t.id ? '2px solid var(--brand-500)' : '2px solid transparent', marginBottom: -1, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'subjects' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
          {assessments.length === 0 ? (
            <EmptyState message="No subjects created yet. Click 'Create Subject' to get started." />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Difficulty</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enrolled</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a, i) => (
                  <tr key={a.id} onClick={() => setSelectedAssessment(a)} style={{ borderBottom: i === assessments.length - 1 ? 'none' : '1px solid var(--slate-100)', cursor: 'pointer' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-700)' }}>{a.subject_name}</div>
                      {parseStoredArray(a.sub_topics).length > 0 && <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>{parseStoredArray(a.sub_topics).slice(0, 3).join(', ')}</div>}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--slate-700)' }}>
                      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 9999, background: 'var(--slate-100)', color: 'var(--slate-700)', fontSize: 11, fontWeight: 500, textTransform: 'capitalize' }}>{a.difficulty}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--slate-700)' }}>{a.duration_months} months</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--slate-700)' }}>{a.enrollments?.length || 0}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 9999, background: a.status === 'active' ? 'var(--success-50)' : 'var(--slate-100)', color: a.status === 'active' ? 'var(--success-600)' : 'var(--slate-600)', fontSize: 12, fontWeight: 500 }}>
                        <span style={{ width: 6, height: 6, borderRadius: 9999, background: a.status === 'active' ? 'var(--success-500)' : 'var(--slate-400)' }} />
                        {(a.status || 'pending').charAt(0).toUpperCase() + (a.status || 'pending').slice(1)}
                      </span>
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
            {/* Header row (months) */}
            <div style={{ display: 'flex', marginBottom: 15 }}>
              <div style={{ width: 140, fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Candidate</div>
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--slate-500)' }}>{m}</div>
              ))}
            </div>
            
            {/* Rows */}
            {calRows.length === 0 ? (
              <EmptyState message="No calendar data available." />
            ) : (
              calRows.map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderTop: i === 0 ? '0' : '1px solid var(--slate-100)' }}>
                  <div style={{ width: 140, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={row.name} size={24} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                      <span style={{ display: 'block', fontSize: 10, color: 'var(--slate-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.subject}</span>
                    </span>
                  </div>
                  {Array.from({ length: 12 }).map((_, mIndex) => {
                    const status = row.months[mIndex]
                    const bg = status ? (STATUS_COLORS[status] || STATUS_COLORS.pending) : 'transparent'
                    return (
                      <div key={mIndex} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, background: bg, border: status ? 0 : '1px solid var(--slate-100)' }} title={status || 'Not scheduled'} />
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>
          <div style={{ display: 'flex', gap: 15, marginTop: 20, paddingTop: 15, borderTop: '1px solid var(--slate-100)' }}>
            {Object.entries(STATUS_COLORS).map(([label, color]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--slate-600)', textTransform: 'capitalize' }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      <WizardModal open={wizardOpen} onClose={() => setWizardOpen(false)} onDone={loadAll} />
      <Modal open={Boolean(selectedAssessment)} onClose={() => setSelectedAssessment(null)} title={selectedAssessment?.subject_name || 'Assessment details'} size="lg">
        {selectedAssessment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '6px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                ['Difficulty', selectedAssessment.difficulty],
                ['Duration', `${selectedAssessment.duration_months} month${Number(selectedAssessment.duration_months) === 1 ? '' : 's'}`],
                ['Candidates', selectedAssessment.enrollments?.length || 0],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: 12, borderRadius: 9, background: 'var(--slate-50)' }}>
                  <div style={{ fontSize: 11, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <strong style={{ fontSize: 13, color: 'var(--slate-900)', textTransform: label === 'Difficulty' ? 'capitalize' : 'none' }}>{value}</strong>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: 13, margin: '0 0 8px', color: 'var(--slate-900)' }}>Sub-topics</h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {parseStoredArray(selectedAssessment.sub_topics).map(topic => <span key={topic} style={{ padding: '4px 8px', borderRadius: 999, background: 'var(--brand-50)', color: 'var(--brand-700)', fontSize: 12 }}>{topic}</span>)}
                {parseStoredArray(selectedAssessment.sub_topics).length === 0 && <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>No sub-topics added.</span>}
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 13, margin: '0 0 8px', color: 'var(--slate-900)' }}>JD / study material</h3>
              <div style={{ maxHeight: 220, overflowY: 'auto', padding: 12, borderRadius: 9, border: '1px solid var(--slate-200)', whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.6, color: 'var(--slate-700)' }}>
                {selectedAssessment.ai_generated_jd || 'No study material generated.'}
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 13, margin: '0 0 8px', color: 'var(--slate-900)' }}>Assigned candidates</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {(selectedAssessment.enrollments || []).map(enrollment => (
                  <div key={enrollment.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 10px', borderRadius: 8, background: 'var(--slate-50)', fontSize: 12 }}>
                    <strong>{enrollment.first_name} {enrollment.last_name}</strong>
                    <span style={{ color: 'var(--slate-500)' }}>{enrollment.start_date ? new Date(enrollment.start_date).toLocaleDateString() : 'Date not set'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default MonthlyAssessmentPage
