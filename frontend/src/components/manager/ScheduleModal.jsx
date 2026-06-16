import { useEffect, useMemo, useState } from 'react'
import { Check, Code2, Mic, Search, X } from 'lucide-react'
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

function matchesUser(user, query) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  const firstName = String(user.first_name || '')
  const lastName = String(user.last_name || '')
  const name = `${firstName} ${lastName}`.trim().toLowerCase()
  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toLowerCase()
  let tags
  try {
    tags = Array.isArray(user.tags) ? user.tags : JSON.parse(user.tags || '[]')
  } catch {
    tags = []
  }
  return name.includes(normalized)
    || String(user.email || '').toLowerCase().includes(normalized)
    || initials.includes(normalized)
    || tags.join(' ').toLowerCase().includes(normalized)
}

function ScheduleModal({
  open,
  onClose,
  member,
  selectedIds = [],
  selectedMembers = [],
  template,
  onDone,
}) {
  const [step, setStep] = useState(1)
  const [type, setType] = useState('ai_voice')
  const [interviewMode, setInterviewMode] = useState('simple')
  const [difficulty, setDifficulty] = useState('medium')
  const [questionCount, setQuestionCount] = useState(10)
  const [candidates, setCandidates] = useState([])
  const [orgUsers, setOrgUsers] = useState([])
  const [managerId, setManagerId] = useState(null)
  const [selectedKeys, setSelectedKeys] = useState(new Set())
  const [candidateQuery, setCandidateQuery] = useState('')
  const [reportQuery, setReportQuery] = useState('')
  const [reportUserIds, setReportUserIds] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const selectedIdsKey = selectedIds.join(',')
  const selectedMembersKey = selectedMembers
    .map(selectedMember => selectedMember.user_id || selectedMember.id)
    .join(',')

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
    setCandidateQuery('')
    setReportQuery('')
    setError(null)

    async function loadCandidates() {
      try {
        const [orgResponse, externalResponse, profileResponse] = await Promise.all([
          api.getScheduleOrgUsers(),
          api.getExternalCandidates(),
          api.getProfile(),
        ])
        const organizationUsers = orgResponse.data || []
        const internal = organizationUsers
          .filter(item => item.role !== 'manager')
          .map(item => ({
          ...item,
          external: false,
          }))
        const external = (externalResponse.data || []).map(item => ({
          ...item,
          external: true,
        }))
        const all = [...internal, ...external]
        const currentManagerId = Number(profileResponse.data?.id)
        setCandidates(all)
        setOrgUsers(organizationUsers)
        setManagerId(currentManagerId)
        setReportUserIds(new Set(Number.isInteger(currentManagerId) ? [currentManagerId] : []))

        const initial = new Set()
        if (member) {
          const initialId = member.external ? member.id : (member.user_id || member.id)
          initial.add(`${member.external ? 'external' : 'internal'}:${initialId}`)
        } else if (selectedMembersKey) {
          for (const userId of selectedMembersKey.split(',').filter(Boolean)) {
            initial.add(`internal:${userId}`)
          }
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
  }, [open, member, selectedIdsKey, selectedMembersKey, template])

  const selectedCandidates = candidates.filter(candidate =>
    selectedKeys.has(candidateKey(candidate))
  )
  const visibleCandidates = candidates.filter(candidate => matchesUser(candidate, candidateQuery))
  const selectedReportUsers = orgUsers.filter(user => reportUserIds.has(Number(user.id)))
  const reportSuggestions = orgUsers.filter(user =>
    !reportUserIds.has(Number(user.id)) && matchesUser(user, reportQuery)
  ).slice(0, 8)

  function toggleCandidate(candidate) {
    const key = candidateKey(candidate)
    setSelectedKeys(current => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function addReportUser(user) {
    setReportUserIds(current => new Set([...current, Number(user.id)]))
    setReportQuery('')
  }

  function removeReportUser(userId) {
    if (Number(userId) === managerId) return
    setReportUserIds(current => {
      const next = new Set(current)
      next.delete(Number(userId))
      return next
    })
  }

  function nextStep() {
    if (step === 2 && (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 50)) {
      setError('Question count must be between 1 and 50.')
      return
    }
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
          reportUserIds: Array.from(reportUserIds),
          clientTemplateId: context?.clientTemplateId,
          monthlyAssessmentId: context?.monthlyAssessmentId,
        }
        if (candidate.external) payload.candidateId = candidate.id
        else payload.userId = candidate.id
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
            <input id="schedule-question-count" type="number" min="1" max="50" value={questionCount} onChange={event => setQuestionCount(Number(event.target.value))} style={{ width: 140, padding: '9px 12px', border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--bg-surface)', fontFamily: 'inherit' }} />
            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--fg-muted)' }}>1-50 questions</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-muted)' }}>
            Each scheduled interview is a single attempt and generates one report.
          </p>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border-default)', borderRadius: 8, padding: '8px 11px' }}>
            <Search size={14} color="var(--fg-subtle)" />
            <input value={candidateQuery} onChange={event => setCandidateQuery(event.target.value)} placeholder="Search anyone in your organization..." style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 13 }} />
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: 10 }}>
            {visibleCandidates.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>No candidates available.</div>
            ) : visibleCandidates.map(candidate => {
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
            <label htmlFor="schedule-report-users" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', marginBottom: 6 }}>
              Report recipients
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {selectedReportUsers.map(user => {
                const locked = Number(user.id) === managerId
                return (
                  <span key={user.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 8px', borderRadius: 999, background: locked ? 'var(--brand-50)' : 'var(--bg-surface-alt)', color: locked ? 'var(--brand-700)' : 'var(--fg-body)', fontSize: 12, fontWeight: 600 }}>
                    {user.first_name} {user.last_name}{locked ? ' (you)' : ''}
                    {!locked && <button type="button" onClick={() => removeReportUser(user.id)} aria-label={`Remove ${user.first_name}`} style={{ border: 0, background: 'transparent', padding: 0, display: 'inline-flex', cursor: 'pointer', color: 'inherit' }}><X size={12} /></button>}
                  </span>
                )
              })}
            </div>
            <div style={{ position: 'relative' }}>
              <input id="schedule-report-users" value={reportQuery} onChange={event => setReportQuery(event.target.value)} placeholder="Type initials, name, or email..." style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid var(--border-default)', borderRadius: 8, fontFamily: 'inherit' }} />
              {reportQuery.trim() && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20, maxHeight: 180, overflowY: 'auto', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, boxShadow: '0 10px 24px rgba(15,23,42,0.12)' }}>
                  {reportSuggestions.length === 0 ? (
                    <div style={{ padding: 10, fontSize: 12, color: 'var(--fg-muted)' }}>No organization members found.</div>
                  ) : reportSuggestions.map(user => (
                    <button key={user.id} type="button" onClick={() => addReportUser(user)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 11px', border: 0, borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface)', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)' }}>{user.first_name} {user.last_name}</span>
                      <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{user.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--fg-muted)' }}>You are always included and cannot be removed.</p>
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
