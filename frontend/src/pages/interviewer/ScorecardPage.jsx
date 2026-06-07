import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, Lightbulb, BarChart3, AlertTriangle, FileText, PlayCircle } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import * as api from '../../services/api'

const COMPETENCIES = [
  { key: 'overall',       label: 'Overall Performance',    weight: 'Core' },
  { key: 'confidence',    label: 'Confidence',             weight: 'Core' },
  { key: 'techKnowledge', label: 'Technical Knowledge',    weight: 'Core' },
  { key: 'communication', label: 'Communication',          weight: 'Bonus' },
  { key: 'problemSolving', label: 'Problem Solving',       weight: 'Core' },
]

const DOT_LABELS = ['Poor', 'Weak', 'Good', 'Strong', 'Excellent']

const DECISIONS = [
  { key: 'pass',   label: 'Pass',   icon: '✓', color: '#047857', bg: '#ECFDF5', bd: '#A7F3D0' },
  { key: 'maybe',  label: 'Maybe',  icon: '?', color: '#B45309', bg: '#FFFBEB', bd: '#FEF3C7' },
  { key: 'reject', label: 'Reject', icon: '✗', color: '#B53618', bg: '#FEF2F2', bd: '#FECACA' },
]

function EvidenceField({ defaultText = '', onChange }) {
  const [text, setText]   = useState(defaultText)
  const [edited, setEdited] = useState(false)
  return (
    <textarea
      value={text}
      onChange={e => { setText(e.target.value); setEdited(true); onChange?.(e.target.value) }}
      rows={2}
      style={{ width: '100%', padding: 10, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', lineHeight: 1.55, color: edited ? '#0F172A' : '#94A3B8', fontStyle: edited ? 'normal' : 'italic', background: edited ? '#FFF' : '#FAFAFE', outline: 'none', resize: 'vertical', transition: 'all 120ms', boxSizing: 'border-box' }}
      onFocus={e => { e.target.style.borderColor = '#5B4FE9'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)'; setEdited(true) }}
      onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none' }}
    />
  )
}

function ScorecardPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [draft, setDraft]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [saving, setSaving]   = useState(false)

  const [scores, setScores]     = useState({ overall: 0, confidence: 0, techKnowledge: 0, communication: 0, problemSolving: 0 })
  const [evidence, setEvidence] = useState({})
  const [decision, setDecision] = useState('')
  const [reason, setReason]     = useState('')

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getScorecardData(id)
      if (res.data) { setDraft(res.data); setReason(res.data.summary || '') }
    } catch {
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
      await api.submitScorecard(id, { scores, evidence, decision, reason })
      navigate('/interviewer/dashboard')
    } catch {
      alert('Could not submit scorecard. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 40 }}><Spinner /></div>
  if (error) return <ErrorMessage message={error} />

  const scoredValues = Object.values(scores).filter(v => v > 0)
  const overall = scoredValues.length > 0
    ? parseFloat((scoredValues.reduce((a, b) => a + b, 0) / scoredValues.length).toFixed(1))
    : null

  return (
    <div>
      <button onClick={() => navigate('/interviewer/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 0, color: '#5B4FE9', fontWeight: 500, fontSize: 13, cursor: 'pointer', marginBottom: 20 }}>
        <ArrowLeft size={16} /> Back to dashboard
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* AI pre-fill notice */}
          <div style={{ padding: '12px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, display: 'flex', gap: 10, fontSize: 13, color: '#6B7280', alignItems: 'flex-start' }}>
            <Sparkles size={14} color="#5B4FE9" style={{ marginTop: 1, flexShrink: 0 }} />
            {draft ? 'AI has pre-filled this scorecard based on the interview transcript. Review, edit, and submit.' : 'Rate the candidate on each competency below.'}
          </div>

          {/* Competency cards */}
          {COMPETENCIES.map(c => (
            <div key={c.key} style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{c.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: c.weight === 'Core' ? '#EFEDFD' : '#F1F5F9', color: c.weight === 'Core' ? '#3A31A3' : '#475569' }}>{c.weight}</span>
                </div>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: scores[c.key] >= 4 ? '#047857' : scores[c.key] >= 3 ? '#B45309' : '#B53618' }}>
                  {scores[c.key] || '—'}/5
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setScores(s => ({ ...s, [c.key]: n }))}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 8, fontFamily: 'inherit',
                      border: `1px solid ${scores[c.key] === n ? '#5B4FE9' : '#E2E8F0'}`,
                      background: scores[c.key] === n ? '#EFEDFD' : '#FFF',
                      color: scores[c.key] === n ? '#3A31A3' : '#374151',
                      fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 120ms',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}
                  >
                    <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}>{n}</span>
                    <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 500 }}>{DOT_LABELS[n - 1]}</span>
                  </button>
                ))}
              </div>

              <EvidenceField
                defaultText={draft?.summary ? `${draft.summary.slice(0, 80)}...` : ''}
                onChange={text => setEvidence(prev => ({ ...prev, [c.key]: text }))}
              />
            </div>
          ))}

          {/* Decision */}
          <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Final decision</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
              {DECISIONS.map(d => (
                <button
                  key={d.key}
                  onClick={() => setDecision(d.key)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '16px 12px',
                    border: `${decision === d.key ? 2 : 1}px solid ${decision === d.key ? d.bd : '#E2E8F0'}`,
                    background: decision === d.key ? d.bg : '#FFF', borderRadius: 10,
                    color: decision === d.key ? d.color : '#6B7280', fontWeight: 600, fontSize: 14,
                    cursor: 'pointer', transition: 'all 160ms',
                    transform: decision === d.key ? 'translateY(-1px)' : 'translateY(0)', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{d.icon}</span>{d.label}
                </button>
              ))}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Why? <span style={{ color: '#EF4444' }}>*</span></label>
                <span style={{ fontSize: 11, color: reason.length > 490 ? '#EF4444' : '#94A3B8', fontFamily: 'monospace' }}>{reason.length}/500</span>
              </div>
              <textarea
                rows={3} value={reason}
                onChange={e => setReason(e.target.value.slice(0, 500))}
                placeholder="Brief rationale for the hiring panel..."
                style={{ width: '100%', padding: 10, border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', lineHeight: 1.55, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                onFocus={e => { e.target.style.borderColor = '#5B4FE9'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }}
                onBlur={e => { e.target.style.borderColor = '#CBD5E1'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <button
              disabled={saving}
              onClick={handleSubmit}
              style={{ width: '100%', marginTop: 14, padding: '12px 0', background: saving ? '#94A3B8' : '#5B4FE9', color: '#FFF', border: 0, borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 6px 18px rgba(91,79,233,0.25)', transition: 'all 120ms' }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#4A3FCE' }}
              onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#5B4FE9' }}
            >
              {saving ? 'Submitting...' : 'Submit scorecard'}
            </button>
            <div style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', marginTop: 8 }}>Saved when you submit the scorecard</div>
          </div>
        </div>

        {/* Right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 80 }}>
          {/* Overall score */}
          <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, textAlign: 'center', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5B4FE9', marginBottom: 8 }}>Overall score</div>
            <div style={{ fontFamily: "var(--font-display,'Inter')", fontSize: 56, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1 }}>{overall != null ? overall : '—'}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>/ 5.0</div>
            <div style={{ height: 6, background: '#F1F5F9', borderRadius: 9999, overflow: 'hidden', margin: '14px 0 0' }}>
              <div style={{ height: '100%', width: `${overall != null ? (overall / 5) * 100 : 0}%`, background: '#5B4FE9', borderRadius: 9999, transition: 'width 240ms' }} />
            </div>
          </div>

          {/* AI Insights */}
          <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5B4FE9', marginBottom: 12 }}>AI insights</div>
            {draft?.summary ? (
              [
                { icon: Lightbulb, color: '#5B4FE9', text: draft.summary },
                { icon: BarChart3, color: '#5B4FE9', text: 'Score aligns with AI screening report.' },
                { icon: AlertTriangle, color: '#B45309', text: 'Review any gaps noted in the AI report before deciding.' },
              ].map((it, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: `${i === 0 ? 0 : 12}px 0 ${i === 2 ? 0 : 12}px`, borderTop: i === 0 ? '0' : '1px solid #F1F5F9' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: '#EFEDFD', color: it.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <it.icon size={13} />
                  </div>
                  <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.55 }}>{it.text}</div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 13, color: '#94A3B8' }}>AI insights will appear here after the transcript is processed.</p>
            )}
          </div>

          {/* Links */}
          <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
            {[{ icon: FileText, label: 'Jump to transcript' }, { icon: PlayCircle, label: 'Play recording' }].map((l, i) => (
              <a key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#5B4FE9', fontWeight: 500, cursor: 'pointer', padding: '6px 0', borderTop: i > 0 ? '1px solid #F1F5F9' : '0' }}>
                <l.icon size={14} /> {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScorecardPage

