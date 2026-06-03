// pages/candidate/ExamPage.jsx
// Exam runner — navigates through MCQ and open-text questions with a countdown timer.
// Submits all answers at once when the candidate clicks Submit or the timer runs out.

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import * as api from '../../services/api'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'

// ── Desktop guard ─────────────────────────────────────────────
function DesktopGuard({ children }) {
  if (window.innerWidth < 768) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Please use a desktop or laptop</h2>
        <p>Exams require a larger screen for the best experience.</p>
      </div>
    )
  }
  return children
}

// ── MCQ option cards ──────────────────────────────────────────
function MCQOptions({ question, answers, setAnswers }) {
  const opts = Array.isArray(question.options) ? question.options : []
  const selected = answers[question.id]?.selectedOption

  return (
    <div style={{ marginTop: 20 }}>
      {opts.map((opt, i) => (
        <div
          key={i}
          onClick={() =>
            setAnswers(prev => ({ ...prev, [question.id]: { selectedOption: i } }))
          }
          style={{
            padding: '12px 16px',
            marginBottom: 8,
            borderRadius: 8,
            cursor: 'pointer',
            border: `2px solid ${selected === i ? 'var(--brand-500)' : 'var(--border-default)'}`,
            background: selected === i ? 'var(--brand-50)' : 'var(--bg-surface)',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--fg-body)' }}>
            {String.fromCharCode(65 + i)}. {opt}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Single question card ──────────────────────────────────────
function QuestionCard({ question, answers, setAnswers, current, total }) {
  const isOpen = question.question_type !== 'mcq'
  const answerText = answers[question.id]?.answerText || ''

  return (
    <div
      style={{
        maxWidth: 620,
        width: '100%',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderLeft: '4px solid var(--brand-500)',
        borderRadius: 12,
        padding: 24,
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Phase / order label */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--brand-500)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        Question {current} of {total}
        {question.phase ? ` · ${question.phase}` : ''}
      </div>

      {/* Question text */}
      <p style={{ fontSize: 16, color: 'var(--fg-primary)', margin: 0, lineHeight: 1.65 }}>
        {question.text}
      </p>

      {/* Answer area */}
      {isOpen ? (
        <textarea
          value={answerText}
          onChange={e =>
            setAnswers(prev => ({
              ...prev,
              [question.id]: { answerText: e.target.value },
            }))
          }
          placeholder="Type your answer here…"
          rows={5}
          style={{
            marginTop: 20,
            width: '100%',
            padding: '10px 14px',
            fontSize: 14,
            color: 'var(--fg-body)',
            background: 'var(--bg-surface-alt)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            lineHeight: 1.5,
          }}
        />
      ) : (
        <MCQOptions question={question} answers={answers} setAnswers={setAnswers} />
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
function ExamPage() {
  const { token } = useParams()
  const navigate = useNavigate()

  // Core data
  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Navigation
  const [currentIdx, setCurrentIdx] = useState(0)

  // Answers keyed by question id: { [id]: { selectedOption?, answerText? } }
  const [answers, setAnswers] = useState({})

  // Submission
  const [submitting, setSubmitting] = useState(false)

  // Countdown — 60 minutes default
  const [timeLeft, setTimeLeft] = useState(3600)

  // ── Load exam on mount ─────────────────────────────────────
  useEffect(() => {
    api.getExam(token)
      .then(r => { setExam(r.data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [token])

  // ── Submit handler ─────────────────────────────────────────
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
      navigate(`/interview/${token}/done`)
    } catch (err) {
      alert('Submit failed: ' + err.message)
      setSubmitting(false)
    }
  }, [submitting, answers, token, navigate])

  // ── Countdown timer — starts once exam data arrives ────────
  useEffect(() => {
    if (!exam) return
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval)
          handleSubmit()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [exam]) // intentionally excludes handleSubmit to avoid restarting on every answer change

  // ── Helpers ────────────────────────────────────────────────
  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const questions = exam?.questions || []
  const total = questions.length
  const current = questions[currentIdx] || null
  const isLast = currentIdx === total - 1

  // ── Render ─────────────────────────────────────────────────
  return (
    <DesktopGuard>
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Spinner />
        </div>
      )}

      {!loading && error && (
        <div style={{ padding: 40, maxWidth: 480, margin: '0 auto' }}>
          <ErrorMessage message={error} />
        </div>
      )}

      {!loading && !error && exam && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

          {/* ── Top bar ──────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 28px',
              height: 56,
              borderBottom: '1px solid var(--border-default)',
              background: 'var(--bg-surface)',
              flexShrink: 0,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--fg-primary)' }}>
              Exam
            </span>

            <span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>
              Q {currentIdx + 1} / {total}
            </span>

            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color: timeLeft < 300 ? 'var(--danger-500)' : 'var(--fg-primary)',
              }}
            >
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* ── Question area ─────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: '40px 24px',
            }}
          >
            {total === 0 && (
              <p style={{ color: 'var(--fg-muted)', fontSize: 15 }}>
                No questions found for this exam.
              </p>
            )}

            {current && (
              <QuestionCard
                question={current}
                answers={answers}
                setAnswers={setAnswers}
                current={currentIdx + 1}
                total={total}
              />
            )}
          </div>

          {/* ── Bottom navigation ─────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 28px',
              borderTop: '1px solid var(--border-default)',
              background: 'var(--bg-surface)',
              flexShrink: 0,
            }}
          >
            {/* Previous */}
            <button
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(i => i - 1)}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: '1px solid var(--border-default)',
                background: 'transparent',
                color: currentIdx === 0 ? 'var(--fg-disabled)' : 'var(--fg-body)',
                fontSize: 14,
                cursor: currentIdx === 0 ? 'default' : 'pointer',
                fontWeight: 500,
              }}
            >
              Previous
            </button>

            {/* Next or Submit */}
            {isLast ? (
              <button
                disabled={submitting}
                onClick={handleSubmit}
                style={{
                  padding: '10px 28px',
                  borderRadius: 8,
                  border: 'none',
                  background: submitting ? 'var(--brand-300)' : 'var(--brand-500)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: submitting ? 'default' : 'pointer',
                }}
              >
                {submitting ? 'Submitting…' : 'Submit Exam'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx(i => i + 1)}
                style={{
                  padding: '10px 28px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--brand-500)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </DesktopGuard>
  )
}

export default ExamPage
