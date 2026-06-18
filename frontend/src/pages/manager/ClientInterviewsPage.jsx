import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Calendar,
  FileText,
  Mail,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react'
import Avatar from '../../components/shared/Avatar'
import Button from '../../components/shared/Button'
import EmptyState from '../../components/shared/EmptyState'
import ErrorMessage from '../../components/shared/ErrorMessage'
import Modal from '../../components/shared/Modal'
import Spinner from '../../components/shared/Spinner'
import * as api from '../../services/api'
import { formatDate, parseStoredArray } from '../../utils/helpers'

const parseTags = parseStoredArray

function Field({ label, help, full = false, children }) {
  return (
    <div className={`form-field${full ? ' form-field--full' : ''}`}>
      <span className="form-label">{label}</span>
      {children}
      {help && <span className="form-help">{help}</span>}
    </div>
  )
}

function CreateMandateModal({ open, onClose, onCreated }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    requirements: '',
    headcount: 1,
    jdText: '',
    customInfo: '',
  })
  const [tags, setTags] = useState([])
  const [customTag, setCustomTag] = useState('')
  const [fileName, setFileName] = useState('')
  const [extractingFile, setExtractingFile] = useState(false)
  const [extractingTags, setExtractingTags] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setStep(1)
    setForm({
      clientName: '',
      clientEmail: '',
      requirements: '',
      headcount: 1,
      jdText: '',
      customInfo: '',
    })
    setTags([])
    setCustomTag('')
    setFileName('')
    setError(null)
  }, [open])

  function update(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function readJdFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setExtractingFile(true)
    setError(null)
    try {
      const response = await api.extractTextFromFile(file)
      const text = response.data?.text || ''
      if (!text.trim()) throw new Error('No readable text was found in this document.')
      update('jdText', text)
      setFileName(file.name)
    } catch (readError) {
      setError(readError.message || 'Could not read the JD document.')
    } finally {
      setExtractingFile(false)
    }
  }

  async function continueToTags() {
    if (!form.clientName.trim()) {
      setError('Client name is required.')
      return
    }
    if (!form.requirements.trim()) {
      setError('Subject or role is required.')
      return
    }

    setExtractingTags(true)
    setError(null)
    try {
      if (form.jdText.trim()) {
        const response = await api.extractTemplateTags(form.jdText)
        setTags(Array.isArray(response.data) ? response.data : [])
      }
      setStep(2)
    } catch {
      setStep(2)
    } finally {
      setExtractingTags(false)
    }
  }

  function addTag() {
    const nextTag = customTag.trim()
    if (nextTag && !tags.includes(nextTag)) setTags(current => [...current, nextTag])
    setCustomTag('')
  }

  async function saveMandate() {
    setSaving(true)
    setError(null)
    try {
      await api.createClientTemplate({
        client_name: form.clientName.trim(),
        client_email: form.clientEmail.trim() || null,
        requirements: form.requirements.trim(),
        headcount: Number(form.headcount) || 1,
        jd_text: form.jdText.trim(),
        custom_info: form.customInfo.trim() || null,
        tags: JSON.stringify(tags),
      })
      await onCreated()
      onClose()
    } catch (saveError) {
      setError(saveError.message || 'Could not save the mandate.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create client mandate" size="lg">
      <div className="workspace-stack">
        <div className="workspace-tabs" aria-label="Mandate creation progress">
          <button type="button" className={`workspace-tabs__button${step === 1 ? ' is-active' : ''}`} onClick={() => setStep(1)}>
            1. Mandate details
          </button>
          <button type="button" className={`workspace-tabs__button${step === 2 ? ' is-active' : ''}`} onClick={() => form.clientName.trim() && setStep(2)}>
            2. Matching skills
          </button>
        </div>

        {step === 1 ? (
          <div className="form-grid">
            <Field label="Client name">
              <input className="form-input" value={form.clientName} onChange={event => update('clientName', event.target.value)} placeholder="Client company name" />
            </Field>
            <Field label="Client email" help="Optional contact for the mandate.">
              <input className="form-input" type="email" value={form.clientEmail} onChange={event => update('clientEmail', event.target.value)} placeholder="contact@client.com" />
            </Field>
            <Field label="Subject or role" full>
              <input className="form-input" value={form.requirements} onChange={event => update('requirements', event.target.value)} placeholder="Role or mandate title" />
            </Field>
            <Field label="Required headcount">
              <input className="form-input" type="number" min="1" value={form.headcount} onChange={event => update('headcount', event.target.value)} />
            </Field>
            <Field label="Job description source" help="Paste the JD below or upload PDF, DOC, DOCX, or TXT.">
              <input id="client-jd-file" type="file" accept=".pdf,.doc,.docx,.txt" onChange={readJdFile} style={{ display: 'none' }} />
              <label htmlFor="client-jd-file" className="product-button product-button--secondary product-button--md" style={{ alignSelf: 'flex-start', cursor: extractingFile ? 'wait' : 'pointer' }}>
                <Upload size={14} />
                {extractingFile ? 'Reading document...' : 'Upload JD file'}
              </label>
              {fileName && <span className="form-help">{fileName}</span>}
            </Field>
            <Field label="Job description" full>
              <textarea className="form-input" rows={9} value={form.jdText} onChange={event => update('jdText', event.target.value)} placeholder="Paste the client JD here..." style={{ resize: 'vertical' }} />
            </Field>
            <Field label="Internal notes" full help="Visible to managers, not candidates.">
              <textarea className="form-input" rows={4} value={form.customInfo} onChange={event => update('customInfo', event.target.value)} placeholder="Interview process, client expectations, or other context..." style={{ resize: 'vertical' }} />
            </Field>
          </div>
        ) : (
          <div className="workspace-stack" style={{ gap: 16 }}>
            <div className="workspace-section-heading">
              <div>
                <h3 style={{ fontSize: 16 }}>Review matching skills</h3>
                <p>Tag matches are recommended first, but managers can select anyone in the organization.</p>
              </div>
              <Sparkles size={20} color="var(--brand-500)" />
            </div>
            <div className="tag-list" style={{ minHeight: 34 }}>
              {tags.length === 0 && <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>No tags extracted. Add skills manually.</span>}
              {tags.map(tag => (
                <span className="tag" key={tag}>
                  {tag}
                  <button type="button" onClick={() => setTags(current => current.filter(item => item !== tag))} style={{ display: 'inline-flex', marginLeft: 5, border: 0, background: 'transparent', color: 'inherit' }}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                value={customTag}
                onChange={event => setCustomTag(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addTag()
                  }
                }}
                placeholder="Add a skill tag"
              />
              <Button variant="secondary" onClick={addTag}>Add</Button>
            </div>
          </div>
        )}

        {error && <div style={{ padding: 11, borderRadius: 8, background: 'var(--danger-50)', color: 'var(--danger-700)', fontSize: 12 }}>{error}</div>}

        <div className="form-actions">
          <Button variant="secondary" onClick={step === 1 ? onClose : () => setStep(1)}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step === 1 ? (
            <Button onClick={continueToTags} loading={extractingTags}>Review skills</Button>
          ) : (
            <Button onClick={saveMandate} loading={saving}>Save mandate</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function ScheduleMandateModal({ open, onClose, onDone, template, candidateIds, members }) {
  const [mode, setMode] = useState('simple')
  const [difficulty, setDifficulty] = useState('medium')
  const [questionCount, setQuestionCount] = useState(10)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  async function sendInvites() {
    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 50) {
      setError('Question count must be between 1 and 50.')
      return
    }
    setSending(true)
    setError(null)
    try {
      await Promise.all(candidateIds.map(teamMemberId => {
        const member = members.find(item => Number(item.id || item.team_member_id) === Number(teamMemberId))
        return api.createSchedule({
          ...(member?.user_id ? { userId: member.user_id } : { teamMemberId }),
          type: 'ai_voice',
          interviewMode: mode,
          difficulty,
          questionCount,
          clientTemplateId: template.id,
        })
      }))
      await onDone?.()
      onClose()
    } catch (sendError) {
      setError(sendError.message || 'Could not schedule interviews.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Schedule mandate interviews" size="md">
      <div className="workspace-stack">
        <div className="detail-facts">
          <div className="detail-fact">
            <div className="detail-fact__label">Candidates</div>
            <div className="detail-fact__value">{candidateIds.length}</div>
          </div>
          <div className="detail-fact">
            <div className="detail-fact__label">Client</div>
            <div className="detail-fact__value">{template.client_name}</div>
          </div>
          <div className="detail-fact">
            <div className="detail-fact__label">Role</div>
            <div className="detail-fact__value">{template.requirements}</div>
          </div>
        </div>
        <div className="form-grid">
          <Field label="Interview mode">
            <select className="form-input" value={mode} onChange={event => setMode(event.target.value)}>
              <option value="simple">Simple</option>
              <option value="adaptive">Adaptive</option>
            </select>
          </Field>
          <Field label="Difficulty">
            <select className="form-input" value={difficulty} onChange={event => setDifficulty(event.target.value)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
          <Field label="Number of questions" full help="The candidate UI and AI flow use this dynamic value.">
            <input className="form-input" type="number" min="1" max="50" value={questionCount} onChange={event => setQuestionCount(Number(event.target.value))} />
          </Field>
        </div>
        {error && <ErrorMessage message={error} />}
        <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={sendInvites} loading={sending}>
            <Calendar size={15} />
            Schedule {candidateIds.length}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function EditMandateModal({ open, template, onClose, onSaved }) {
  const [form, setForm] = useState({})
  const [tags, setTags] = useState([])
  const [customTag, setCustomTag] = useState('')
  const [saving, setSaving] = useState(false)
  const [readingFile, setReadingFile] = useState(false)
  const [extractingTags, setExtractingTags] = useState(false)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm({
      client_name: template.client_name || '',
      client_email: template.client_email || '',
      requirements: template.requirements || '',
      headcount: template.headcount || 1,
      jd_text: template.jd_text || '',
      custom_info: template.custom_info || '',
    })
    setTags(parseTags(template.tags))
    setCustomTag('')
    setFileName('')
    setError(null)
  }, [open, template])

  async function readFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setReadingFile(true)
    try {
      const response = await api.extractTextFromFile(file)
      const text = response.data?.text || ''
      if (!text.trim()) throw new Error('No readable text was found in this document.')
      setForm(current => ({ ...current, jd_text: text }))
      setFileName(file.name)
    } catch (readError) {
      setError(readError.message || 'Could not read the JD document.')
    } finally {
      setReadingFile(false)
    }
  }

  function addTag() {
    const nextTag = customTag.trim()
    if (nextTag && !tags.some(tag => tag.toLowerCase() === nextTag.toLowerCase())) {
      setTags(current => [...current, nextTag])
    }
    setCustomTag('')
  }

  async function regenerateTags() {
    const jd = String(form.jd_text || '').trim()
    if (!jd) {
      setError('Add a job description before regenerating skills.')
      return
    }
    setExtractingTags(true)
    setError(null)
    try {
      const response = await api.extractTemplateTags(jd)
      setTags(Array.isArray(response.data) ? response.data : [])
    } catch (tagError) {
      setError(tagError.message || 'Could not regenerate matching skills.')
    } finally {
      setExtractingTags(false)
    }
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const response = await api.updateClientTemplate(template.id, {
        ...form,
        tags: JSON.stringify(tags),
      })
      onSaved(response.data || { ...template, ...form })
    } catch (saveError) {
      setError(saveError.message || 'Could not update the mandate.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit client mandate" size="lg">
      <div className="workspace-stack">
        <div className="form-grid">
          <Field label="Client name">
            <input className="form-input" value={form.client_name || ''} onChange={event => setForm(current => ({ ...current, client_name: event.target.value }))} />
          </Field>
          <Field label="Client email">
            <input className="form-input" type="email" value={form.client_email || ''} onChange={event => setForm(current => ({ ...current, client_email: event.target.value }))} />
          </Field>
          <Field label="Subject or role" full>
            <input className="form-input" value={form.requirements || ''} onChange={event => setForm(current => ({ ...current, requirements: event.target.value }))} />
          </Field>
          <Field label="Headcount">
            <input className="form-input" type="number" min="1" value={form.headcount || 1} onChange={event => setForm(current => ({ ...current, headcount: Number(event.target.value) }))} />
          </Field>
          <Field label="Replace JD from file">
            <input id="edit-client-jd-file" type="file" accept=".pdf,.doc,.docx,.txt" onChange={readFile} style={{ display: 'none' }} />
            <label htmlFor="edit-client-jd-file" className="product-button product-button--secondary product-button--md" style={{ alignSelf: 'flex-start' }}>
              <Upload size={14} />
              {readingFile ? 'Reading...' : 'Choose document'}
            </label>
            {fileName && <span className="form-help">{fileName}</span>}
          </Field>
          <Field label="Job description" full>
            <textarea className="form-input" rows={9} value={form.jd_text || ''} onChange={event => setForm(current => ({ ...current, jd_text: event.target.value }))} style={{ resize: 'vertical' }} />
          </Field>
          <Field label="Internal notes" full>
            <textarea className="form-input" rows={4} value={form.custom_info || ''} onChange={event => setForm(current => ({ ...current, custom_info: event.target.value }))} style={{ resize: 'vertical' }} />
          </Field>
          <div className="form-field form-field--full">
            <div className="workspace-section-heading" style={{ marginBottom: 8 }}>
              <div>
                <h3 style={{ fontSize: 15 }}>Matching skills</h3>
                <p>Stored on this mandate and used for recommendations.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={regenerateTags} loading={extractingTags}>
                <Sparkles size={13} />
                Regenerate
              </Button>
            </div>
            <div className="tag-list" style={{ minHeight: 30 }}>
              {tags.length === 0 && <span className="form-help">No matching skills saved yet.</span>}
              {tags.map(tag => (
                <span className="tag" key={tag}>
                  {tag}
                  <button type="button" onClick={() => setTags(current => current.filter(item => item !== tag))} style={{ display: 'inline-flex', marginLeft: 5, border: 0, background: 'transparent', color: 'inherit' }}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                className="form-input"
                value={customTag}
                onChange={event => setCustomTag(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addTag()
                  }
                }}
                placeholder="Add a skill tag"
              />
              <Button variant="secondary" onClick={addTag}>Add</Button>
            </div>
          </div>
        </div>
        {error && <ErrorMessage message={error} />}
        <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>Save changes</Button>
        </div>
      </div>
    </Modal>
  )
}

function MandateDetail({ initialTemplate, onBack }) {
  const [template, setTemplate] = useState(initialTemplate)
  const [tab, setTab] = useState('overview')
  const [members, setMembers] = useState([])
  const [assignments, setAssignments] = useState([])
  const [reports, setReports] = useState([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [query, setQuery] = useState('')
  const [memberLimit, setMemberLimit] = useState(30)
  const [message, setMessage] = useState(null)
  const [sendingJd, setSendingJd] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const tags = parseTags(template.tags)

  const loadCandidates = useCallback(async () => {
    setLoadingCandidates(true)
    try {
      const [memberResponse, assignmentResponse] = await Promise.all([
        api.getTemplateMatches(template.id),
        api.getTemplateAssignments(template.id),
      ])
      setMembers(memberResponse.data || [])
      setAssignments(assignmentResponse.data || [])
    } catch {
      setMembers([])
      setAssignments([])
    } finally {
      setLoadingCandidates(false)
    }
  }, [template.id])

  useEffect(() => {
    if (tab === 'candidates') void loadCandidates()
  }, [tab, loadCandidates])

  useEffect(() => {
    if (tab !== 'reports') return
    async function loadReports() {
      try {
        const response = await api.getTeamReports('client')
        setReports((response.data?.reports || []).filter(
          report => Number(report.client_template_id) === Number(template.id)
        ))
      } catch {
        setReports([])
      }
    }
    void loadReports()
  }, [tab, template.id])

  const visibleMembers = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return members
    return members.filter(member => {
      const name = `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase()
      return name.includes(normalized)
        || String(member.email || '').toLowerCase().includes(normalized)
        || String(member.current_position || '').toLowerCase().includes(normalized)
    })
  }, [members, query])
  const displayedMembers = visibleMembers.slice(0, memberLimit)

  useEffect(() => {
    setMemberLimit(30)
  }, [query, template.id])

  async function sendJd() {
    if (selectedIds.length === 0) return
    setSendingJd(true)
    setMessage(null)
    try {
      const userIds = members
        .filter(member => selectedIds.includes(member.id))
        .map(member => member.user_id)
        .filter(Boolean)
      const response = await api.sendJDToTeam(template.id, { userIds })
      setMessage(`JD sent to ${response.data?.sent || selectedIds.length} candidate${selectedIds.length === 1 ? '' : 's'}.`)
      setSelectedIds([])
    } catch (sendError) {
      setMessage(sendError.message || 'Could not send the JD.')
    } finally {
      setSendingJd(false)
    }
  }

  async function cancelAssignment(assignment) {
    const name = `${assignment.candidate_first || ''} ${assignment.candidate_last || ''}`.trim()
    if (!window.confirm(`Cancel the scheduled interview for ${name}?`)) return
    setCancellingId(assignment.id)
    try {
      await api.cancelTemplateAssignment(template.id, assignment.id)
      await loadCandidates()
      setMessage(`Scheduled interview for ${name} was cancelled.`)
    } catch (cancelError) {
      setMessage(cancelError.message || 'Could not cancel the interview.')
    } finally {
      setCancellingId(null)
    }
  }

  function toggleMember(id) {
    setSelectedIds(current => current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id])
  }

  return (
    <div className="workspace-page workspace-stack">
      <div className="detail-header">
        <div className="detail-header__identity">
          <button type="button" className="detail-header__back" onClick={onBack}>
            <ArrowLeft size={15} />
            Mandates
          </button>
          <div className="detail-header__title">
            <h2>{template.client_name}</h2>
            <p>{template.requirements || 'Client hiring mandate'}</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit mandate</Button>
      </div>

      <div className="workspace-tabs" aria-label="Mandate sections" style={{ alignSelf: 'flex-start' }}>
        {[
          ['overview', 'Overview'],
          ['jd', 'Job description'],
          ['candidates', 'Candidates'],
          ['reports', 'Reports'],
        ].map(([id, label]) => (
          <button key={id} type="button" className={`workspace-tabs__button${tab === id ? ' is-active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="workspace-panel detail-panel">
        {tab === 'overview' && (
          <div className="workspace-stack">
            <div className="detail-facts">
              {[
                ['Client', template.client_name],
                ['Subject / role', template.requirements || 'Not set'],
                ['Headcount', template.headcount || 1],
                ['Client email', template.client_email || 'Not provided'],
                ['Created', formatDate(template.created)],
                ['Matching skills', tags.length],
              ].map(([label, value]) => (
                <div className="detail-fact" key={label}>
                  <div className="detail-fact__label">{label}</div>
                  <div className="detail-fact__value">{value}</div>
                </div>
              ))}
            </div>

            {template.custom_info && (
              <section>
                <div className="workspace-section-heading" style={{ marginBottom: 9 }}>
                  <div><h3 style={{ fontSize: 15 }}>Internal notes</h3><p>Context available to managers.</p></div>
                </div>
                <div style={{ padding: 15, borderRadius: 9, background: 'var(--slate-50)', color: 'var(--fg-body)', fontSize: 13, lineHeight: 1.65 }}>
                  {template.custom_info}
                </div>
              </section>
            )}

            <section>
              <div className="workspace-section-heading" style={{ marginBottom: 9 }}>
                <div><h3 style={{ fontSize: 15 }}>Matching skills</h3><p>Recommendations use these tags, without limiting manual selection.</p></div>
              </div>
              {tags.length > 0 ? (
                <div className="tag-list">{tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div>
              ) : (
                <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>No matching skills defined.</span>
              )}
            </section>
          </div>
        )}

        {tab === 'jd' && (
          template.jd_text ? (
            <div className="workspace-stack" style={{ gap: 14 }}>
              <div className="workspace-section-heading">
                <div><h3 style={{ fontSize: 16 }}>Job description</h3><p>Used for matching, communication, and AI interview context.</p></div>
                <FileText size={20} color="var(--brand-500)" />
              </div>
              <div style={{ padding: 18, border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--slate-50)', color: 'var(--fg-body)', fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                {template.jd_text}
              </div>
            </div>
          ) : <EmptyState message="No JD text attached. Edit the mandate to paste text or upload a document." />
        )}

        {tab === 'candidates' && (
          loadingCandidates ? <Spinner center /> : (
            <div className="workspace-stack">
              {message && <div style={{ padding: 11, borderRadius: 8, background: 'var(--success-50)', color: 'var(--success-700)', fontSize: 12 }}>{message}</div>}

              <div className="workspace-section-heading">
                <div>
                  <h3 style={{ fontSize: 16 }}>Candidate assignment</h3>
                  <p>Recommended tag matches appear first. Any organization member can still be selected.</p>
                </div>
                {selectedIds.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <Button variant="secondary" onClick={sendJd} loading={sendingJd}>
                      <Mail size={14} />
                      Send JD ({selectedIds.length})
                    </Button>
                    <Button onClick={() => setScheduleOpen(true)}>
                      <Calendar size={14} />
                      Schedule ({selectedIds.length})
                    </Button>
                  </div>
                )}
              </div>

              {assignments.length > 0 && (
                <section>
                  <div className="workspace-section-heading" style={{ marginBottom: 10 }}>
                    <div><h3 style={{ fontSize: 15 }}>Interview history</h3><p>Completed records remain available after scheduling.</p></div>
                  </div>
                  <div className="assignment-list">
                    {assignments.map(assignment => {
                      const name = `${assignment.candidate_first || ''} ${assignment.candidate_last || ''}`.trim()
                      return (
                        <div className="assignment-row" key={assignment.id}>
                          <Avatar name={name} size={30} />
                          <div className="assignment-row__content">
                            <strong>{name}</strong>
                            <span>{assignment.candidate_email} | {assignment.question_count} questions | {formatDate(assignment.created)}</span>
                          </div>
                          <span className={`status-pill${assignment.status === 'completed' ? ' status-pill--success' : assignment.status === 'cancelled' ? ' status-pill--danger' : ' status-pill--brand'}`}>
                            {assignment.status}
                          </span>
                          {assignment.status === 'scheduled' && (
                            <button type="button" className="danger-icon-button" disabled={cancellingId === assignment.id} onClick={() => cancelAssignment(assignment)} aria-label={`Cancel ${name}'s interview`}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              <div className="workspace-search" style={{ width: '100%' }}>
                <Search size={15} />
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search anyone in the organization..." />
              </div>

              <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
                {visibleMembers.filter(member => member.recommended).length} recommended by tags, {visibleMembers.length} organization members shown
              </div>

              {visibleMembers.length === 0 ? (
                <EmptyState message="No organization members match this search." />
              ) : (
                <div className="workspace-grid">
                  {displayedMembers.map(member => {
                    const name = `${member.first_name || ''} ${member.last_name || ''}`.trim()
                    const selected = selectedIds.includes(member.id)
                    return (
                      <button
                        type="button"
                        className="workspace-card"
                        key={member.id}
                        onClick={() => toggleMember(member.id)}
                        style={{
                          borderColor: selected ? 'var(--brand-400)' : undefined,
                          background: selected ? 'var(--brand-50)' : undefined,
                        }}
                      >
                        <div className="workspace-card__body" style={{ padding: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <input type="checkbox" checked={selected} readOnly style={{ accentColor: 'var(--brand-500)' }} />
                            <Avatar name={name} size={34} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <strong style={{ display: 'block', overflow: 'hidden', color: 'var(--fg-primary)', fontSize: 13, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</strong>
                              <span style={{ display: 'block', overflow: 'hidden', marginTop: 3, color: 'var(--fg-muted)', fontSize: 11, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.current_position || member.email}</span>
                            </div>
                            <span className={`status-pill${member.recommended ? ' status-pill--success' : ''}`}>
                              {member.recommended ? `${member.match_score} matches` : 'Available'}
                            </span>
                          </div>
                          {(member.matched_tags || []).length > 0 && (
                            <div className="tag-list" style={{ marginTop: 12 }}>
                              {member.matched_tags.slice(0, 4).map(tag => <span className="tag" key={tag}>{tag}</span>)}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              {visibleMembers.length > memberLimit && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Button variant="secondary" onClick={() => setMemberLimit(current => current + 30)}>
                    Show 30 more
                  </Button>
                </div>
              )}
            </div>
          )
        )}

        {tab === 'reports' && (
          reports.length === 0 ? (
            <EmptyState message="Reports for this mandate will appear after interviews are completed." />
          ) : (
            <div className="assignment-list">
              {reports.map(report => (
                <div className="assignment-row" key={report.id}>
                  <Avatar name={`${report.candidate_first || ''} ${report.candidate_last || ''}`.trim()} size={30} />
                  <div className="assignment-row__content">
                    <strong>{report.candidate_first} {report.candidate_last}</strong>
                    <span>Overall score: {report.overall_score ?? 'Not scored'}</span>
                  </div>
                  <span className={`status-pill${report.decision === 'pass' ? ' status-pill--success' : ' status-pill--warning'}`}>
                    {report.decision || 'Review'}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <EditMandateModal
        open={editOpen}
        template={template}
        onClose={() => setEditOpen(false)}
        onSaved={updated => {
          setTemplate(updated)
          setEditOpen(false)
        }}
      />
      <ScheduleMandateModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onDone={loadCandidates}
        template={template}
        candidateIds={selectedIds}
        members={members}
      />
    </div>
  )
}

function ClientInterviewsPage() {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.getClientTemplates()
      setTemplates(response.data || [])
    } catch (loadError) {
      setError(loadError.message || 'Could not load client mandates.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const visibleTemplates = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return templates
    return templates.filter(template => (
      String(template.client_name || '').toLowerCase().includes(normalized)
      || String(template.requirements || '').toLowerCase().includes(normalized)
      || String(template.client_email || '').toLowerCase().includes(normalized)
      || parseTags(template.tags).join(' ').toLowerCase().includes(normalized)
    ))
  }, [query, templates])

  if (selectedTemplate) {
    return (
      <MandateDetail
        initialTemplate={selectedTemplate}
        onBack={() => {
          setSelectedTemplate(null)
          void load()
        }}
      />
    )
  }

  return (
    <div className="workspace-page workspace-stack">
      <div className="workspace-section-heading">
        <div className="workspace-intro">
          <h2>Client mandate library</h2>
          <p>Review every active client requirement, then open a mandate to manage its JD, candidates, and interviews.</p>
        </div>
      </div>

      <div className="workspace-toolbar">
        <div className="workspace-search">
          <Search size={16} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search clients, roles, or skills..." />
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus size={15} />
          New mandate
        </Button>
      </div>

      {loading && <Spinner center />}
      {error && <ErrorMessage message={error} />}
      {!loading && !error && templates.length === 0 && (
        <div className="workspace-panel">
          <EmptyState message="No client mandates yet. Create one to begin matching organization members." />
        </div>
      )}
      {!loading && !error && templates.length > 0 && visibleTemplates.length === 0 && (
        <div className="workspace-panel">
          <EmptyState message="No client mandates match this search." />
        </div>
      )}
      {!loading && !error && visibleTemplates.length > 0 && (
        <div className="workspace-grid workspace-grid--wide">
          {visibleTemplates.map(template => {
            const tags = parseTags(template.tags)
            return (
              <button type="button" className="workspace-card" key={template.id} onClick={() => setSelectedTemplate(template)}>
                <div className="workspace-card__body">
                  <div className="workspace-card__topline">
                    <div className="workspace-card__icon"><BriefcaseBusiness size={20} /></div>
                    <span className="status-pill status-pill--brand">{template.headcount || 1} needed</span>
                  </div>
                  <div style={{ marginTop: 18 }}>
                    <div className="workspace-card__eyebrow">{template.client_name}</div>
                    <h3 className="workspace-card__title">{template.requirements || 'Role not specified'}</h3>
                    <p className="workspace-card__subtitle">
                      {template.custom_info || 'Open this mandate to review the job description and candidate workflow.'}
                    </p>
                  </div>
                  <div className="workspace-card__meta">
                    <span><Mail size={13} /> {template.client_email || 'No client email'}</span>
                    <span><Users size={13} /> {template.headcount || 1} positions</span>
                    <span><FileText size={13} /> {template.jd_text ? 'JD ready' : 'JD missing'}</span>
                  </div>
                  {tags.length > 0 && (
                    <div className="tag-list" style={{ marginTop: 15 }}>
                      {tags.slice(0, 4).map(tag => <span className="tag" key={tag}>{tag}</span>)}
                      {tags.length > 4 && <span className="tag">+{tags.length - 4}</span>}
                    </div>
                  )}
                  <div className="workspace-card__footer">
                    <span className="workspace-card__link">Open mandate <ArrowRight size={13} /></span>
                    <span style={{ color: 'var(--fg-subtle)', fontSize: 11 }}>{formatDate(template.created)}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <CreateMandateModal open={wizardOpen} onClose={() => setWizardOpen(false)} onCreated={load} />
    </div>
  )
}

export default ClientInterviewsPage
