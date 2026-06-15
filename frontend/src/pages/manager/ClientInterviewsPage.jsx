import { useState, useEffect, useCallback } from 'react'
import { Plus, LayoutTemplate, Sparkles, X, Download, Send, Calendar, Upload, Search, Trash2 } from 'lucide-react'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import Avatar from '../../components/shared/Avatar'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

// ── Create Template Wizard ────────────────────────────────────
function WizardModal({ open, onClose, onCreated }) {
  const [step, setStep]                   = useState(1)
  const [clientName, setClientName]       = useState('')
  const [clientEmail, setClientEmail]     = useState('')
  const [requirements, setRequirements]   = useState('')
  const [headcount, setHeadcount]         = useState('')
  const [jdText, setJdText]               = useState('')
  const [customInfo, setCustomInfo]       = useState('')
  const [extractedTags, setExtractedTags] = useState([])
  const [customTag, setCustomTag]         = useState('')
  const [extracting, setExtracting]       = useState(false)
  const [extractingJd, setExtractingJd]   = useState(false)
  const [jdFileName, setJdFileName]       = useState('')
  const [saving, setSaving]               = useState(false)
  const [saveError, setSaveError]         = useState(null)

  function reset() {
    setStep(1); setClientName(''); setClientEmail(''); setRequirements('')
    setHeadcount(''); setJdText(''); setCustomInfo(''); setExtractedTags([])
    setCustomTag(''); setJdFileName(''); setSaveError(null)
  }

  function handleClose() { reset(); onClose() }

  async function handleJdFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setExtractingJd(true)
    setSaveError(null)
    try {
      const response = await api.extractTextFromFile(file)
      const text = response.data?.text || ''
      if (!text.trim()) throw new Error('No readable text was found in this file')
      setJdText(text)
      setJdFileName(file.name)
    } catch (error) {
      setSaveError(error.message || 'Could not read the JD file')
    } finally {
      setExtractingJd(false)
    }
  }

  async function handleExtract() {
    if (!clientName.trim()) { setSaveError('Client name is required'); return }
    setExtracting(true)
    setSaveError(null)
    try {
      if (jdText.trim()) {
        const res = await api.extractTemplateTags(jdText)
        setExtractedTags(Array.isArray(res.data) ? res.data : [])
      }
    } catch { /* tags optional */ }
    finally { setExtracting(false) }
    setStep(2)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await api.createClientTemplate({
        client_name:  clientName.trim(),
        client_email: clientEmail.trim() || null,
        requirements: requirements.trim(),
        headcount:    headcount ? parseInt(headcount, 10) : 1,
        jd_text:      jdText.trim(),
        custom_info:  customInfo.trim() || null,
        tags:         JSON.stringify(extractedTags),
      })
      reset()
      onCreated()
      onClose()
    } catch (err) {
      setSaveError(err.message || 'Could not save template')
    } finally {
      setSaving(false)
    }
  }

  function removeTag(t) { setExtractedTags(prev => prev.filter(x => x !== t)) }
  function addCustomTag() {
    const t = customTag.trim()
    if (t && !extractedTags.includes(t)) setExtractedTags(prev => [...prev, t])
    setCustomTag('')
  }

  if (!open) return null
  const inp = { padding: '9px 12px', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }

  return (
    <Modal open={open} onClose={handleClose} title={step === 1 ? 'New Client Mandate' : 'Review AI Tags'} size="md">
      <div style={{ padding: '10px 0' }}>
        {step === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 4 }}>Client Name *</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Infosys, TCS…" style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 4 }}>Client Email <span style={{ fontWeight: 400, color: 'var(--fg-muted)' }}>(optional)</span></label>
                <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} type="email" placeholder="hr@client.com" style={inp} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 4 }}>Subject / Role Required</label>
              <input value={requirements} onChange={e => setRequirements(e.target.value)} placeholder="e.g. Senior React Developer" style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 4 }}>Headcount</label>
              <input value={headcount} onChange={e => setHeadcount(e.target.value)} type="number" min="1" placeholder="1" style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 4 }}>Client JD <span style={{ fontWeight: 400, color: 'var(--fg-muted)' }}>(paste text or upload a document)</span></label>
              <textarea value={jdText} onChange={e => setJdText(e.target.value)} placeholder="Paste the client JD here for AI tag extraction and candidate matching…" style={{ ...inp, height: 120, resize: 'vertical' }} />
              <input id="client-jd-file" type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleJdFile} style={{ display: 'none' }} />
              <label htmlFor="client-jd-file" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '7px 10px', border: '1px solid var(--border-default)', borderRadius: 7, cursor: extractingJd ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)' }}>
                <Upload size={13} /> {extractingJd ? 'Reading document...' : 'Upload PDF, DOC, DOCX, or TXT'}
              </label>
              {jdFileName && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--fg-muted)' }}>{jdFileName}</span>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 4 }}>Custom Info <span style={{ fontWeight: 400, color: 'var(--fg-muted)' }}>(optional notes for the team)</span></label>
              <textarea value={customInfo} onChange={e => setCustomInfo(e.target.value)} placeholder="Any additional notes, client expectations, interview format details…" style={{ ...inp, height: 80, resize: 'vertical' }} />
            </div>
            {saveError && <p style={{ fontSize: 12, color: 'var(--danger-700)', margin: 0 }}>{saveError}</p>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="var(--brand-500)" />
              <p style={{ fontSize: 13, color: 'var(--fg-body)', margin: 0 }}>AI-extracted tags for team matching. Add or remove as needed.</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', minHeight: 32 }}>
              {extractedTags.map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'var(--brand-50)', color: 'var(--brand-700)', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                  {t}
                  <button type="button" onClick={() => removeTag(t)} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, color: 'var(--brand-500)', display: 'inline-flex' }}><X size={12} /></button>
                </span>
              ))}
              {extractedTags.length === 0 && <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>No tags extracted — add them manually below.</span>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={customTag} onChange={e => setCustomTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomTag())} placeholder="Add a tag…" style={{ ...inp, flex: 1 }} />
              <Button variant="secondary" onClick={addCustomTag}>Add</Button>
            </div>
            {saveError && <p style={{ fontSize: 12, color: 'var(--danger-700)', margin: 0 }}>{saveError}</p>}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <Button variant="secondary" onClick={() => step === 1 ? handleClose() : setStep(1)}>
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>
        {step === 1
          ? <Button onClick={handleExtract} disabled={extracting}>{extracting ? 'Extracting…' : 'Extract Tags ✨'}</Button>
          : <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Mandate'}</Button>
        }
      </div>
    </Modal>
  )
}

