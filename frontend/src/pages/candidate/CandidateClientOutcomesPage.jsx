import { useCallback, useEffect, useState } from 'react'
import { BriefcaseBusiness, Clock } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
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

function MandateCard({ mandate }) {
  const [expanded, setExpanded] = useState(false)
  const rounds = mandate.published_rounds || []
  const latestRound = rounds[rounds.length - 1]

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${mandate.is_archived ? 'var(--border-default)' : 'var(--border-default)'}`,
      borderLeft: `3px solid ${rounds.length > 0 ? 'var(--brand-500)' : 'var(--border-default)'}`,
      borderRadius: 10, boxShadow: 'var(--shadow-xs)',
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

function CandidateClientOutcomesPage() {
  const [mandates, setMandates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getCandidateClientOutcomes()
      setMandates(res.data || [])
    } catch {
      setError('Could not load client outcomes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>

  return (
    <div style={{ padding: '1.5rem 1.75rem', maxWidth: '52rem', margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-primary)', letterSpacing: '-0.02em', margin: 0 }}>
          Client Outcomes
        </h1>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4, marginBottom: 0 }}>
          Interview round results published by your manager for client mandates
        </p>
      </div>

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
            <MandateCard key={mandate.client_team_id} mandate={mandate} />
          ))}
        </div>
      )}
    </div>
  )
}

export default CandidateClientOutcomesPage
