import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, XCircle, FileText, AlertTriangle, UploadCloud, ChevronDown, ChevronUp, Clock, MapPin, BriefcaseBusiness } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import * as api from '../../services/api'
import { formatDate, formatDateTime, parseStoredArray } from '../../utils/helpers'

const INTERVIEW_TYPE_LABEL = {
  ai_voice: 'AI Voice', exam: 'Coding Exam', human: 'Video Interview',
  offline: 'Offline Interview', client: 'Client Interview',
}
const TYPE_COLOR = { ai_voice: 'var(--brand-500)', exam: 'var(--info-500)', human: 'var(--success-500)', offline: 'var(--warning-500)' }
const TYPE_BG    = { ai_voice: 'var(--brand-50)',  exam: 'var(--info-50)',  human: 'var(--success-50)', offline: 'var(--warning-50)' }

const OUTCOME_CONFIG = {
  passed:  { label: 'Passed',        color: 'var(--success-600)', bg: 'var(--success-50)', border: 'var(--success-100)' },
  failed:  { label: 'Did not clear', color: 'var(--danger-600)',  bg: 'var(--danger-50)',  border: 'var(--danger-100)' },
  on_hold: { label: 'On hold',       color: 'var(--warning-600)', bg: 'var(--warning-50)', border: 'var(--warning-100)' },
  offer_made: { label: 'Offer made', color: 'var(--success-600)', bg: 'var(--success-50)', border: 'var(--success-100)' },
  hired: { label: 'Hired', color: 'var(--success-600)', bg: 'var(--success-50)', border: 'var(--success-100)' },
  withdrawn: { label: 'Withdrawn', color: 'var(--fg-muted)', bg: 'var(--bg-surface-alt)', border: 'var(--border-default)' },
  pending: { label: 'Pending',       color: 'var(--fg-muted)',    bg: 'var(--bg-surface-alt)', border: 'var(--border-default)' },
}

function requirementMeta(mandate) {
  const parts = []
  if (mandate.requirement_years_min != null) {
    parts.push(`${mandate.requirement_years_min}-${mandate.requirement_years_max ?? '+'} yrs`)
  }
  if (mandate.requirement_headcount) {
    parts.push(`${mandate.requirement_headcount} role${Number(mandate.requirement_headcount) === 1 ? '' : 's'}`)
  }
  return parts.join(' | ')
}