// ── Send Interview Invites Modal ──────────────────────────────
function SendInviteModal({ open, onClose, onDone, template, candidateIds, members }) {
  const [interviewMode, setMode]        = useState('simple')
  const [difficulty, setDifficulty]     = useState('medium')
  const [questionCount, setQCount]      = useState(10)
  const [sending, setSending]           = useState(false)
  const [error, setError]               = useState(null)
  const [done, setDone]                 = useState(false)

  function reset() {
    setMode('simple'); setDifficulty('medium'); setQCount(10); setSending(false)
    setError(null); setDone(false)
  }

  async function handleSend() {
    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 50) {
      setError('Question count must be between 1 and 50.')
      return
    }
    setSending(true)
    setError(null)
    try {
      await Promise.all(candidateIds.map(teamMemberId => {
        const selectedMember = members.find(member =>
          Number(member.id || member.team_member_id) === Number(teamMemberId)
        )
        return api.createSchedule({
          ...(selectedMember?.user_id
            ? { userId: selectedMember.user_id }
            : { teamMemberId }),
          type:               'ai_voice',
          interviewMode,
          difficulty,
          questionCount,
          clientTemplateId: template.id,
        })
      }))
      await onDone?.()
      setDone(true)
      setTimeout(() => { reset(); onClose() }, 1400)
    } catch (err) {
      setError(err.message || 'Could not send invites')
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  const selectedNames = members.filter(m => candidateIds.includes(m.id || m.team_member_id))
    .map(m => `${m.first_name || ''} ${m.last_name || ''}`.trim()).join(', ')

  const sectionHd = { fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }
  const pill = (val, active, onClick, label) => (
    <button type="button" onClick={onClick} style={{ padding: '6px 13px', borderRadius: 8, border: `1px solid ${active ? 'var(--brand-500)' : 'var(--border-default)'}`, background: active ? 'var(--brand-50)' : 'var(--bg-surface)', color: active ? 'var(--brand-700)' : 'var(--fg-body)', fontWeight: active ? 700 : 500, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{label || val}</button>
  )

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Send Interview Invites" size="md">
      {done ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)', margin: 0 }}>Invites sent to {candidateIds.length} candidate{candidateIds.length !== 1 ? 's' : ''}!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={{ background: 'var(--bg-surface-alt)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: 'var(--fg-primary)' }}>{candidateIds.length} candidate{candidateIds.length !== 1 ? 's' : ''}</span>
            <span style={{ color: 'var(--fg-muted)' }}> · {selectedNames || 'selected'}</span>
          </div>

          <div>
            <p style={sectionHd}>Interview mode</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {pill('simple',   interviewMode === 'simple',   () => setMode('simple'),   'Simple')}
              {pill('adaptive', interviewMode === 'adaptive', () => setMode('adaptive'), 'Adaptive')}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <p style={sectionHd}>Difficulty</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {['easy','medium','hard'].map(d => pill(d, difficulty === d, () => setDifficulty(d), d.charAt(0).toUpperCase() + d.slice(1)))}
              </div>
            </div>
            <div>
              <p style={sectionHd}>Questions</p>
              <input type="number" min="1" max="50" value={questionCount} onChange={e => setQCount(Number(e.target.value))} style={{ width: 110, padding: '7px 10px', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: 'var(--bg-surface)' }} />
            </div>
          </div>

          {error && <div style={{ marginTop: 10 }}><ErrorMessage message={error} /></div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border-default)', paddingTop: 16 }}>
            <Button variant="secondary" onClick={() => { reset(); onClose() }}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending}>
              <Calendar size={13} style={{ marginRight: 6 }} />
              {sending ? 'Sending…' : `Send to ${candidateIds.length} candidate${candidateIds.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Detail View ───────────────────────────────────────────────
function DetailView({ template: initialTemplate, onBack }) {
  const [template, setTemplate]             = useState(initialTemplate)
  const [tab, setTab]                       = useState('overview')
  const [matches, setMatches]               = useState([])
  const [matchLoading, setMatchLoading]     = useState(false)
  const [sendingJD, setSendingJD]           = useState(false)
  const [jdSentMsg, setJdSentMsg]           = useState(null)
  const [selectedIds, setSelectedIds]       = useState([])
  const [inviteOpen, setInviteOpen]         = useState(false)
  const [editing, setEditing]               = useState(false)
  const [editData, setEditData]             = useState({})
  const [savingEdit, setSavingEdit]         = useState(false)
  const [extractingEditJd, setExtractingEditJd] = useState(false)
  const [editJdFileName, setEditJdFileName] = useState('')
  const [reports, setReports]               = useState([])
  const [assignments, setAssignments]       = useState([])
  const [candidateQuery, setCandidateQuery] = useState('')
  const [cancellingId, setCancellingId]     = useState(null)

  const tags = (() => { try { return typeof template.tags === 'string' ? JSON.parse(template.tags) : (template.tags || []) } catch { return [] } })()

  useEffect(() => {
    if (tab !== 'candidates') return
    setMatchLoading(true)
    async function loadCandidates() {
      try {
        const [matchResponse, assignmentResponse] = await Promise.all([
          api.getTemplateMatches(template.id),
          api.getTemplateAssignments(template.id),
        ])
        setMatches(matchResponse.data || [])
        setAssignments(assignmentResponse.data || [])
      } catch {
        setMatches([])
        setAssignments([])
      } finally {
        setMatchLoading(false)
      }
    }
    loadCandidates()
  }, [tab, template.id])

  async function refreshAssignments() {
    const response = await api.getTemplateAssignments(template.id)
    setAssignments(response.data || [])
  }

  async function cancelAssignment(assignment) {
    const name = `${assignment.candidate_first || ''} ${assignment.candidate_last || ''}`.trim()
    if (!window.confirm(`Cancel the scheduled interview for ${name}?`)) return
    setCancellingId(assignment.id)
    setJdSentMsg(null)
    try {
      await api.cancelTemplateAssignment(template.id, assignment.id)
      await refreshAssignments()
      setJdSentMsg(`Scheduled interview for ${name} was cancelled.`)
    } catch (cancelError) {
      setJdSentMsg(cancelError.message || 'Could not cancel the scheduled interview.')
    } finally {
      setCancellingId(null)
    }
  }

  useEffect(() => {
    if (tab !== 'reports') return
    async function loadReports() {
      try {
        const r = await api.getTeamReports('client')
        const filtered = (r.data?.reports || []).filter(
          report => Number(report.client_template_id) === Number(template.id)
        )
        setReports(filtered)
      } catch {
        setReports([])
      }
    }
    loadReports()
  }, [tab, template.id])

  async function handleSendJD() {
    if (selectedIds.length === 0) return
    setSendingJD(true)
    setJdSentMsg(null)
    try {
      const userIds = matches
        .filter(member => selectedIds.includes(member.id))
        .map(member => member.user_id)
        .filter(Boolean)
      const res = await api.sendJDToTeam(template.id, { userIds })
      setJdSentMsg(`JD sent to ${res.data?.sent || selectedIds.length} candidate${selectedIds.length !== 1 ? 's' : ''}. ${res.data?.failed ? `${res.data.failed} failed.` : ''}`)
      setSelectedIds([])
    } catch {
      setJdSentMsg('Could not send JD. Please try again.')
    } finally {
      setSendingJD(false)
    }
  }

  async function handleEditJdFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setExtractingEditJd(true)
    try {
      const response = await api.extractTextFromFile(file)
      const text = response.data?.text || ''
      if (!text.trim()) throw new Error('No readable text was found in this file')
      setEditData(current => ({ ...current, jd_text: text }))
      setEditJdFileName(file.name)
    } catch (error) {
      setJdSentMsg(error.message || 'Could not read the JD file.')
    } finally {
      setExtractingEditJd(false)
    }
  }

  function toggleSelect(teamMemberId) {
    setSelectedIds(prev => prev.includes(teamMemberId)
      ? prev.filter(id => id !== teamMemberId)
      : [...prev, teamMemberId])
  }

  const tabStyle = (t) => ({
    background: 'transparent', border: 0, padding: '8px 14px', fontSize: 13,
    fontWeight: tab === t ? 700 : 500, cursor: 'pointer',
    color: tab === t ? 'var(--brand-500)' : 'var(--fg-muted)',
    borderBottom: tab === t ? '2px solid var(--brand-500)' : '2px solid transparent',
    marginBottom: -1, fontFamily: 'inherit',
  })

  const inp = { padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }
  const normalizedCandidateQuery = candidateQuery.trim().toLowerCase()
  const visibleMatches = matches.filter(member => {
    if (!normalizedCandidateQuery) return true
    const name = `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase()
    return name.includes(normalizedCandidateQuery)
      || String(member.email || '').toLowerCase().includes(normalizedCandidateQuery)
      || String(member.current_position || '').toLowerCase().includes(normalizedCandidateQuery)
  })
  const recommendedCount = visibleMatches.filter(member => member.recommended).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--fg-muted)', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>← Mandates</button>
          <span style={{ color: 'var(--border-strong)', fontSize: 13 }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{template.client_name}</span>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>{template.requirements}</span>
        </div>
        <Button variant="secondary" onClick={() => { setEditData({ client_name: template.client_name, client_email: template.client_email || '', requirements: template.requirements, headcount: template.headcount, jd_text: template.jd_text || '', custom_info: template.custom_info || '' }); setEditJdFileName(''); setEditing(true) }}>
          Edit
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-default)' }}>
        {['overview', 'jd', 'candidates', 'reports'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>
            {t === 'jd' ? 'JD' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 24 }}>
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {[
                { label: 'Client',     value: template.client_name },
                { label: 'Email',      value: template.client_email || '—' },
                { label: 'Headcount',  value: template.headcount },
                { label: 'Subject / Role', value: template.requirements },
                { label: 'Created',    value: formatDate(template.created) },
              ].map(f => (
                <div key={f.label}>
                  <p style={{ fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>{f.label}</p>
                  <p style={{ fontSize: 13, color: 'var(--fg-primary)', margin: 0, fontWeight: 600 }}>{f.value}</p>
                </div>
              ))}
            </div>
            {template.custom_info && (
              <div>
                <p style={{ fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Notes</p>
                <p style={{ fontSize: 13, color: 'var(--fg-body)', margin: 0, lineHeight: 1.6 }}>{template.custom_info}</p>
              </div>
            )}
            {tags.length > 0 && (
              <div>
                <p style={{ fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Skill Tags</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {tags.map(t => <span key={t} style={{ fontSize: 12, background: 'var(--brand-50)', color: 'var(--brand-700)', padding: '3px 8px', borderRadius: 999, fontWeight: 600 }}>{t}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'jd' && (
          template.jd_text
            ? <pre style={{ fontSize: 13, color: 'var(--fg-body)', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.7 }}>{template.jd_text}</pre>
            : <EmptyState message="No JD text attached. Edit the template to add one." />
        )}

        {tab === 'candidates' && (
          matchLoading ? <Spinner center /> : (
            <div>
              {jdSentMsg && (
                <div style={{ marginBottom: 14, padding: '9px 12px', background: 'var(--success-50)', border: '1px solid var(--success-200)', borderRadius: 8, fontSize: 13, color: 'var(--success-700)' }}>
                  {jdSentMsg}
                </div>
              )}

              {selectedIds.length > 0 && (
                <div style={{ marginBottom: 14, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onClick={handleSendJD} disabled={sendingJD}>
                    <Send size={13} style={{ marginRight: 6 }} />{sendingJD ? 'Sending…' : `Send JD to ${selectedIds.length}`}
                  </Button>
                  <Button onClick={() => setInviteOpen(true)}>
                    <Calendar size={13} style={{ marginRight: 6 }} />Schedule Interview for {selectedIds.length}
                  </Button>
                </div>
              )}

              {assignments.length > 0 && (
                <section style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
                    <h3 style={{ margin: 0, fontSize: 14, color: 'var(--fg-primary)' }}>Assigned interviews</h3>
                    <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Completed interviews are retained as history</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {assignments.map(assignment => {
                      const name = `${assignment.candidate_first || ''} ${assignment.candidate_last || ''}`.trim()
                      const canCancel = assignment.status === 'scheduled'
                      return (
                        <div key={assignment.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 9, background: 'var(--bg-surface-alt)' }}>
                          <Avatar name={name} size="sm" />
                          <div style={{ flex: 1 }}>
                            <strong style={{ display: 'block', fontSize: 13, color: 'var(--fg-primary)' }}>{name}</strong>
                            <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                              {assignment.candidate_email} | {assignment.question_count} questions | {formatDate(assignment.created)}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: assignment.status === 'completed' ? 'var(--success-600)' : assignment.status === 'cancelled' ? 'var(--danger-600)' : 'var(--brand-600)' }}>
                            {assignment.status}
                          </span>
                          {canCancel && (
                            <button
                              type="button"
                              disabled={cancellingId === assignment.id}
                              onClick={() => cancelAssignment(assignment)}
                              title="Cancel scheduled interview"
                              style={{ border: 0, background: 'transparent', color: 'var(--danger-600)', cursor: cancellingId === assignment.id ? 'wait' : 'pointer', padding: 5, display: 'inline-flex' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px', border: '1px solid var(--border-default)', borderRadius: 8, marginBottom: 10 }}>
                <Search size={14} color="var(--fg-subtle)" />
                <input value={candidateQuery} onChange={event => setCandidateQuery(event.target.value)} placeholder="Search anyone in the organization..." style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 13 }} />
              </div>
              <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--fg-muted)' }}>
                {recommendedCount} recommended by tags | {visibleMatches.length} organization member{visibleMatches.length === 1 ? '' : 's'} available
              </div>

              {visibleMatches.length === 0 ? (
                <EmptyState message="No organization members match this search." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {visibleMatches.map(m => {
                    const name = `${m.first_name || ''} ${m.last_name || ''}`.trim()
                    const checked = selectedIds.includes(m.id)
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: `1px solid ${checked ? 'var(--brand-300)' : 'var(--border-default)'}`, borderRadius: 10, background: checked ? 'var(--brand-50)' : 'var(--bg-surface)', transition: 'all 120ms', cursor: 'pointer' }} onClick={() => toggleSelect(m.id)}>
                        <input type="checkbox" checked={checked} onChange={() => toggleSelect(m.id)} onClick={e => e.stopPropagation()} style={{ accentColor: 'var(--brand-500)' }} />
                        <Avatar name={name} size="sm" />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)', margin: 0 }}>{name}</p>
                          <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '2px 0 0' }}>{m.current_position || m.email}</p>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                            {(m.matched_tags || []).map(t => <span key={t} style={{ fontSize: 11, background: 'var(--success-50)', color: 'var(--success-700)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>{t}</span>)}
                            {!m.recommended && <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Manual selection available</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ display: 'inline-flex', padding: '3px 7px', borderRadius: 999, background: m.recommended ? 'var(--success-50)' : 'var(--bg-surface-alt)', color: m.recommended ? 'var(--success-700)' : 'var(--fg-muted)', fontSize: 10, fontWeight: 700 }}>
                            {m.recommended ? `${m.match_score} TAG MATCH${m.match_score === 1 ? '' : 'ES'}` : 'ORG MEMBER'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        )}

        {tab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reports.length === 0 ? (
              <EmptyState message="Interview reports for this client mandate will appear here once interviews are completed." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reports.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--bg-surface)' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)' }}>{r.candidate_first} {r.candidate_last}</p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--fg-muted)' }}>Score: <span style={{ fontWeight: 600, color: 'var(--brand-500)' }}>{r.overall_score}</span> · Decision: <span style={{ fontWeight: 600, color: r.decision === 'pass' ? 'var(--success-600)' : 'var(--warning-600)' }}>{r.decision}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary"><Download size={13} style={{ marginRight: 6 }} /> Export</Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit template modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Mandate" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '10px 0' }}>
          {[
            { key: 'client_name', label: 'Client Name', type: 'text' },
            { key: 'client_email', label: 'Client Email', type: 'email' },
            { key: 'requirements', label: 'Subject / Role Required', type: 'text' },
            { key: 'headcount', label: 'Headcount', type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 4 }}>{f.label}</label>
              <input type={f.type} value={editData[f.key] || ''} onChange={e => setEditData(d => ({ ...d, [f.key]: e.target.value }))} style={inp} />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 4 }}>Client JD</label>
            <textarea value={editData.jd_text || ''} onChange={e => setEditData(d => ({ ...d, jd_text: e.target.value }))} rows={6} style={{ ...inp, resize: 'vertical' }} />
            <input id="edit-client-jd-file" type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleEditJdFile} style={{ display: 'none' }} />
            <label htmlFor="edit-client-jd-file" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 7, padding: '6px 9px', border: '1px solid var(--border-default)', borderRadius: 7, cursor: extractingEditJd ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600 }}>
              <Upload size={12} /> {extractingEditJd ? 'Reading document...' : 'Replace from file'}
            </label>
            {editJdFileName && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--fg-muted)' }}>{editJdFileName}</span>}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 4 }}>Notes</label>
            <textarea value={editData.custom_info || ''} onChange={e => setEditData(d => ({ ...d, custom_info: e.target.value }))} rows={3} style={{ ...inp, resize: 'vertical' }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          <Button disabled={savingEdit} onClick={async () => {
            setSavingEdit(true)
            try {
              const response = await api.updateClientTemplate(template.id, editData)
              setTemplate(response.data || { ...template, ...editData })
              setEditing(false)
            } catch (saveError) {
              setJdSentMsg(saveError.message || 'Could not save the mandate.')
            }
            finally { setSavingEdit(false) }
          }}>{savingEdit ? 'Saving…' : 'Save'}</Button>
        </div>
      </Modal>

      <SendInviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onDone={refreshAssignments}
        template={template}
        candidateIds={selectedIds}
        members={matches}
      />
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
function ClientInterviewsPage() {
  const [wizardOpen, setWizardOpen]               = useState(false)
  const [selectedTemplate, setSelectedTemplate]   = useState(null)
  const [templates, setTemplates]                 = useState([])
  const [loading, setLoading]                     = useState(true)
  const [error, setError]                         = useState(null)
  const [query, setQuery]                         = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getClientTemplates()
      setTemplates(res.data || [])
    } catch (err) {
      setError(err.message || 'Could not load mandates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const normalizedQuery = query.trim().toLowerCase()
  const visibleTemplates = templates.filter(template => {
    if (!normalizedQuery) return true
    return String(template.client_name || '').toLowerCase().includes(normalizedQuery)
      || String(template.requirements || '').toLowerCase().includes(normalizedQuery)
      || String(template.client_email || '').toLowerCase().includes(normalizedQuery)
  })

  if (selectedTemplate) {
    return <DetailView template={selectedTemplate} onBack={() => { setSelectedTemplate(null); load() }} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 'min(420px, 100%)', padding: '8px 11px', border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--bg-surface)' }}>
          <Search size={14} color="var(--fg-subtle)" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search client or subject..." style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 13 }} />
        </div>
        <Button onClick={() => setWizardOpen(true)}><Plus size={13} style={{ marginRight: 6 }} /> New Mandate</Button>
      </div>

      {loading && <Spinner center />}
      {error && <ErrorMessage message={error} />}
      {!loading && !error && templates.length === 0 && (
        <EmptyState message="No client mandates yet. Create one to start matching team members to client requirements." />
      )}
      {!loading && !error && templates.length > 0 && visibleTemplates.length === 0 && (
        <EmptyState message="No client mandates match this client or subject." />
      )}
      {!loading && !error && visibleTemplates.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))', gap: '1rem' }}>
          {visibleTemplates.map(t => {
            const tags = (() => { try { return typeof t.tags === 'string' ? JSON.parse(t.tags) : (t.tags || []) } catch { return [] } })()
            return (
              <div key={t.id} onClick={() => setSelectedTemplate(t)}
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 18, cursor: 'pointer', transition: 'box-shadow 120ms, border-color 120ms' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = 'var(--brand-200)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'var(--border-default)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--brand-50)', color: 'var(--brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LayoutTemplate size={18} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-subtle)', background: 'var(--bg-surface-alt)', padding: '2px 8px', borderRadius: 999 }}>
                    {t.headcount} needed
                  </span>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Subject / Role</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-primary)', margin: '0 0 3px' }}>{t.requirements || '—'}</h3>
                <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '0 0 12px', fontWeight: 600 }}>{t.client_name}</p>
                {t.client_email && <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: '0 0 10px' }}>{t.client_email}</p>}
                {tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {tags.slice(0, 4).map(tag => (
                      <span key={tag} style={{ fontSize: 11, background: 'var(--bg-surface-alt)', color: 'var(--fg-body)', padding: '2px 6px', borderRadius: 4 }}>{tag}</span>
                    ))}
                    {tags.length > 4 && <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>+{tags.length - 4} more</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <WizardModal open={wizardOpen} onClose={() => setWizardOpen(false)} onCreated={load} />
    </div>
  )
}

export default ClientInterviewsPage
