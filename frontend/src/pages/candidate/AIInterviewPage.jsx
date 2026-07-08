import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, PhoneOff, Sparkles, Volume2, Ear, Loader2, Circle, Square, Check, Clock, Timer, Info, AlertTriangle, CameraOff } from 'lucide-react'
import useInterview from '../../hooks/useInterview'
import useProctoring from '../../hooks/useProctoring'
import Avatar from '../../components/shared/Avatar'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'

function clk(s) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}` }

function AIInterviewPage() {
  const { token } = useParams()
  const navigate = useNavigate()

  const session = (() => { try { return JSON.parse(localStorage.getItem('interviewSession') || '{}') } catch { return {} } })()
  const { interviewId, mode, transcriptionMode } = session
  const configuredDurationMinutes = Number(session.durationMinutes) > 0 ? Number(session.durationMinutes) : 25

  const {
    phase, currentQuestion, transcript, liveTranscript, currentIndex, totalQuestions,
    error: interviewError, startInterview, startRecording, stopRecording, pause, resume, interviewMode,
    finishInterview, submitManualAnswer, manualRetry, muteRecording, unmuteRecording,
  } = useInterview(interviewId, mode, transcriptionMode)

  const [violation, setViolation] = useState(null)
  const [endConfirmOpen, setEndConfirmOpen] = useState(false)
  const [muted, setMuted]         = useState(false)
  const [recordingMuted, setRecordingMuted] = useState(false)
  const [manualText, setManualText] = useState('')
  const [remaining, setRemaining] = useState(() => configuredDurationMinutes * 60)
  const [recElapsed, setRecEl]    = useState(0)
  const [cameraReady, setCameraReady] = useState(false)
  const cameraVideoRef = useRef(null)
  const txRef          = useRef(null)

  useProctoring(interviewId, (type, decision) => {
    window.speechSynthesis?.cancel()
    if (decision.terminated) {
      setViolation({ type, terminated: true })
      return
    }
    if (decision.warning) {
      pause()
      setViolation({ type, terminated: false, message: decision.message })
    }
  })

  useEffect(() => { if (interviewId) startInterview() }, [interviewId, startInterview])
  useEffect(() => { if (phase === 'ended') navigate(`/interview/${token}/done`) }, [phase, navigate, token])
  useEffect(() => {
    let stream
    if (!navigator.mediaDevices?.getUserMedia) return

    navigator.mediaDevices.getUserMedia({ video: true }).then(mediaStream => {
      stream = mediaStream
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = mediaStream
        cameraVideoRef.current.play().then(() => setCameraReady(true)).catch(() => {})
      }
    }).catch(() => setCameraReady(false))

    return () => stream?.getTracks().forEach(track => track.stop())
  }, [])

  useEffect(() => {
    if (phase === 'ended' || violation) return
    const t = setInterval(() => setRemaining(r => {
      if (r <= 1) {
        finishInterview('completed')
        return 0
      }
      return r - 1
    }), 1000)
    return () => clearInterval(t)
  }, [phase, violation, finishInterview])

  useEffect(() => {
    if (phase !== 'recording' || violation) return
    setRecEl(0)
    const t = setInterval(() => setRecEl(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [phase, violation])

  useEffect(() => {
    if (phase !== 'recording') setRecordingMuted(false)
  }, [phase])

  useEffect(() => {
    if (phase !== 'listening' || violation || muted) return
    const t = setTimeout(() => startRecording(), 600)
    return () => clearTimeout(t)
  }, [phase, violation, muted, startRecording])

  useEffect(() => { if (txRef.current) txRef.current.scrollTop = txRef.current.scrollHeight }, [transcript, liveTranscript, phase])

  if (!interviewId) return (
    <div style={{ padding: 40, textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
      <p style={{ color: 'var(--danger-700)', fontWeight: 600 }}>No interview session found.</p>
      <p style={{ color: 'var(--fg-muted)', fontSize: 14, marginTop: 8 }}>Please use the original magic link from your invitation email to start your interview.</p>
    </div>
  )
  if (interviewError && phase === 'error') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 40 }}>
      <div style={{ maxWidth: 440, textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 16, padding: 36 }}>
        <AlertTriangle size={36} color="var(--danger-500)" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>Something went wrong</h2>
        <p style={{ fontSize: 14, color: 'var(--fg-muted)', margin: '0 0 20px', lineHeight: 1.6 }}>{interviewError}</p>
        <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: '0 0 20px' }}>Your answers up to this point have been saved.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 0, background: 'var(--brand-500)', color: 'var(--bg-surface)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
        >
          Try reloading
        </button>
      </div>
    </div>
  )

  const isRecording  = phase === 'recording'
  const isProcessing = phase === 'processing'
  const isDone       = phase === 'ended'
  const isListening  = phase === 'listening'
  const canStartAnswer = (isListening || phase === 'ai_speaking') && !muted && !manualRetry
  const questionCount = totalQuestions || 0
  const modeLabel = interviewMode === 'adaptive'
    ? 'Adaptive AI · dynamic questions'
    : `Fixed AI · ${questionCount} question${questionCount !== 1 ? 's' : ''}`
  const questionNumber = currentQuestion?.order_num || (currentIndex || 0) + 1
  const questionProgress = interviewMode === 'adaptive'
    ? `Adaptive · Question ${questionNumber}`
    : `Question ${questionNumber} of ${questionCount || '…'}`

  const aiState = isRecording ? 'listening' : isListening ? 'ready' : isProcessing ? 'thinking' : 'speaking'
  const orbConfig = {
    speaking:  { bg: 'linear-gradient(135deg,var(--brand-100),var(--brand-500) 70%,var(--brand-600))', shadow: '0 12px 36px rgba(91,79,233,0.35)', label: 'Asking…',     Icon: Volume2,  labelColor: 'var(--brand-500)' },
    thinking:  { bg: 'radial-gradient(circle at 35% 30%,var(--brand-100),var(--brand-500) 90%)', shadow: '0 12px 28px rgba(91,79,233,0.18)', label: 'Processing…', Icon: Loader2, labelColor: 'var(--slate-400)' },
    listening: { bg: 'radial-gradient(circle at 35% 30%,var(--success-100),var(--success-500) 75%)', shadow: '0 12px 28px rgba(5,150,105,0.32)', label: 'Listening…',  Icon: Ear,     labelColor: 'var(--success-500)' },
    ready:     { bg: 'radial-gradient(circle at 35% 30%,#E0E7FF,var(--brand-500) 80%)', shadow: '0 12px 28px rgba(91,79,233,0.2)', label: 'Ready for your answer', Icon: Mic, labelColor: 'var(--brand-500)' },
  }[aiState]

  const candidateName = session.candidateName || 'You'

  async function handleMicToggle() {
    if (isRecording) {
      if (recordingMuted) {
        unmuteRecording()
        setRecordingMuted(false)
      } else {
        muteRecording()
        setRecordingMuted(true)
      }
      return
    }
    if (isListening) {
      setMuted(false)
      await startRecording()
      return
    }
    setMuted(m => !m)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 440px', height: 'calc(100vh - 60px)', position: 'relative', overflow: 'hidden' }}>

      {violation && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: '32px 28px', maxWidth: 420, textAlign: 'center', boxShadow: '0 24px 48px rgba(15,23,42,0.24)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 9999, background: '#FEF2F2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <AlertTriangle size={26} color="#EF4444" />
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--slate-900)', marginBottom: 8 }}>
              {violation.terminated ? 'Interview ended' : 'Integrity warning'}
            </div>
            <p style={{ fontSize: 13, color: 'var(--slate-500)', lineHeight: 1.6, margin: '0 0 20px' }}>
              {violation.terminated
                ? 'A repeated tab or fullscreen violation ended this interview and marked the result as a cheating attempt.'
                : (violation.message || 'Another tab or fullscreen violation will end this interview.')}
            </p>
            <button
              onClick={() => {
                if (violation.terminated) navigate(`/interview/${token}/done`)
                else {
                  setViolation(null)
                  resume()
                }
              }}
              style={{ width: '100%', padding: '12px 20px', background: 'var(--brand-500)', color: 'var(--bg-surface)', border: 0, borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            >
              {violation.terminated ? 'View completion status' : 'Resume interview'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 48px', gap: 22, background: 'var(--bg-surface)', borderRight: '1px solid var(--slate-200)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 480, height: 480, borderRadius: 9999, background: 'radial-gradient(circle,rgba(91,79,233,0.08) 0%,transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />

        <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600 }}>
          <span style={{ width: 7, height: 7, borderRadius: 9999, background: isRecording ? '#EF4444' : isListening ? 'var(--success-500)' : 'var(--slate-400)', animation: isRecording || isListening ? 'v2pulse 1.4s ease-in-out infinite' : 'none', display: 'inline-block' }} />
          <span style={{ color: isRecording ? '#EF4444' : isListening ? 'var(--success-500)' : 'var(--slate-400)' }}>{isRecording ? 'RECORDING' : isListening ? 'READY' : 'STANDBY'}</span>
          <span style={{ color: 'var(--brand-500)', background: 'var(--brand-50)', padding: '4px 8px', borderRadius: 9999 }}>{modeLabel}</span>
        </div>

        <div style={{ position: 'absolute', top: 14, right: 16, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: remaining < 120 ? '#EF4444' : 'var(--slate-900)', background: 'var(--slate-100)', padding: '5px 10px', borderRadius: 8 }}>
          <Clock size={13} /> {clk(remaining)} left
        </div>

        <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {aiState === 'listening' && [0, 1, 2].map(i => (
            <span key={i} style={{ position: 'absolute', width: 150, height: 150, borderRadius: 9999, border: '2px solid var(--success-500)', animation: `v2ring 2.4s ease-out ${i * 800}ms infinite`, opacity: 0, display: 'inline-block' }} />
          ))}
          <div style={{ width: 130, height: 130, borderRadius: 9999, background: orbConfig.bg, boxShadow: orbConfig.shadow, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: violation ? 'none' : 'v2orbpulse 2s ease-in-out infinite', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 9999, background: 'radial-gradient(circle at 35% 30%,rgba(255,255,255,0.5) 0%,transparent 40%)' }} />
            <Sparkles size={46} color="var(--bg-surface)" style={{ position: 'relative', zIndex: 1 }} />
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand-500)', marginBottom: 4 }}>
            Screeno AI · {questionProgress}
          </div>
          <div style={{ fontSize: 13, color: orbConfig.labelColor, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <orbConfig.Icon size={14} style={{ animation: aiState === 'thinking' ? 'v2spin 1.2s linear infinite' : 'none' }} />
            {orbConfig.label}
          </div>
        </div>

        {currentQuestion && (
          <div style={{ width: '100%', maxWidth: 440, background: '#FAFAFE', border: '1px solid var(--brand-100)', borderRadius: 14, padding: '18px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--brand-500)', marginBottom: 8 }}>
              {currentQuestion.phase || 'Question'}
            </div>
            <div style={{ fontSize: 16, color: 'var(--slate-900)', lineHeight: 1.5, fontWeight: 500 }}>
              {isDone ? 'That\'s the last question — thanks! You can end the interview now.' : currentQuestion.text}
            </div>
            {!isDone && isRecording && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--slate-400)', display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'monospace' }}>
                <Timer size={13} /> Recording {clk(recElapsed)}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 40 }}>
          {[...Array(16)].map((_, i) => (
            <span key={i} style={{ width: 4, height: 34, borderRadius: 9999, background: isRecording ? 'var(--success-500)' : aiState === 'speaking' ? 'var(--brand-500)' : 'var(--slate-300)', animation: violation || isProcessing ? 'none' : `v2wave 1.2s ease-in-out ${i * 70}ms infinite`, transform: 'scaleY(0.25)', transformOrigin: 'center', display: 'inline-block' }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={handleMicToggle} title={recordingMuted ? 'Unmute microphone' : muted ? 'Microphone muted' : isRecording ? 'Mute microphone' : 'Microphone available'} style={{ width: 52, height: 52, borderRadius: 9999, background: recordingMuted || muted ? '#FEF2F2' : 'var(--bg-surface)', border: `1px solid ${recordingMuted || muted ? '#FECACA' : 'var(--slate-300)'}`, color: recordingMuted || muted ? '#EF4444' : 'var(--slate-900)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 120ms' }}>
            {recordingMuted || muted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {canStartAnswer && (
            <button
              onClick={startRecording}
              style={{ height: 52, padding: '0 26px', borderRadius: 9999, background: 'var(--success-500)', color: 'var(--bg-surface)', border: 0, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 16px rgba(5,150,105,0.3)' }}
            >
              <Circle size={16} fill="var(--bg-surface)" /> {phase === 'ai_speaking' ? 'Answer now' : 'Start answer'}
            </button>
          )}
          {isRecording && (
            <button
              onClick={stopRecording}
              style={{ height: 52, padding: '0 26px', borderRadius: 9999, background: '#EF4444', color: 'var(--bg-surface)', border: 0, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 16px rgba(239,68,68,0.3)', animation: 'v2recpulse 1.6s ease-in-out infinite' }}
            >
              <Square size={15} fill="var(--bg-surface)" /> Stop answer · {clk(recElapsed)}
            </button>
          )}
          {isProcessing && (
            <button disabled style={{ height: 52, padding: '0 26px', borderRadius: 9999, background: 'var(--slate-200)', color: '#64748B', border: 0, fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={16} style={{ animation: 'v2spin 1s linear infinite' }} /> Processing…
            </button>
          )}
          {isDone && (
            <button onClick={() => navigate(`/interview/${token}/done`)} style={{ height: 52, padding: '0 26px', borderRadius: 9999, background: 'var(--brand-500)', color: 'var(--bg-surface)', border: 0, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 16px rgba(91,79,233,0.3)' }}>
              <Check size={16} /> Finish &amp; submit
            </button>
          )}

          <button onClick={() => setEndConfirmOpen(true)} style={{ width: 52, height: 52, borderRadius: 9999, background: 'var(--bg-surface)', border: '1px solid var(--danger-100)', color: 'var(--danger-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <PhoneOff size={20} />
          </button>
        </div>

        {manualRetry && (
          <div style={{ width: '100%', maxWidth: 460, background: 'var(--warning-50)', border: '1px solid var(--warning-100)', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning-700)', marginBottom: 6 }}>Transcription failed. Type your answer to continue.</div>
            <textarea value={manualText} onChange={e => setManualText(e.target.value)} rows={4} style={{ width: '100%', border: '1px solid #FDE68A', borderRadius: 8, padding: 10, resize: 'vertical', boxSizing: 'border-box' }} />
            <button onClick={async () => { const ok = await submitManualAnswer(manualText); if (ok) setManualText('') }} style={{ marginTop: 8, padding: '9px 14px', borderRadius: 8, border: 0, background: 'var(--warning-600)', color: 'var(--bg-surface)', fontWeight: 600, cursor: 'pointer' }}>
              Save typed answer
            </button>
          </div>
        )}

        {interviewError && (
          <div style={{ maxWidth: 440, padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12, textAlign: 'center' }}>
            {interviewError}
          </div>
        )}

        <p style={{ fontSize: 11, color: 'var(--slate-400)', textAlign: 'center', maxWidth: 340, lineHeight: 1.6 }}>
          Recording starts automatically. Press <strong>Stop</strong> when done.
        </p>

        <div style={{ position: 'absolute', bottom: 14, left: 14, width: 92, height: 92, borderRadius: 16, background: 'var(--slate-100)', border: '3px solid var(--bg-surface)', boxShadow: '0 8px 20px rgba(15,23,42,0.2)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video ref={cameraVideoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraReady ? 'block' : 'none' }} />
          {!cameraReady && (
            <div style={{ color: '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 10 }}>
              <CameraOff size={22} />
              Camera off
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', height: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--slate-100)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-500)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Live transcript</div>
          <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 2 }}>Builds as the interview goes</div>
        </div>
        <div ref={txRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {transcript.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 12 }}>
              {t.who === 'ai' || !t.who ? (
                <div style={{ width: 30, height: 30, borderRadius: 9999, background: 'var(--brand-50)', color: 'var(--brand-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Sparkles size={14} />
                </div>
              ) : <Avatar name={candidateName} size={30} />}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: (!t.who || t.who === 'ai') ? 'var(--brand-500)' : 'var(--slate-900)' }}>
                    {(!t.who || t.who === 'ai') ? 'Screeno AI' : candidateName}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--slate-700)', lineHeight: 1.65 }}>
                  {t.question || t.answer || t.text || ''}
                </div>
              </div>
            </div>
          ))}
          {isRecording && (
            <div style={{ display: 'flex', gap: 12, opacity: 0.85 }}>
              <Avatar name={candidateName} size={30} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-900)', marginBottom: 4 }}>{candidateName} · transcribing…</div>
                {liveTranscript ? (
                  <div style={{ fontSize: 14, color: 'var(--slate-700)', lineHeight: 1.65 }}>{liveTranscript}</div>
                ) : (
                <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
                  {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: 9999, background: 'var(--slate-400)', animation: `v2pulsedot 1.4s ease-in-out ${i * 0.2}s infinite`, display: 'inline-block' }} />)}
                </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--slate-100)', fontSize: 12, color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Info size={13} color="var(--slate-400)" />
          {questionProgress} · {clk(remaining)} remaining
        </div>
      </div>

      <style>{`
        @keyframes v2wave { 0%,100%{transform:scaleY(0.2);opacity:0.8} 50%{transform:scaleY(1);opacity:1} }
        @keyframes v2ring { 0%{transform:scale(0.6);opacity:0.7} 100%{transform:scale(1.8);opacity:0} }
        @keyframes v2orbpulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        @keyframes v2pulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
        @keyframes v2pulsedot { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes v2recpulse { 0%,100%{box-shadow:0 6px 16px rgba(239,68,68,0.3)} 50%{box-shadow:0 6px 22px rgba(239,68,68,0.55)} }
        @keyframes v2spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      <Modal open={endConfirmOpen} onClose={() => setEndConfirmOpen(false)} title="End interview early?" size="sm">
        <p style={{ margin: '0 0 18px', color: 'var(--slate-600)', fontSize: 14, lineHeight: 1.6 }}>
          Your recorded answers will be kept, but this interview will be marked as failed mid-interview.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={() => setEndConfirmOpen(false)}>Continue interview</Button>
          <Button onClick={async () => {
            setEndConfirmOpen(false)
            await finishInterview('abandoned')
          }}>End interview</Button>
        </div>
      </Modal>
    </div>
  )
}

export default AIInterviewPage
