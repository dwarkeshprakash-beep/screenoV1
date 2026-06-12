import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Clock } from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import * as api from '../../services/api'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import useProctoring from '../../hooks/useProctoring'

const LANGUAGE_EXTENSIONS = {
  javascript: [javascript()],
  python: [python()],
}

function clk(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function ExamPage() {
  const { token } = useParams()
  const navigate  = useNavigate()
  const session = (() => {
    try {
      return JSON.parse(localStorage.getItem('interviewSession') || '{}')
    } catch {
      return {}
    }
  })()

  // All hooks must come before any conditional returns
  const [exam, setExam]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers]       = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [timeLeft, setTimeLeft]     = useState(3600)
  const [violation, setViolation]   = useState(null)
  const [isMobile]                  = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)

  useProctoring(session.interviewId, (type, decision) => {
    if (decision.terminated) {
      setViolation({ type, terminated: true })
      return
    }
    if (decision.warning) {
      setViolation({ type, terminated: false, message: decision.message })
    }
  })

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
    if (submitting || violation?.terminated) return
    setSubmitting(true)
    try {
      const answerList = Object.entries(answers).map(([qId, a]) => ({
        questionId: parseInt(qId, 10),
        selectedOption: a.selectedOption,
        answerText: a.answerText || '',
        code: a.code || '',
      }))
      await api.submitExam(token, answerList)
      navigate(`/interview/${token}/done`)
    } catch (err) {
      setSubmitError(err.message || 'Could not submit exam. Please try again.')
      setSubmitting(false)
    }
  }, [submitting, answers, token, navigate, violation])

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
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', height: 'calc(100vh - 56px)', background: 'var(--slate-50)', position: 'relative' }}>
      {violation && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.72)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 420, background: 'var(--bg-surface)', borderRadius: 16, padding: 28, textAlign: 'center' }}>
            <AlertTriangle size={30} color="var(--danger-600)" />
            <h2 style={{ margin: '12px 0 8px', fontSize: 20 }}>
              {violation.terminated ? 'Exam ended' : 'Integrity warning'}
            </h2>
            <p style={{ margin: '0 0 18px', color: 'var(--slate-500)', fontSize: 13, lineHeight: 1.6 }}>
              {violation.terminated
                ? 'A repeated tab or fullscreen violation ended the exam and marked the result as a cheating attempt.'
                : (violation.message || 'Another tab or fullscreen violation will end this exam.')}
            </p>
            <button
              type="button"
              onClick={() => {
                if (violation.terminated) navigate(`/interview/${token}/done`)
                else setViolation(null)
              }}
              style={{ width: '100%', padding: 11, border: 0, borderRadius: 9, background: 'var(--brand-500)', color: 'white', fontWeight: 600, cursor: 'pointer' }}
            >
              {violation.terminated ? 'View completion status' : 'Return to exam'}
            </button>
          </div>
        </div>
      )}
      {/* Left palette */}
      <div style={{ borderRight: '1px solid var(--slate-200)', background: 'var(--bg-surface)', padding: 18, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {/* Timer */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: timeLeft < 300 ? '#EF4444' : 'var(--slate-900)', background: 'var(--slate-100)', padding: '8px 12px', borderRadius: 8, justifyContent: 'center' }}>
          <Clock size={15} />{clk(timeLeft)}
        </div>

        {/* Question grid */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--slate-400)', marginBottom: 8 }}>Questions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(i)}
                style={{
                  aspectRatio: '1', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  border: `1px solid ${currentIdx === i ? 'var(--brand-500)' : answers[q.id] != null ? '#A7F3D0' : 'var(--slate-200)'}`,
                  background: currentIdx === i ? 'var(--brand-500)' : answers[q.id] != null ? 'var(--success-50)' : 'var(--bg-surface)',
                  color: currentIdx === i ? 'var(--bg-surface)' : answers[q.id] != null ? 'var(--success-600)' : 'var(--slate-500)',
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 'auto', fontSize: 12, color: 'var(--slate-500)' }}>{answeredCount}/{total} answered</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ padding: '11px 0', borderRadius: 9, background: submitting ? 'var(--slate-400)' : 'var(--brand-500)', color: 'var(--bg-surface)', border: 0, fontWeight: 600, fontSize: 13, cursor: submitting ? 'not-allowed' : 'pointer' }}
          >
            {submitting ? 'Submitting...' : 'Submit exam'}
          </button>
          {submitError && <div style={{ fontSize: 12, color: 'var(--danger-700)', textAlign: 'center' }}>{submitError}</div>}
        </div>
      </div>

      {/* Main question area */}
      <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {current && (
          <div style={{ padding: '32px 40px', overflowY: 'auto', flex: 1 }}>
            <div style={{ maxWidth: 680 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-500)', marginBottom: 8 }}>
                Question {currentIdx + 1} of {total}
                {current.phase ? ` · ${current.phase}` : ''}
              </div>

              <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--slate-900)', lineHeight: 1.5, margin: '0 0 22px' }}>
                {current.text}
              </h2>

              {/* MCQ options */}
              {current.question_type === 'mcq' ? (
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
                          border: `1px solid ${sel ? 'var(--brand-500)' : 'var(--slate-200)'}`,
                          background: sel ? '#F3F0FF' : 'var(--bg-surface)', transition: 'all 120ms',
                        }}
                      >
                        <span style={{ width: 24, height: 24, borderRadius: 9999, flexShrink: 0, border: `1.5px solid ${sel ? 'var(--brand-500)' : 'var(--slate-300)'}`, background: sel ? 'var(--brand-500)' : 'var(--bg-surface)', color: 'var(--bg-surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                          {sel ? '✓' : String.fromCharCode(65 + oi)}
                        </span>
                        <span style={{ fontSize: 14, color: 'var(--slate-900)' }}>{opt}</span>
                      </button>
                    )
                  })}
                </div>
              ) : current.question_type === 'coding' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {current.language || 'javascript'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>Reads from stdin, writes to stdout</span>
                  </div>
                  <div style={{ border: '1px solid var(--slate-300)', borderRadius: 8, overflow: 'hidden' }}>
                    <CodeMirror
                      value={answers[current.id]?.code ?? current.starter_code ?? ''}
                      height="320px"
                      extensions={LANGUAGE_EXTENSIONS[current.language] || LANGUAGE_EXTENSIONS.javascript}
                      onChange={value => setAnswers(a => ({ ...a, [current.id]: { code: value } }))}
                    />
                  </div>

                  {current.test_cases && current.test_cases.length > 0 && (
                    <div style={{ marginTop: 18 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Test cases</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {current.test_cases.map((tc, ti) => (
                          <div key={ti} style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'monospace' }}>
                            {tc.hidden ? (
                              <span style={{ color: 'var(--slate-400)' }}>Hidden test case — your code will be checked against this on submit</span>
                            ) : (
                              <>
                                <div><span style={{ color: 'var(--slate-500)' }}>Input:</span> {tc.input || '(none)'}</div>
                                <div><span style={{ color: 'var(--slate-500)' }}>Expected output:</span> {tc.expected_output}</div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  rows={6}
                  value={answers[current.id]?.answerText || ''}
                  onChange={e => setAnswers(a => ({ ...a, [current.id]: { answerText: e.target.value } }))}
                  placeholder="Type your answer here..."
                  style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--slate-300)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', lineHeight: 1.6, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--brand-500)'; e.target.style.boxShadow = '0 0 0 3px rgba(91,79,233,0.18)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--slate-300)'; e.target.style.boxShadow = 'none' }}
                />
              )}

              {/* Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
                <button
                  onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                  disabled={currentIdx === 0}
                  style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid var(--slate-300)', background: 'var(--bg-surface)', color: currentIdx === 0 ? 'var(--slate-300)' : 'var(--slate-700)', fontWeight: 600, fontSize: 13, cursor: currentIdx === 0 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>
                {isLast ? (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{ padding: '10px 18px', borderRadius: 8, border: 0, background: 'var(--brand-500)', color: 'var(--bg-surface)', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    Submit exam <ArrowRight size={13} />
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentIdx(i => i + 1)}
                    style={{ padding: '10px 18px', borderRadius: 8, border: 0, background: 'var(--brand-500)', color: 'var(--bg-surface)', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
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
            <p style={{ color: 'var(--slate-400)', fontSize: 15 }}>No questions found for this exam.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExamPage
