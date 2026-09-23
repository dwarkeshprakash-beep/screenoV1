// frontend/src/pages/workspace/ClientOutcomesPage.jsx
// Client Outcomes module - always self-scoped, every caller only ever sees published
// outcome rounds for mandates they're a client_teams participant on (no View-All tier
// exists for this module). Moved as-is from the old candidate-only
// CandidateClientOutcomesPage. Each card also carries the JD once the manager has sent
// it, plus the resume-submission action - the JD email links here with ?mandate=<ctId>
// so that card is scrolled to, highlighted and has its JD expanded.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BriefcaseBusiness, CheckCircle2, Clock } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import MandateJdDetails from '../../components/candidate/MandateJdDetails'
import MandateResumeAction from '../../components/candidate/MandateResumeAction'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

const OUTCOME_STYLES = {
  pending:    { label: 'Pending',        color: 'var(--fg-muted)',    bg: 'var(--bg-subtle)' },
  passed:     { label: 'Passed',         color: 'var(--success-700)', bg: 'var(--success-50)' },
  failed:     { label: 'Did not clear',  color: 'var(--danger-700)',  bg: 'var(--danger-50)' },
  on_hold:    { label: 'On hold',        color: 'var(--warning-700)', bg: 'var(--warning-50)' },
  offer_made: { label: 'Offer made',     color: 'var(--info-700)',    bg: 'var(--info-50)' },
  hired:      { label: 'Hired',          color: 'var(--brand-600)',   bg: 'var(--brand-50)' },
  withdrawn:  { label: 'Withdrawn',      color: 'var(--slate-500)',   bg: 'var(--bg-subtle)' },
}

function OutcomeBadge({ outcome }) {
  const style = OUTCOME_STYLES[outcome] || OUTCOME_STYLES.pending
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
      background: style.bg, color: style.color,
    }}>
      {style.label}
    </span>
  )
}

function RoundRow({ round }) {
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 8,
      border: '1px solid var(--border-default)',
      background: 'var(--bg-surface)', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-secondary)' }}>
          Round {round.round_number}
        </span>
        <OutcomeBadge outcome={round.outcome} />
        {round.interview_at && (
          <span style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock size={10} />{formatDate(round.interview_at)}
          </span>
        )}
      </div>
      {round.feedback && (
        <p style={{ fontSize: 13, color: 'var(--fg-body)', margin: '4px 0 0', lineHeight: 1.5 }}>
          {round.feedback}
        </p>
      )}
    </div>
  )
}

function MandateCard({ mandate, resumes, highlighted, cardRef, onResumeSubmitted }) {
  const [expanded, setExpanded] = useState(false)
  const rounds = mandate.published_rounds || []
  const latestRound = rounds[rounds.length - 1]
  const needsResume = mandate.jd_sent && !mandate.client_resume_url && !mandate.is_archived

  return (
    <div ref={cardRef} style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${highlighted ? 'var(--brand-500)' : 'var(--border-default)'}`,
      borderLeft: `3px solid ${rounds.length > 0 || highlighted ? 'var(--brand-500)' : 'var(--border-default)'}`,
      borderRadius: 10, boxShadow: highlighted ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
      scrollMarginTop: 80,
    }}>
      <div style={{ padding: '16px 18px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>
              {mandate.client_name || 'Client mandate'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '2px 0 0' }}>
              {mandate.mandate_title || ''}{mandate.role_assigned ? ` · ${mandate.role_assigned}` : ''}
              {mandate.is_archived ? ' · Closed' : ''}
            </p>
          </div>
          {latestRound ? (
            <OutcomeBadge outcome={latestRound.outcome} />
          ) : (
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>No updates yet</span>
          )}
        </div>

        {/* JD - only present once the manager has sent it */}
        {mandate.jd_sent && (
          <MandateJdDetails jdText={mandate.jd_text} tags={mandate.jd_tags} defaultOpen={highlighted} />
        )}

        {/* Resume for this client: submitted link, or the submit action */}
        {mandate.client_resume_url ? (
          <p style={{ fontSize: 12, color: 'var(--success-700)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={12} />Resume submitted
            <a href={mandate.client_resume_url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>View</a>
          </p>
        ) : needsResume && (
          <MandateResumeAction
            clientTeamId={mandate.client_team_id}
            resumes={resumes}
            deadline={mandate.resume_deadline}
            onSubmitted={onResumeSubmitted}
          />
        )}

        {rounds.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>
            Your interviewer hasn&apos;t published any round updates yet.
          </p>
        ) : (
          <>
            {!expanded && latestRound && (
              <div style={{ marginBottom: 8 }}>
                <RoundRow round={latestRound} />
              </div>
            )}
            {expanded && rounds.map(r => <RoundRow key={r.id} round={r} />)}
            {rounds.length > 1 && (
              <button
                onClick={() => setExpanded(v => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontSize: 12, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {expanded ? '▲ Show less' : `▼ Show all ${rounds.length} rounds`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ClientOutcomesPage() {
  const [searchParams] = useSearchParams()
  const [mandates, setMandates] = useState([])
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const highlightRef = useRef(null)

  // ?mandate=<client_team_id> comes from the JD email link
  const highlightId = Number(searchParams.get('mandate')) || null

  // silent=true refreshes after a resume submit without swapping the page for a spinner
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      // The resume pool only feeds the "pick a saved resume" dropdown - if it fails
      // the upload option still works, so it must not fail the whole page.
      const [outcomesRes, resumesRes] = await Promise.all([
        api.getCandidateClientOutcomes(),
        api.getResumes().catch(() => ({ data: [] })),
      ])
      setMandates(outcomesRes.data || [])
      setResumes(resumesRes.data || [])
    } catch {
      setError('Could not load client outcomes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // Once the linked card is on screen, bring it into view
  useEffect(() => {
    if (!loading && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [loading, highlightId])

  async function handleResumeSubmitted() {
    setNotice('Resume submitted for this client mandate.')
    await load(true)
  }

  if (loading) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>

  return (
    <div style={{ padding: '1.5rem 1.75rem', maxWidth: '52rem', margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-primary)', letterSpacing: '-0.02em', margin: 0 }}>
          Client Outcomes
        </h1>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4, marginBottom: 0 }}>
          Job descriptions, resume requests and interview round results for client mandates you&apos;re on
        </p>
      </div>

      {notice && (
        <div onClick={() => setNotice(null)} style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--success-50)', color: 'var(--success-700)', fontSize: 13, marginBottom: 20, border: '1px solid var(--success-100)', cursor: 'pointer' }}>
          {notice}
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--danger-50)', color: 'var(--danger-700)', fontSize: 13, marginBottom: 20, border: '1px solid var(--danger-100)' }}>
          {error}
        </div>
      )}

      {mandates.length === 0 ? (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '40px 20px', textAlign: 'center', boxShadow: 'var(--shadow-xs)' }}>
          <BriefcaseBusiness size={24} color="var(--fg-subtle)" style={{ marginBottom: 10 }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)', margin: '0 0 4px' }}>No client mandates</p>
          <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: 0 }}>
            When your manager adds you to a client mandate and publishes interview rounds, they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mandates.map(mandate => (
            <MandateCard
              key={mandate.client_team_id}
              mandate={mandate}
              resumes={resumes}
              highlighted={mandate.client_team_id === highlightId}
              cardRef={mandate.client_team_id === highlightId ? highlightRef : undefined}
              onResumeSubmitted={handleResumeSubmitted}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ClientOutcomesPage
