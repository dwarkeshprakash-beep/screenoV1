import { useState, useEffect, useCallback } from 'react'
import { Plus, LayoutTemplate, Sparkles, X, Download, Send, Calendar, ChevronDown } from 'lucide-react'
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
  const [saving, setSaving]               = useState(false)
  const [saveError, setSaveError]         = useState(null)

  function reset() {
    setStep(1); setClientName(''); setClientEmail(''); setRequirements('')
    setHeadcount(''); setJdText(''); setCustomInfo(''); setExtractedTags([])
    setCustomTag(''); setSaveError(null)
  }

  function handleClose() { reset(); onClose() }

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
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 4 }}>Role Required</label>
              <input value={requirements} onChange={e => setRequirements(e.target.value)} placeholder="e.g. Senior React Developer" style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 4 }}>Headcount</label>
              <input value={headcount} onChange={e => setHeadcount(e.target.value)} type="number" min="1" placeholder="1" style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 4 }}>Client JD <span style={{ fontWeight: 400, color: 'var(--fg-muted)' }}>(paste full job description)</span></label>
              <textarea value={jdText} onChange={e => setJdText(e.target.value)} placeholder="Paste the client JD here for AI tag extraction and candidate matching…" style={{ ...inp, height: 120, resize: 'vertical' }} />
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
function SendInviteModal({ open, onClose, template, candidateIds, members }) {
  const [attempts, setAttempts]         = useState(1)
  const [interviewMode, setMode]        = useState('simple')
  const [difficulty, setDifficulty]     = useState('medium')
  const [questionCount, setQCount]      = useState(10)
  const [linkStrategy, setLinkStrategy] = useState('all_at_start')
  const [recurring, setRecurring]       = useState(false)
  const [sending, setSending]           = useState(false)
  const [error, setError]               = useState(null)
  const [done, setDone]                 = useState(false)

  function reset() {
    setAttempts(1); setMode('simple'); setDifficulty('medium'); setQCount(10)
    setLinkStrategy('all_at_start'); setRecurring(false); setSending(false)
    setError(null); setDone(false)
  }

  async function handleSend() {
    setSending(true)
    setError(null)
    try {
      await Promise.all(candidateIds.map(teamMemberId =>
        api.createSchedule({
          teamMemberId,
          type:               'ai_voice',
          interviewMode,
          difficulty,
          questionCount,
          attempts,
          linkStrategy,
          recurring,
          clientTemplateId:   template.id,
          jdText:             template.jd_text || null,
        })
      ))
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
            <p style={sectionHd}>Attempts</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3].map(n => pill(n, attempts === n, () => setAttempts(n), `${n} attempt${n > 1 ? 's' : ''}`)) }
            </div>
          </div>

          {attempts > 1 && (
            <div>
              <p style={sectionHd}>Link delivery strategy</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { val: 'all_at_start',    label: 'Send all links at start of day', desc: `All ${attempts} links sent immediately` },
                  { val: 'one_hour_before', label: '1 hour before each attempt',     desc: 'Candidate receives link 1hr before each slot' },
                  { val: 'single_link',     label: 'Single cross-attempt link',       desc: 'One link works across all attempts, stops after limit reached' },
                ].map(opt => (
                  <label key={opt.val} onClick={() => setLinkStrategy(opt.val)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', border: `1px solid ${linkStrategy === opt.val ? 'var(--brand-500)' : 'var(--border-default)'}`, borderRadius: 8, cursor: 'pointer', background: linkStrategy === opt.val ? 'var(--brand-50)' : 'var(--bg-surface)' }}>
                    <input type="radio" name="linkStrategy" value={opt.val} checked={linkStrategy === opt.val} onChange={() => setLinkStrategy(opt.val)} style={{ accentColor: 'var(--brand-500)', marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)', margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '2px 0 0' }}>{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

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
              <select value={questionCount} onChange={e => setQCount(Number(e.target.value))} style={{ padding: '7px 10px', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: 'var(--bg-surface)' }}>
                {[5,8,10,15,20].map(n => <option key={n} value={n}>{n} questions</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} style={{ accentColor: 'var(--brand-500)', width: 16, height: 16 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)', margin: 0 }}>Recurring event</p>
                <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '2px 0 0' }}>Automatically schedule the next attempt after each completion</p>
              </div>
            </label>
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
function DetailView({ template, onBack }) {
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
  const [reports, setReports]               = useState([])

  const tags = (() => { try { return typeof template.tags === 'string' ? JSON.parse(template.tags) : (template.tags || []) } catch { return [] } })()

  useEffect(() => {
    if (tab !== 'candidates') return
    setMatchLoading(true)
    async function loadMatches() {
      try {
        const r = await api.getTemplateMatches(template.id)
        setMatches(r.data || [])
      } catch {
        setMatches([])
      } finally {
        setMatchLoading(false)
      }
    }
    loadMatches()
  }, [tab, template.id])

  useEffect(() => {
    if (tab !== 'reports') return
    async function loadReports() {
      try {
        const r = await api.getTeamReports('client')
        const filtered = (r.data || []).filter(rep => rep.client_template_id === template.id)
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
      const res = await api.sendJDToTeam(template.id, { userIds: selectedIds })
      setJdSentMsg(`JD sent to ${res.data?.sent || selectedIds.length} candidate${selectedIds.length !== 1 ? 's' : ''}. ${res.data?.failed ? `${res.data.failed} failed.` : ''}`)
      setSelectedIds([])
    } catch {
      setJdSentMsg('Could not send JD. Please try again.')
    } finally {
      setSendingJD(false)
    }
  }

  function toggleSelect(userId) {
    setSelectedIds(prev => prev.includes(userId) ? prev.filter(x => x !== userId) : [...prev, userId])
  }

  const tabStyle = (t) => ({
    background: 'transparent', border: 0, padding: '8px 14px', fontSize: 13,
    fontWeight: tab === t ? 700 : 500, cursor: 'pointer',
    color: tab === t ? 'var(--brand-500)' : 'var(--fg-muted)',
    borderBottom: tab === t ? '2px solid var(--brand-500)' : '2px solid transparent',
    marginBottom: -1, fontFamily: 'inherit',
  })

  const inp = { padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--fg-muted)', fontWeight: 600, fontSize: 13 }}>← Back</button>
          <h2 style={{ fontSize: 20, margin: 0, color: 'var(--fg-primary)', fontWeight: 700 }}>{template.client_name}</h2>
          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>— {template.requirements}</span>
        </div>
        <Button variant="secondary" onClick={() => { setEditData({ client_name: template.client_name, client_email: template.client_email || '', requirements: template.requirements, headcount: template.headcount, custom_info: template.custom_info || '' }); setEditing(true) }}>
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
                { label: 'Role',       value: template.requirements },
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

              {matches.length === 0 ? (
                <EmptyState message="No team members match the template tags yet. Upload resumes to generate skill tags." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {matches.map(m => {
                    const name = `${m.first_name || ''} ${m.last_name || ''}`.trim()
                    const uid = m.user_id || m.id
                    const checked = selectedIds.includes(uid)
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: `1px solid ${checked ? 'var(--brand-300)' : 'var(--border-default)'}`, borderRadius: 10, background: checked ? 'var(--brand-50)' : 'var(--bg-surface)', transition: 'all 120ms', cursor: 'pointer' }} onClick={() => toggleSelect(uid)}>
                        <input type="checkbox" checked={checked} onChange={() => toggleSelect(uid)} onClick={e => e.stopPropagation()} style={{ accentColor: 'var(--brand-500)' }} />
                        <Avatar name={name} size="sm" />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)', margin: 0 }}>{name}</p>
                          {m.current_position && <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '2px 0 0' }}>{m.current_position}</p>}
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                            {(m.matched_tags || []).map(t => <span key={t} style={{ fontSize: 11, background: 'var(--success-50)', color: 'var(--success-700)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>{t}</span>)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--brand-500)' }}>{m.match_score}</span>
                          <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '2px 0 0' }}>match{m.match_score !== 1 ? 'es' : ''}</p>
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
            { key: 'requirements', label: 'Role Required', type: 'text' },
            { key: 'headcount', label: 'Headcount', type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', marginBottom: 4 }}>{f.label}</label>
              <input type={f.type} value={editData[f.key] || ''} onChange={e => setEditData(d => ({ ...d, [f.key]: e.target.value }))} style={inp} />
            </div>
          ))}
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
              await api.updateClientTemplate(template.id, editData)
              setEditing(false)
              Object.assign(template, editData)
            } catch {}
            finally { setSavingEdit(false) }
          }}>{savingEdit ? 'Saving…' : 'Save'}</Button>
        </div>
      </Modal>

      <SendInviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
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

  if (selectedTemplate) {
    return <DetailView template={selectedTemplate} onBack={() => { setSelectedTemplate(null); load() }} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--fg-primary)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Client Mandates</h1>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>Create client hiring requirements, match team members, send JDs and interview invites.</p>
        </div>
        <Button onClick={() => setWizardOpen(true)}><Plus size={13} style={{ marginRight: 6 }} /> New Mandate</Button>
      </div>

      {loading && <Spinner center />}
      {error && <ErrorMessage message={error} />}
      {!loading && !error && templates.length === 0 && (
        <EmptyState message="No client mandates yet. Create one to start matching team members to client requirements." />
      )}
      {!loading && !error && templates.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))', gap: '1rem' }}>
          {templates.map(t => {
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