function CandidateMandatesPage() {
  const [mandates, setMandates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [resumeSubmitting, setResumeSubmitting] = useState(null)
  const [expandedMandate, setExpandedMandate] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getCandidateClientMandates()
      setMandates(res.data || [])
    } catch { setError('Could not load client mandates.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  async function submitClientResume(ctId, file) {
    setResumeSubmitting(ctId)
    try {
      if (file) {
        await api.submitClientResume(ctId, file)
      } else {
        await api.useExistingResumeForClient(ctId)
      }
      setMessage({ type: 'success', text: 'Resume submitted for this client mandate.' })
      await load()
    } catch (err) { setMessage({ type: 'error', text: err.message || 'Could not submit resume.' }) }
    finally { setResumeSubmitting(null) }
  }

  if (loading) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>

  return (
    <div style={{ padding: '1.5rem 1.75rem', maxWidth: '52rem', margin: '0 auto' }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-primary)', letterSpacing: '-0.02em', margin: 0 }}>Client Mandates</h1>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4, marginBottom: 0 }}>Opportunities your manager has added you to</p>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--danger-50)', color: 'var(--danger-700)', fontSize: 13, marginBottom: 20, border: '1px solid var(--danger-100)' }}>
          {error}
        </div>
      )}
      {message && (
        <div onClick={() => setMessage(null)} style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 20, cursor: 'pointer', border: `1px solid ${message.type === 'success' ? 'var(--success-100)' : 'var(--danger-100)'}`, background: message.type === 'success' ? 'var(--success-50)' : 'var(--danger-50)', color: message.type === 'success' ? 'var(--success-700)' : 'var(--danger-700)' }}>
          {message.text}
        </div>
      )}

      {mandates.length === 0 ? (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '52px 20px', textAlign: 'center', boxShadow: 'var(--shadow-xs)' }}>
          <BriefcaseBusiness size={28} color="var(--fg-subtle)" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-primary)', margin: '0 0 6px' }}>No client mandates yet</p>
          <p style={{ fontSize: 13, color: 'var(--fg-subtle)', margin: 0 }}>Your manager will add you to client opportunities here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mandates.map(mandate => {
            const isExpanded = expandedMandate === mandate.id
            const publishedRounds = mandate.published_rounds || []
            const latestRound = mandate.latest_published_round || publishedRounds[publishedRounds.length - 1]
            const outcome = latestRound?.outcome
            const outcomeConf = OUTCOME_CONFIG[outcome] || OUTCOME_CONFIG.pending
            const resumeUrl = mandate.client_resume_download_url || mandate.client_resume_url
            const needsAction = !resumeUrl && mandate.jd_sent
            const profileMeta = requirementMeta(mandate)
            const mandateTags = parseStoredArray(mandate.mandate_tags)

            return (
              <div key={mandate.id} style={{ background: 'var(--bg-surface)', border: `1px solid ${needsAction ? 'var(--warning-500)' : 'var(--border-default)'}`, borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ padding: '18px 20px' }}>

                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>{mandate.client_name}</p>
                      <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '3px 0 0' }}>{mandate.mandate_role}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {mandate.requirement_name && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--brand-50)', color: 'var(--brand-600)', fontWeight: 600 }}>
                          {mandate.requirement_name}{profileMeta ? ` | ${profileMeta}` : ''}
                        </span>
                      )}
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--bg-surface-alt)', color: 'var(--fg-muted)', fontWeight: 500, textTransform: 'capitalize' }}>
                        {mandate.status}
                      </span>
                    </div>
                  </div>

                  {/* Status chips */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, fontWeight: 600, border: `1px solid ${mandate.jd_sent ? 'var(--success-100)' : 'var(--border-default)'}`, background: mandate.jd_sent ? 'var(--success-50)' : 'var(--bg-surface-alt)', color: mandate.jd_sent ? 'var(--success-700)' : 'var(--fg-subtle)' }}>
                      {mandate.jd_sent ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                      JD {mandate.jd_sent ? 'Received' : 'Pending'}
                    </span>
                    <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, fontWeight: 600, border: `1px solid ${resumeUrl ? 'var(--success-100)' : 'var(--border-default)'}`, background: resumeUrl ? 'var(--success-50)' : 'var(--bg-surface-alt)', color: resumeUrl ? 'var(--success-700)' : 'var(--fg-subtle)' }}>
                      {resumeUrl ? <CheckCircle2 size={11} /> : <FileText size={11} />}
                      Resume {resumeUrl ? 'Submitted' : 'Pending'}
                      {resumeUrl && (
                        <a href={resumeUrl} target="_blank" rel="noreferrer" style={{ marginLeft: 4, color: 'inherit', textDecoration: 'underline' }}>View</a>
                      )}
                    </span>
                    {latestRound && (
                      <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, fontWeight: 600, border: `1px solid ${outcomeConf.border}`, background: outcomeConf.bg, color: outcomeConf.color }}>
                        <AlertTriangle size={11} />Latest round: {outcomeConf.label}
                      </span>
                    )}
                  </div>

                  {(mandate.jd_text || mandateTags.length > 0) && (
                    <details style={{ marginBottom: 14, border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--bg-surface-alt)', overflow: 'hidden' }}>
                      <summary style={{ padding: '10px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--fg-primary)' }}>
                        Job description and focus areas
                      </summary>
                      <div style={{ padding: '0 12px 12px', fontSize: 12, color: 'var(--fg-body)', lineHeight: 1.65 }}>
                        {mandateTags.length > 0 && (
                          <div className="tag-list" style={{ marginBottom: mandate.jd_text ? 10 : 0 }}>
                            {mandateTags.map(tag => <span className="tag" key={tag}>{tag}</span>)}
                          </div>
                        )}
                        {mandate.jd_text && (
                          <div style={{ whiteSpace: 'pre-wrap', maxHeight: 260, overflowY: 'auto' }}>
                            {mandate.jd_text}
                          </div>
                        )}
                      </div>
                    </details>
                  )}

                  {/* Client interview outcomes */}
                  {publishedRounds.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                      {publishedRounds.map(round => {
                        const roundConf = OUTCOME_CONFIG[round.outcome] || OUTCOME_CONFIG.pending
                        return (
                          <div key={round.id} style={{ padding: '12px 14px', borderRadius: 8, background: roundConf.bg, border: `1px solid ${roundConf.border}` }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: roundConf.color, margin: '0 0 4px' }}>
                              Round {round.round_number}
                              {round.interview_at ? ` | ${formatDate(round.interview_at)}` : ''}
                              {` | ${roundConf.label}`}
                            </p>
                            {round.feedback && (
                              <p style={{ fontSize: 12, color: 'var(--fg-body)', margin: 0 }}>{round.feedback}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Action needed: resume submission */}
                  {needsAction && (
                    <div style={{ padding: '14px 16px', borderRadius: 8, background: 'var(--warning-50)', border: '1px solid var(--warning-100)', marginBottom: 14 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning-700)', margin: '0 0 10px' }}>
                        Action needed - submit your resume for this client
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button disabled={resumeSubmitting === mandate.id} onClick={() => submitClientResume(mandate.id, null)}
                          style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 7, fontSize: 12, fontWeight: 600, color: 'var(--fg-body)', cursor: 'pointer' }}>
                          {resumeSubmitting === mandate.id ? 'Submitting…' : 'Use My Main Resume'}
                        </button>
                        <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', background: 'var(--fg-primary)', borderRadius: 7, fontSize: 12, fontWeight: 600, color: 'var(--bg-surface)', cursor: 'pointer' }}>
                          <UploadCloud size={13} />Upload Custom
                          <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) submitClientResume(mandate.id, f); e.target.value = '' }}
                            disabled={resumeSubmitting === mandate.id} />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Toggle mandate interviews */}
                  {mandate.interviews?.length > 0 && (
                    <button type="button" onClick={() => setExpandedMandate(isExpanded ? null : mandate.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 0, cursor: 'pointer', fontSize: 12, color: 'var(--fg-muted)', padding: 0 }}>
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {mandate.interviews.length} scheduled interview{mandate.interviews.length !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>

                {/* Expanded interviews */}
                {isExpanded && mandate.interviews?.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border-default)', padding: '12px 20px', background: 'var(--bg-page)' }}>
                    {mandate.interviews.map(iv => (
                      <div key={iv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border-default)', fontSize: 12 }}>
                        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: TYPE_BG[iv.type] || 'var(--bg-surface-alt)', color: TYPE_COLOR[iv.type] || 'var(--fg-muted)', fontWeight: 600 }}>
                          {INTERVIEW_TYPE_LABEL[iv.type] || iv.type}
                        </span>
                        {iv.scheduled_at && (
                          <span style={{ color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={10} />{formatDateTime(iv.scheduled_at)}
                          </span>
                        )}
                        {iv.location && (
                          <span style={{ color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <MapPin size={10} />{iv.location}
                          </span>
                        )}
                        <span style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 7px', borderRadius: 5, fontWeight: 600, background: iv.status === 'completed' ? 'var(--success-50)' : 'var(--bg-surface-alt)', color: iv.status === 'completed' ? 'var(--success-700)' : 'var(--fg-muted)' }}>
                          {iv.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CandidateMandatesPage
