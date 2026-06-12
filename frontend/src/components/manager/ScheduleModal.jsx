import { useEffect, useMemo, useState } from 'react'
import { Check, Code2, Mic } from 'lucide-react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import Avatar from '../shared/Avatar'
import * as api from '../../services/api'

const STEPS = ['Type', 'Configure', 'Candidates', 'Confirm']
const TYPES = [
  {
    id: 'ai_voice',
    label: 'AI Voice Interview',
    description: 'Spoken interview with a transcript, scorecard, and report.',
    icon: Mic,
  },
  {
    id: 'exam',
    label: 'AI Assessment Exam',
    description: 'Multiple-choice, written, and coding questions.',
    icon: Code2,
  },
]

function candidateKey(candidate) {
  return `${candidate.external ? 'external' : 'internal'}:${candidate.id}`
}

function ScheduleModal({
  open,
  onClose,
  member,
  selectedIds = [],
  template,
  onDone,
}) {
  const [step, setStep] = useState(1)
  const [type, setType] = useState('ai_voice')
  const [interviewMode, setInterviewMode] = useState('simple')
  const [difficulty, setDifficulty] = useState('medium')
  const [questionCount, setQuestionCount] = useState(10)
  const [candidates, setCandidates] = useState([])
  const [selectedKeys, setSelectedKeys] = useState(new Set())
  const [reportEmails, setReportEmails] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const selectedIdsKey = selectedIds.join(',')

  const context = useMemo(() => {
    if (!template) return null
    if (template.client_name) {
      return {
        label: `Client mandate: ${template.client_name}`,
        clientTemplateId: template.id,
      }
    }
    if (template.subject_name) {
      return {
        label: `Monthly assessment: ${template.subject_name}`,
        monthlyAssessmentId: template.id,
      }
    }
    return null
  }, [template])

  useEffect(() => {
    if (!open) return
    setStep(1)
    setType('ai_voice')
    setInterviewMode('simple')
    setDifficulty(template?.difficulty || 'medium')
    setQuestionCount(10)
    setReportEmails('')
    setError(null)

    async function loadCandidates() {
      try {
        const [teamResponse, externalResponse] = await Promise.all([
          api.getTeam(),
          api.getExternalCandidates(),
        ])
        const internal = (teamResponse.data || []).map(item => ({
          ...item,
          external: false,
        }))
        const external = (externalResponse.data || []).map(item => ({
          ...item,
          external: true,
        }))
        const all = [...internal, ...external]
        setCandidates(all)

        const initial = new Set()
        if (member) {
          initial.add(candidateKey({
            ...member,
            external: Boolean(member.external),
          }))
        } else {
          for (const id of selectedIdsKey.split(',').filter(Boolean)) {
            initial.add(`internal:${id}`)
          }
        }
        setSelectedKeys(initial)
      } catch (loadError) {
        console.error('Could not load schedule candidates:', loadError)
        setCandidates([])
        setSelectedKeys(new Set())
        setError('Could not load candidates.')
      }
    }

    loadCandidates()
  }, [open, member, selectedIdsKey, template])

  const selectedCandidates = candidates.filter(candidate =>
    selectedKeys.has(candidateKey(candidate))
  )

  function toggleCandidate(candidate) {
    const key = candidateKey(candidate)
    setSelectedKeys(current => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function nextStep() {
    if (step === 3 && selectedCandidates.length === 0) {
      setError('Select at least one candidate.')
      return
    }
    setError(null)
    setStep(current => Math.min(4, current + 1))
  }

  async function submit() {
    if (selectedCandidates.length === 0) {
      setError('Select at least one candidate.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await Promise.all(selectedCandidates.map(candidate => {
        const payload = {
          type,
          interviewMode: type === 'exam' ? 'simple' : interviewMode,
          difficulty,
          questionCount,
          reportEmails: reportEmails.trim(),
          clientTemplateId: context?.clientTemplateId,
          monthlyAssessmentId: context?.monthlyAssessmentId,
        }
        if (candidate.external) payload.candidateId = candidate.id
        else payload.teamMemberId = candidate.id
        return api.createSchedule(payload)
      }))
      await onDone?.()
      onClose()
    } catch (submitError) {
      setError(submitError.message || 'Could not schedule the assessment.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const card = active => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    border: `1px solid ${active ? 'var(--brand-500)' : 'var(--border-default)'}`,
    background: active ? 'var(--brand-50)' : 'var(--bg-surface)',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  })

  return (
    <Modal open={open} onClose={loading ? undefined : onClose} title="Schedule assessment" size="lg">
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {STEPS.map((label, index) => {
          const number = index + 1
          const complete = number < step
          return (
            <div key={label} style={{ flex: 1 }}>
              <div style={{
                height: 4,
                borderRadius: 999,
                background: number <= step ? 'var(--brand-500)' : 'var(--slate-200)',
                marginBottom: 6,
              }} />
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: number <= step ? 'var(--brand-700)' : 'var(--fg-subtle)',
              }}>
                {complete ? 'Done' : label}
              </span>
            </div>
          )
        })}
      </div>

      {step === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {TYPES.map(option => (
            <button key={option.id} type="button" onClick={() => setType(option.id)} style={card(type === option.id)}>
              <span style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--bg-surface)', color: 'var(--brand-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <option.icon size={18} />
              </span>
              <span>
                <strong style={{ display: 'block', fontSize: 14, color: 'var(--fg-primary)', marginBottom: 4 }}>{option.label}</strong>
                <span style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.5 }}>{option.description}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {context && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--brand-50)', color: 'var(--brand-700)', fontSize: 13, fontWeight: 600 }}>
              {context.label}
            </div>
          )}
          {type === 'ai_voice' && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', marginBottom: 8 }}>Interview mode</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['simple', 'adaptive'].map(value => (
                  <Button key={value} variant={interviewMode === value ? 'primary' : 'secondary'} onClick={() => setInterviewMode(value)}>
                    {value === 'simple' ? 'Fixed questions' : 'Adaptive follow-ups'}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', marginBottom: 8 }}>Difficulty</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['easy', 'medium', 'hard'].map(value => (
                <Button key={value} variant={difficulty === value ? 'primary' : 'secondary'} onClick={() => setDifficulty(value)}>
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="schedule-question-count" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', marginBottom: 8 }}>Question count</label>
            <select id="schedule-question-count" value={questionCount} onChange={event => setQuestionCount(Number(event.target.value))} style={{ padding: '9px 12px', border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--bg-surface)', fontFamily: 'inherit' }}>
              {[5, 8, 10, 15, 20].map(value => <option key={value} value={value}>{value} questions</option>)}
            </select>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-muted)' }}>
            Each scheduled interview is a single attempt and generates one report.
          </p>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: 10 }}>
            {candidates.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>No candidates available.</div>
            ) : candidates.map(candidate => {
              const name = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || candidate.email
              const checked = selectedKeys.has(candidateKey(candidate))
              return (
                <label key={candidateKey(candidate)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--border-default)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleCandidate(candidate)} style={{ accentColor: 'var(--brand-500)' }} />
                  <Avatar name={name} size={28} />
                  <span style={{ flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: 13, color: 'var(--fg-primary)' }}>{name}</strong>
                    <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{candidate.email}</span>
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: candidate.external ? 'var(--warning-700)' : 'var(--brand-700)' }}>
                    {candidate.external ? 'EXTERNAL' : 'INTERNAL'}
                  </span>
                </label>
              )
            })}
          </div>
          <div>
            <label htmlFor="schedule-report-emails" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', marginBottom: 6 }}>
              Additional report emails
            </label>
            <input id="schedule-report-emails" value={reportEmails} onChange={event => setReportEmails(event.target.value)} placeholder="hr@example.com, lead@example.com" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid var(--border-default)', borderRadius: 8, fontFamily: 'inherit' }} />
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            ['Type', TYPES.find(option => option.id === type)?.label],
            ['Mode', type === 'exam' ? 'Fixed assessment' : interviewMode],
            ['Difficulty', difficulty],
            ['Questions', questionCount],
            ['Candidates', selectedCandidates.length],
            ['Context', context?.label || 'General assessment'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-surface-alt)', borderRadius: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
              <strong style={{ color: 'var(--fg-primary)', textTransform: label === 'Difficulty' ? 'capitalize' : 'none' }}>{value}</strong>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success-600)', fontSize: 12 }}>
            <Check size={14} /> Magic links are valid for seven days and can be resent by the manager.
          </div>
        </div>
      )}

      {error && <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 8, background: 'var(--danger-50)', color: 'var(--danger-700)', fontSize: 12 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22 }}>
        <Button variant="secondary" disabled={loading} onClick={() => step === 1 ? onClose() : setStep(current => current - 1)}>
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>
        {step < 4 ? (
          <Button onClick={nextStep}>Continue</Button>
        ) : (
          <Button disabled={loading} onClick={submit}>{loading ? 'Scheduling...' : 'Schedule and send'}</Button>
        )}
      </div>
    </Modal>
  )
}

export default ScheduleModal
