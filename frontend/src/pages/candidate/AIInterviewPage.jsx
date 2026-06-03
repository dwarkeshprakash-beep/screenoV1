// pages/candidate/AIInterviewPage.jsx
// The AI interview room — waveform, question display, recording controls.

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { RotateCcw, SkipForward, AlertTriangle, Video, VideoOff } from 'lucide-react'
import useInterview from '../../hooks/useInterview'
import useProctoring from '../../hooks/useProctoring'

// Desktop-only guard
function DesktopGuard({ children }) {
  if (window.innerWidth < 768) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Please use a desktop or laptop</h2>
        <p>Interviews require a larger screen for the best experience.</p>
      </div>
    )
  }
  return children
}

// Animated waveform circle
function WaveformCircle({ phase }) {
  const configs = {
    loading:     { color: 'var(--slate-300)', pulse: false, label: 'Loading…' },
    ai_speaking: { color: 'var(--brand-500)', pulse: true,  label: 'AI is speaking…' },
    listening:   { color: 'var(--success-500)', pulse: false, label: 'Your turn' },
    recording:   { color: 'var(--danger-500)', pulse: true,  label: 'Recording…' },
    processing:  { color: 'var(--warning-500)', pulse: true,  label: 'Processing…' },
    paused:      { color: 'var(--warning-500)', pulse: false, label: 'Paused' },
    ended:       { color: 'var(--success-500)', pulse: false, label: 'Complete' },
    error:       { color: 'var(--danger-500)', pulse: false, label: 'Error' },
  }
  const c = configs[phase] || configs.loading

  return (
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Outer pulse ring */}
        {c.pulse && (
          <div style={{
            position: 'absolute', inset: -20,
            borderRadius: '50%',
            border: `3px solid ${c.color}`,
            opacity: 0.3,
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        )}
        <div style={{
          width: 180, height: 180,
          borderRadius: '50%',
          border: `5px solid ${c.color}`,
          background: `${c.color}12`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 0.3s, background 0.3s',
        }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: c.color, opacity: phase === 'recording' ? 1 : 0.4 }} />
        </div>
      </div>
      <p style={{ marginTop: 16, fontSize: 15, color: 'var(--fg-muted)', fontWeight: 500 }}>{c.label}</p>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50%       { transform: scale(1.15); opacity: 0.1; }
        }
      `}</style>
    </div>
  )
}

function AIInterviewPage() {
  const { token } = useParams()
  const navigate = useNavigate()

  // Load session from localStorage
  const session = (() => {
    try { return JSON.parse(localStorage.getItem('interviewSession') || '{}') } catch { return {} }
  })()

  const { interviewId, mode } = session

  const {
    phase, currentQuestion, transcript, totalQuestions, currentIndex,
    error: interviewError, startInterview, startRecording, stopRecording, repeatQuestion, pause, resume,
  } = useInterview(interviewId, mode)

  const [violation, setViolation] = useState(null)
  const [showTranscript, setShowTranscript] = useState(false)
  const cameraVideoRef = useRef(null)

  useProctoring(interviewId, (type) => {
    pause()
    setViolation(type)
  })

  // Start interview on mount
  useEffect(() => {
    if (interviewId) startInterview()
  }, [interviewId])

  // Redirect when done
  useEffect(() => {
    if (phase === 'ended') {
      navigate(`/interview/${token}/done`)
    }
  }, [phase])

  // Start camera preview
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream
        cameraVideoRef.current.play().catch(() => {})
      }
    }).catch(() => {})
  }, [])

  function handleResumeViolation() {
    setViolation(null)
    resume()
  }

  if (!interviewId) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--danger-500)' }}>No interview session found. Please use your magic link.</p>
      </div>
    )
  }

  if (interviewError) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--danger-500)' }}>{interviewError}</p>
      </div>
    )
  }

  return (
    <DesktopGuard>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

        {/* Integrity violation overlay */}
        {violation && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: 40, maxWidth: 400, textAlign: 'center' }}>
              <AlertTriangle size={40} color="var(--warning-500)" style={{ marginBottom: 16 }} />
              <h3 style={{ marginBottom: 8 }}>You switched windows</h3>
              <p style={{ color: 'var(--fg-muted)', fontSize: 14, marginBottom: 24 }}>This has been recorded. Please keep the interview tab active.</p>
              <button onClick={handleResumeViolation} style={{ padding: '12px 24px', background: 'var(--brand-500)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                I understand — resume interview
              </button>
            </div>
          </div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', gap: 0 }}>
          <WaveformCircle phase={phase} />

          {/* Current question card */}
          {currentQuestion && (
            <div style={{ maxWidth: 560, width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderLeft: '4px solid var(--brand-500)', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: 'var(--shadow-md)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand-500)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                Question {currentIndex + 1}{totalQuestions > 0 ? ` of ${totalQuestions}` : ''}
              </div>
              <p style={{ fontSize: 16, color: 'var(--fg-primary)', margin: 0, lineHeight: 1.6 }}>{currentQuestion.text}</p>
            </div>
          )}

          {/* Controls */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {phase === 'listening' && (
              <button
                onClick={startRecording}
                style={{ padding: '14px 32px', background: 'var(--success-500)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(5,150,105,0.35)' }}
              >
                ● Start Answer
              </button>
            )}

            {phase === 'recording' && (
              <button
                onClick={stopRecording}
                style={{ padding: '14px 32px', background: 'var(--danger-500)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,92,53,0.35)', animation: 'pulse 1s infinite' }}
              >
                ■ Stop Answer
              </button>
            )}

            {(phase === 'listening' || phase === 'recording') && (
              <button onClick={repeatQuestion} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 10, fontSize: 13, cursor: 'pointer', color: 'var(--fg-muted)' }}>
                <RotateCcw size={14} /> Repeat
              </button>
            )}
          </div>

          {/* Transcript toggle */}
          <button
            onClick={() => setShowTranscript(s => !s)}
            style={{ marginTop: 20, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--brand-500)' }}
          >
            {showTranscript ? 'Hide transcript' : 'Show transcript'}
          </button>

          {showTranscript && transcript.length > 0 && (
            <div style={{ maxWidth: 560, width: '100%', maxHeight: 200, overflowY: 'auto', marginTop: 12, background: 'var(--bg-surface-alt)', borderRadius: 10, padding: 16 }}>
              {transcript.map((t, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--brand-500)', fontWeight: 600, marginBottom: 2 }}>Q: {t.question}</div>
                  <div style={{ fontSize: 13, color: 'var(--fg-body)' }}>A: {t.answer}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Camera preview (bottom left) */}
        <div style={{ position: 'fixed', bottom: 24, left: 24 }}>
          <video ref={cameraVideoRef} muted playsInline style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff', boxShadow: 'var(--shadow-md)', background: '#000' }} />
        </div>
      </div>
    </DesktopGuard>
  )
}

export default AIInterviewPage
