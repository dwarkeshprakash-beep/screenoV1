import { useState, useEffect, useCallback } from 'react'
import { Plus, LayoutTemplate, Sparkles, X, Download, Send } from 'lucide-react'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import Avatar from '../../components/shared/Avatar'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

// ── Wizard Modal ──────────────────────────────────────────────
function WizardModal({ open, onClose, onCreated }) {
  const [step, setStep]                   = useState(1)
  const [clientName, setClientName]       = useState('')
  const [requirements, setRequirements]   = useState('')
  const [headcount, setHeadcount]         = useState('')
  const [jdText, setJdText]               = useState('')
  const [extractedTags, setExtractedTags] = useState([])
  const [customTag, setCustomTag]         = useState('')
  const [extracting, setExtracting]       = useState(false)
  const [saving, setSaving]               = useState(false)
  const [saveError, setSaveError]         = useState(null)

  function reset() {
    setStep(1); setClientName(''); setRequirements(''); setHeadcount('')
    setJdText(''); setExtractedTags([]); setCustomTag(''); setSaveError(null)
  }

  function handleClose() { reset(); onClose() }

  async function handleExtract() {
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
    if (!clientName.trim()) { setSaveError('Client name is required'); return }
    setSaving(true)
    setSaveError(null)
    try {
      await api.createClientTemplate({
        client_name:  clientName.trim(),
        requirements: requirements.trim(),
        headcount:    headcount ? parseInt(headcount, 10) : 1,
        jd_text:      jdText.trim(),
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
  const inputStyle = { padding: '9px 12px', border: '1px solid var(--slate-300)', borderRadius: 8, fontSize: 13, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }

  return (
    <Modal open={open} onClose={handleClose} title={step === 1 ? 'New Client Template' : 'AI Tag Extraction'} size="md">
      <div style={{ padding: '10px 0' }}>
        {step === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client Name *" style={inputStyle} />
            <input value={requirements} onChange={e => setRequirements(e.target.value)} placeholder="Role Required (e.g. Senior React Developer)" style={inputStyle} />
            <input value={headcount} onChange={e => setHeadcount(e.target.value)} type="number" min="1" placeholder="Headcount" style={inputStyle} />
            <textarea value={jdText} onChange={e => setJdText(e.target.value)} placeholder="Paste Client JD here..." style={{ ...inputStyle, height: 120, resize: 'vertical' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="var(--brand-500)" />
              <p style={{ fontSize: 13, color: 'var(--slate-700)', margin: 0 }}>AI-extracted tags for team matching. Add or remove as needed.</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', minHeight: 32 }}>
              {extractedTags.map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'var(--brand-50)', color: 'var(--brand-700)', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                  {t}
                  <button type="button" onClick={() => removeTag(t)} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, color: 'var(--brand-500)', display: 'inline-flex' }}><X size={12} /></button>
                </span>
              ))}
              {extractedTags.length === 0 && <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>No tags extracted — add them manually below.</span>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={customTag} onChange={e => setCustomTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomTag())} placeholder="Add a tag..." style={{ ...inputStyle, flex: 1 }} />
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
          : <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Template'}</Button>
        }
      </div>
    </Modal>
  )
}

// ── Detail View ───────────────────────────────────────────────
function DetailView({ template, onBack }) {
  const [tab, setTab]           = useState('overview')
  const [matches, setMatches]   = useState([])
  const [matchLoading, setMatchLoading] = useState(false)
  const [sendingJD, setSendingJD]       = useState(false)
  const [selectedIds, setSelectedIds]   = useState([])

  const tags = (() => { try { return typeof template.tags === 'string' ? JSON.parse(template.tags) : (template.tags || []) } catch { return [] } })()

  useEffect(() => {
    if (tab !== 'candidates') return
    setMatchLoading(true)
    api.getTemplateMatches(template.id)
      .then(r => setMatches(r.data || []))
      .catch(() => setMatches([]))
      .finally(() => setMatchLoading(false))
  }, [tab, template.id])

  async function handleSendJD() {
    if (selectedIds.length === 0) return
    setSendingJD(true)
    try { await api.sendJDToTeam(template.id, { userIds: selectedIds }) } catch {}
    finally { setSendingJD(false); setSelectedIds([]) }
  }

  function toggleSelect(userId) {
    setSelectedIds(prev => prev.includes(userId) ? prev.filter(x => x !== userId) : [...prev, userId])
  }

  const tabStyle = (t) => ({
    background: 'transparent', border: 0, padding: '6px 12px', fontSize: 13,
    fontWeight: tab === t ? 700 : 500, cursor: 'pointer', textTransform: 'capitalize',
    color: tab === t ? 'var(--brand-500)' : 'var(--slate-500)',
    borderBottom: tab === t ? '2px solid var(--brand-500)' : '2px solid transparent',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--slate-500)', fontWeight: 600, fontSize: 13 }}>← Back</button>
        <h2 style={{ fontSize: 20, margin: 0, color: 'var(--slate-900)' }}>{template.client_name} — {template.requirements}</h2>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--slate-200)', paddingBottom: 0 }}>
        {['overview', 'jd', 'candidates', 'reports'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>{t === 'jd' ? 'JD' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 24 }}>
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><p style={{ fontSize: 11, color: 'var(--slate-400)', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 4px' }}>Client</p><p style={{ fontSize: 14, color: 'var(--slate-900)', margin: 0, fontWeight: 600 }}>{template.client_name}</p></div>
              <div><p style={{ fontSize: 11, color: 'var(--slate-400)', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 4px' }}>Headcount</p><p style={{ fontSize: 14, color: 'var(--slate-900)', margin: 0, fontWeight: 600 }}>{template.headcount}</p></div>
              <div><p style={{ fontSize: 11, color: 'var(--slate-400)', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 4px' }}>Role</p><p style={{ fontSize: 14, color: 'var(--slate-900)', margin: 0 }}>{template.requirements}</p></div>
              <div><p style={{ fontSize: 11, color: 'var(--slate-400)', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 4px' }}>Created</p><p style={{ fontSize: 14, color: 'var(--slate-900)', margin: 0 }}>{formatDate(template.created)}</p></div>
            </div>
            {tags.length > 0 && (
              <div>
                <p style={{ fontSize: 11, color: 'var(--slate-400)', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 8px' }}>Tags</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {tags.map(t => <span key={t} style={{ fontSize: 12, background: 'var(--brand-50)', color: 'var(--brand-700)', padding: '3px 8px', borderRadius: 999, fontWeight: 600 }}>{t}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'jd' && (
          template.jd_text
            ? <pre style={{ fontSize: 13, color: 'var(--slate-700)', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.7 }}>{template.jd_text}</pre>
            : <EmptyState message="No JD text attached to this template." />
        )}

        {tab === 'candidates' && (
          matchLoading ? <Spinner center /> : matches.length === 0
            ? <EmptyState message="No team members match the template tags yet. Upload resumes to generate skill tags." />
            : (
              <div>
                {selectedIds.length > 0 && (
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button onClick={handleSendJD} disabled={sendingJD}>
                      <Send size={13} style={{ marginRight: 6 }} />{sendingJD ? 'Sending…' : `Send JD to ${selectedIds.length}`}
                    </Button>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {matches.map(m => {
                    const name = `${m.first_name || ''} ${m.last_name || ''}`.trim()
                    const checked = selectedIds.includes(m.user_id || m.id)
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: '1px solid var(--slate-200)', borderRadius: 10 }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleSelect(m.user_id || m.id)} style={{ accentColor: 'var(--brand-500)' }} />
                        <Avatar name={name} size="sm" />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate-900)', margin: 0 }}>{name}</p>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                            {(m.matched_tags || []).map(t => <span key={t} style={{ fontSize: 11, background: 'var(--success-50)', color: 'var(--success-700)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>{t}</span>)}
                          </div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-500)' }}>{m.match_score} match{m.match_score !== 1 ? 'es' : ''}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
        )}

        {tab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <EmptyState message="Interview reports for this client template will appear here once interviews are completed." />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary"><Download size={13} style={{ marginRight: 6 }} /> Export</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
function ClientInterviewsPage() {
  const [wizardOpen, setWizardOpen]           = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [templates, setTemplates]             = useState([])
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getClientTemplates()
      setTemplates(res.data || [])
    } catch (err) {
      setError(err.message || 'Could not load templates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (selectedTemplate) {
    return <DetailView template={selectedTemplate} onBack={() => setSelectedTemplate(null)} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={() => setWizardOpen(true)}><Plus size={13} style={{ marginRight: 6 }} /> New Template</Button>
      </div>

      {loading && <Spinner center />}
      {error && <ErrorMessage message={error} />}
      {!loading && !error && templates.length === 0 && (
        <EmptyState message="No client templates yet. Create one to start matching candidates to client requirements." />
      )}
      {!loading && !error && templates.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))', gap: '1rem' }}>
          {templates.map(t => {
            const tags = (() => { try { return typeof t.tags === 'string' ? JSON.parse(t.tags) : (t.tags || []) } catch { return [] } })()
            return (
              <div key={t.id} onClick={() => setSelectedTemplate(t)} style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'box-shadow 120ms', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--brand-50)', color: 'var(--brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LayoutTemplate size={18} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', background: 'var(--slate-100)', padding: '2px 8px', borderRadius: 999, height: 20, display: 'inline-flex', alignItems: 'center' }}>
                    {t.headcount} needed
                  </span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px' }}>{t.requirements}</h3>
                <p style={{ fontSize: 13, color: 'var(--slate-500)', margin: '0 0 12px' }}>{t.client_name}</p>
                {tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {tags.slice(0, 4).map(tag => (
                      <span key={tag} style={{ fontSize: 11, background: 'var(--slate-100)', color: 'var(--slate-600)', padding: '2px 6px', borderRadius: 4 }}>{tag}</span>
                    ))}
                    {tags.length > 4 && <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>+{tags.length - 4} more</span>}
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
