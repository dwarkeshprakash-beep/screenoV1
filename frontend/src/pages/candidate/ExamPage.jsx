import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, ArrowRight } from 'lucide-react'
import * as api from '../../services/api'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'

function clk(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function ExamPage() {
  const { token } = useParams()
  const navigate  = useNavigate()

  // All hooks must come before any conditional returns
  const [exam, setExam]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers]       = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft]     = useState(3600)
  const [submitted, setSubmitted]   = useState(false)
  const [isMobile]                  = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)

  useEffect(() => {
    if (isMobile) return
    async function load() {
      try {
        const r = await api.getExam(token)
        setExam(r.data)
      } catch (err) {
        setError(err.message || 'Could not load exam.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token, isMobile])

  const handleSubmit = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const answerList = Object.entries(answers).map(([qId, a]) => ({
        questionId: parseInt(qId, 10),
        selectedOption: a.selectedOption,
        answerText: a.answerText || '',
      }))
      await api.submitExam(token, answerList)
      setSubmitted(true)
      navigate(`/interview/${token}/done`)
    } catch (err) {
      alert('Submit failed: ' + err.message)
      setSubmitting(false)
    }
  }, [submitting, answers, token, navigate])

  useEffect(() => {
    if (!exam) return
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(interval); handleSubmit(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [exam, handleSubmit])

  // Mobile guard after all hooks
  if (isMobile) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Please use a desktop or laptop</h2>
        <p>Exams require a larger screen for the best experience.</p>
      </div>
    )
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spinner /></div>
  if (error)   return <div style={{ padding: 40, maxWidth: 480, margin: '0 auto' }}><ErrorMessage message={error} /></div>
  if (!exam)   return null

  const questions    = exam?.questions || []
  const total        = questions.length
  const current      = questions[currentIdx] || null
  const isLast       = currentIdx === total - 1
  const answeredCount = Object.keys(answers).length

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', height: 'calc(100vh - 56px)', background: '#F8FAFC' }}>
      {/* Left palette */}
      <div style={{ borderRight: '1px solid #E2E8F0', background: '#FFF', padding: 18, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {/* Timer */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: timeLeft < 300 ? '#EF4444' : '#0F172A', background: '#F1F5F9', padding: '8px 12px', borderRadius: 8, justifyContent: 'center' }}>
          <Clock size={15} />{clk(timeLeft)}
        </div>

        {/* Question grid */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8 }}>Questions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(i)}
                style={{
                  aspectRatio: '1', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  border: `1px solid ${currentIdx === i ? '#5B4FE9' : answers[q.id] != null ? '#A7F3D0' : '#E2E8F0'}`,
                  background: currentIdx === i ? '#5B4FE9' : answers[q.id] != null ? '#ECFDF5' : '#FFF',
                  color: currentIdx === i ? '#FFF' : answers[q.id] != null ? '#047857' : '#6B7280',
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 'auto', fontSize: 12, color: '#6B7280' }}>{answeredCount}/{total} answered</div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ padding: '11px 0', borderRadius: 9, background: submitting ? '#94A3B8' : '#5B4FE9', color: '#FFF', border: 0, fontWeight: 600, fontSize: 13, cursor: submitting ? 'not-allowed' : 'pointer' }}
        >
          {submitting ? 'Submitting...' : 'Submit exam'}
        </button>
      </div>

      {/* Main question area */}
      <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {current && (
          <div style={{ padding: '32px 40px', overflowY: 'auto', flex: 1 }}>
            <div style={{ maxWidth: 680 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#5B4FE9', marginBottom: 8 }}>
                Question {currentIdx + 1} of {total}
                {current.phase ? ` · ${current.phase}` : ''}
              </div>

              <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0F172A', lineHeight: 1.5, margin: '0 0 22px' }}>
                {current.text}
              </h2>

              {/* MCQ options */}
              {current.question_type === 'mcq' || (current.options && current.options.length > 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(typeof current.options === 'string' ? JSON.parse(current.options) : current.options || []).map((opt, oi) => {
                    const sel = answers[current.id]?.selectedOption === oi
                    return (
                      <button
                        key={oi}
                        onClick={() => setAnswers(a => ({ ...a, [current.id]: { selectedOption: oi } }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                          borderRadius: 10, textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
                          border: `1px solid ${sel ? '#5B4FE9' : '#E2E8F0'}`,
                          background: sel ? '#F3F0FF' : '#FFF', transition: 'all 120ms',
                        }}
                      >
                        <span style={{ width: 24, height: 24, borderRadius: 9999, flexShrink: 0, border: `1.5px solid ${sel ? '#5B4FE9' : '#CBD5E1'}`, background: sel ? '#5B4FE9' : '#FFF', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                          {sel ? '✓' : String.fromCharCode(65 + oi)}
                        </span>
                        <span style={{ fontSize: 14, color: '#0F172A' }}>{opt}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <textarea
                  rows={6}
                  value={answers[current.id]?.answerText || ''}
                  onChange={e => setAnswers(a => ({ ...a, [current.id]: { answerText: e.target.value } }))}
                  placeholder="Type your answer here..."
                  style={{ width: '100%', padding: '12px 14px', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', lineHeight: 1.6, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = '#5B4FE9'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }}
                  onBlur={e => { e.target.style.borderColor = '#CBD5E1'; e.target.style.boxShadow = 'none' }}
                />
              )}

              {/* Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
                <button
                  onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                  disabled={currentIdx === 0}
                  style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF', color: currentIdx === 0 ? '#CBD5E1' : '#374151', fontWeight: 600, fontSize: 13, cursor: currentIdx === 0 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>
                {isLast ? (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{ padding: '10px 18px', borderRadius: 8, border: 0, background: '#5B4FE9', color: '#FFF', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    Submit exam <ArrowRight size={13} />
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentIdx(i => i + 1)}
                    style={{ padding: '10px 18px', borderRadius: 8, border: 0, background: '#5B4FE9', color: '#FFF', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    Next <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {total === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#94A3B8', fontSize: 15 }}>No questions found for this exam.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExamPage
