import { useEffect, useState } from 'react'
import { AlertCircle, Sparkles } from 'lucide-react'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import * as api from '../../../services/api'
import { parseStoredArray } from '../../../utils/helpers'

function WizardModal({ open, onClose, onDone, initialData }) {
  const [step, setStep] = useState(1)
  const [subject, setSubject] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [durationMonths, setDurationMonths] = useState(3)
  const [interviewType, setInterviewType] = useState('exam')
  const [interviewMode, setInterviewMode] = useState('simple')
  const [subTopics, setSubTopics] = useState('')
  const [studyMaterial, setStudyMaterial] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatingMaterial, setGeneratingMaterial] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setStep(1)
    setSubject(initialData?.subject_name || '')
    setDifficulty(initialData?.difficulty || 'medium')
    setDurationMonths(Number(initialData?.duration_months) || 3)
    setInterviewType(initialData?.interview_type || 'exam')
    setInterviewMode(initialData?.interview_mode || 'simple')
    setSubTopics(initialData?.sub_topics ? parseStoredArray(initialData.sub_topics).join('\n') : '')
    setStudyMaterial(initialData?.ai_generated_jd || '')
    setError(null)
  }, [open, initialData])

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
      const payload = {
        subject: subject.trim(),
        sub_topics: JSON.stringify(topics),
        difficulty,
        jd_text: studyMaterial,
        duration_months: durationMonths,
        interview_type: interviewType,
        interview_mode: interviewMode,
      }
      if (initialData?.id) {
        await api.updateMonthlyAssessment(initialData.id, payload)
      } else {
        await api.createMonthlyAssessment(payload)
      }
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
    <Modal open={open} onClose={onClose} title={initialData ? "Edit monthly subject" : "Create monthly subject"} size="lg">
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
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-field">
                <label htmlFor="monthly-interview-type" className="form-label">Type</label>
                <select id="monthly-interview-type" className="form-input" value={interviewType} onChange={e => setInterviewType(e.target.value)}>
                  <option value="exam">Exam</option>
                  <option value="ai_voice">AI Voice Interview</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="monthly-interview-mode" className="form-label">Mode</label>
                <select id="monthly-interview-mode" className="form-input" value={interviewMode} onChange={e => setInterviewMode(e.target.value)} disabled={interviewType === 'exam'}>
                  <option value="simple">Simple</option>
                  <option value="adaptive">Adaptive</option>
                </select>
              </div>
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
            <Button onClick={createSubject} loading={saving}>{initialData ? 'Save changes' : 'Create subject'}</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default WizardModal
