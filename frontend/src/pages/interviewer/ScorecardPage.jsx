// pages/interviewer/ScorecardPage.jsx
// Interviewer scorecard — rate competencies and submit decision.

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Sparkles, ArrowLeft } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import Button from '../../components/shared/Button'
import * as api from '../../services/api'

const COMPETENCIES = [
  { key: 'overall',       label: 'Overall Performance', weight: '30%' },
  { key: 'confidence',    label: 'Confidence',          weight: '15%' },
  { key: 'techKnowledge', label: 'Technical Knowledge', weight: '25%' },
  { key: 'communication', label: 'Communication',       weight: '20%' },
  { key: 'problemSolving', label: 'Problem Solving',    weight: '10%' },
]

const SCORE_LABELS = { 1: 'Poor', 2: 'Weak', 3: 'Good', 4: 'Strong', 5: 'Excellent' }

function DotScore({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          style={{
            width: 28, height: 28,
            borderRadius: '50%',
            border: `2px solid ${n <= (hovered || value) ? 'var(--brand-500)' : 'var(--border-strong)'}`,
            background: n <= (hovered || value) ? 'var(--brand-500)' : 'transparent',
            cursor: 'pointer',
            transform: hovered === n ? 'scale(1.15)' : 'scale(1)',
            transition: 'all 0.12s',
          }}
        />
      ))}
      {(hovered || value) > 0 && (
        <span style={{ fontSize: 12, color: 'var(--fg-muted)', marginLeft: 4 }}>{SCORE_LABELS[hovered || value]}</span>
      )}
    </div>
  )
}

const DECISIONS = [
  { key: 'pass',   label: '✓ Pass',   color: 'var(--success-500)', bg: 'var(--success-50)' },
  { key: 'maybe',  label: '? Maybe',  color: 'var(--warning-500)', bg: 'var(--warning-50)' },
  { key: 'reject', label: '✗ Reject', color: 'var(--danger-500)',  bg: 'var(--danger-50)' },
]

function ScorecardPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [draft, setDraft]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [saving, setSaving] = useState(false)

  const [scores, setScores]   = useState({ overall: 0, confidence: 0, techKnowledge: 0, communication: 0, problemSolving: 0 })
  const [evidence, setEvidence] = useState({})
  const [decision, setDecision] = useState('')
  const [reason, setReason]   = useState('')
  const charLimit = 500

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getScorecardData(id)
      if (res.data) {
        setDraft(res.data)
        setReason(res.data.summary || '')
      }
    } catch (err) {
      setError('Could not load scorecard data.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!decision) return alert('Please select a decision.')
    if (!reason.trim()) return alert('Please enter a reason.')

    setSaving(true)
    try {
      await api.submitScorecard(id, { scores, decision, reason })
      navigate('/interviewer/dashboard')
    } catch (err) {
      alert('Could not submit scorecard. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 40 }}><Spinner /></div>
  if (error) return <ErrorMessage message={error} />

  return (
    <div>
      <button onClick={() => navigate('/interviewer/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 13, marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back to dashboard
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Interview Scorecard</h1>
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 24 }}>
        {draft ? 'AI has pre-filled this from the transcript. Review and submit.' : 'Rate the candidate on each competency.'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* Left: scorecard */}
        <div>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            {COMPETENCIES.map((c, i) => (
              <div key={c.key} style={{ padding: '18px 20px', borderBottom: i < COMPETENCIES.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{c.label}</span>
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 99, background: 'var(--slate-100)', color: 'var(--fg-muted)' }}>{c.weight}</span>
                </div>
                <DotScore value={scores[c.key]} onChange={val => setScores(s => ({ ...s, [c.key]: val }))} />
                <textarea
                  rows={2}
                  placeholder={draft ? 'AI evidence will appear here…' : 'Add evidence or observations…'}
                  value={evidence[c.key] || (draft?.summary || '')}
                  onChange={e => setEvidence(ev => ({ ...ev, [c.key]: e.target.value }))}
                  style={{ width: '100%', marginTop: 10, padding: '8px 10px', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, resize: 'none', color: evidence[c.key] ? 'var(--fg-body)' : 'var(--fg-muted)', fontStyle: !evidence[c.key] ? 'italic' : 'normal', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
            ))}
          </div>

          {/* Decision */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 20, marginTop: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Final Decision</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {DECISIONS.map(d => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDecision(d.key)}
                  style={{
                    flex: 1, padding: '12px 8px',
                    border: `2px solid ${decision === d.key ? d.color : 'var(--border-default)'}`,
                    background: decision === d.key ? d.bg : 'transparent',
                    borderRadius: 10,
                    color: d.color,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500 }}>Reason *</label>
                <span style={{ fontSize: 12, color: reason.length > charLimit ? 'var(--danger-500)' : 'var(--fg-muted)' }}>{reason.length}/{charLimit}</span>
              </div>
              <textarea
                rows={4}
                placeholder="Explain your decision…"
                value={reason}
                onChange={e => setReason(e.target.value.slice(0, charLimit))}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 14, resize: 'none', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <Button fullWidth size="lg" loading={saving} onClick={handleSubmit} style={{ marginTop: 16 }}>
              Submit Scorecard
            </Button>
          </div>
        </div>

        {/* Right: AI Insights */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 20, height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontWeight: 600 }}>
            <Sparkles size={16} color="var(--brand-500)" /> AI Insights
          </div>
          {draft?.summary ? (
            <div style={{ background: 'var(--brand-50)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--fg-body)', lineHeight: 1.6, marginBottom: 12 }}>
              {draft.summary}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>AI insights will appear here after the transcript is processed.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScorecardPage
