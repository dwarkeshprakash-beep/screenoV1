import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, PhoneOff, Sparkles, Volume2, Ear, Loader2, Circle, Square, Check, Clock, Timer, Info, AlertTriangle, CameraOff } from 'lucide-react'
import useInterview from '../../hooks/useInterview'
import useProctoring from '../../hooks/useProctoring'

const AV_COLORS = [
  {bg:'#EDE9FE',fg:'#5B21B6'},{bg:'#FED7AA',fg:'#9A3412'},{bg:'#A7F3D0',fg:'#065F46'},
  {bg:'#BFDBFE',fg:'#1E40AF'},{bg:'#FBCFE8',fg:'#9D174D'},{bg:'#FDE68A',fg:'#854D0E'},
  {bg:'#C7D2FE',fg:'#3730A3'},{bg:'#FCA5A5',fg:'#7F1D1D'},
]
function V2Av({ name = '', size = 32 }) {
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase() || '?'
  const c = AV_COLORS[name.charCodeAt(0) % AV_COLORS.length]
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: c.bg, color: c.fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

function clk(s) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}` }

function AIInterviewPage() {
  const { token } = useParams()
  const navigate = useNavigate()

  const session = (() => { try { return JSON.parse(localStorage.getItem('interviewSession') || '{}') } catch { return {} } })()
  const { interviewId, mode, transcriptionMode } = session

  const {
    phase, currentQuestion, transcript, liveTranscript, totalQuestions, currentIndex,
    error: interviewError, startInterview, startRecording, stopRecording, repeatQuestion, pause, resume, interviewMode,
    finishInterview, submitManualAnswer, manualRetry,
    attemptId,
  } = useInterview(interviewId, mode, transcriptionMode)

  const [violation, setViolation] = useState(null)
  const [muted, setMuted]         = useState(false)
  const [manualText, setManualText] = useState('')
  const [remaining, setRemaining] = useState(25 * 60)
  const [recElapsed, setRecEl]    = useState(0)
  const [cameraReady, setCameraReady] = useState(false)
  const cameraVideoRef = useRef(null)
  const txRef          = useRef(null)

  useProctoring(interviewId, attemptId, (type) => { pause(); setViolation(type) })

  useEffect(() => { if (interviewId) startInterview() }, [interviewId])
  useEffect(() => { if (phase === 'ended') navigate(`/interview/${token}/done`) }, [phase])
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
    if (phase !== 'listening' || violation || muted) return
    const t = setTimeout(() => startRecording(), 600)
    return () => clearTimeout(t)
  }, [phase, violation, muted])

  useEffect(() => { if (txRef.current) txRef.current.scrollTop = txRef.current.scrollHeight }, [transcript, phase])

  if (!interviewId) return <div style={{ padding: 40, textAlign: 'center', color: '#EF4444' }}>No interview session found. Please use your magic link.</div>
  if (interviewError && phase === 'error') return <div style={{ padding: 40, textAlign: 'center', color: '#EF4444' }}>{interviewError}</div>

  const isRecording  = phase === 'recording'
  const isProcessing = phase === 'processing'
  const isDone       = phase === 'ended'
  const isListening  = phase === 'listening'
  const canStartAnswer = (isListening || phase === 'ai_speaking') && !muted && !manualRetry
  const modeLabel = interviewMode === 'adaptive'
    ? 'Adaptive AI · dynamic questions'
    : 'Fixed AI · 10 questions'
  const questionNumber = currentQuestion?.order_num || (currentIndex || 0) + 1
  const questionProgress = interviewMode === 'adaptive'
    ? `Adaptive · Question ${questionNumber}`
    : `Question ${questionNumber} of 10`

  const aiState = isRecording ? 'listening' : isListening ? 'ready' : isProcessing ? 'thinking' : 'speaking'
  const orbConfig = {
    ready:     { bg: 'radial-gradient(circle at 35% 30%,#D1FAE5,#059669 75%)', shadow: '0 12px 28px rgba(5,150,105,0.24)', label: 'Ready...', Icon: Mic, labelColor: '#059669' },
    speaking:  { bg: 'linear-gradient(135deg,#DEDAFB,#5B4FE9 70%,#4A3FCE)', shadow: '0 12px 36px rgba(91,79,233,0.35)', label: 'Asking…',     Icon: Volume2,  labelColor: '#5B4FE9' },
    thinking:  { bg: 'radial-gradient(circle at 35% 30%,#DEDAFB,#5B4FE9 90%)', shadow: '0 12px 28px rgba(91,79,233,0.18)', label: 'Processing…', Icon: Loader2, labelColor: '#94A3B8' },
    listening: { bg: 'radial-gradient(circle at 35% 30%,#D1FAE5,#059669 75%)', shadow: '0 12px 28px rgba(5,150,105,0.32)', label: 'Listening…',  Icon: Ear,     labelColor: '#059669' },
    ready:     { bg: 'radial-gradient(circle at 35% 30%,#E0E7FF,#5B4FE9 80%)', shadow: '0 12px 28px rgba(91,79,233,0.2)', label: 'Ready for your answer', Icon: Mic, labelColor: '#5B4FE9' },
  }[aiState]

  const candidateName = session.candidateName || 'You'

  async function handleMicToggle() {
    if (isRecording) {
      await stopRecording()
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
          <div style={{ background: '#FFF', borderRadius: 16, padding: '32px 28px', maxWidth: 420, textAlign: 'center', boxShadow: '0 24px 48px rgba(15,23,42,0.24)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 9999, background: '#FEF2F2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <AlertTriangle size={26} color="#EF4444" />
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Tab switch detected</div>
            <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, margin: '0 0 20px' }}>
              Leaving this tab during the interview is logged and may affect your evaluation. The interview is paused until you return.
            </p>
            <button onClick={() => { setViolation(null); resume() }} style={{ width: '100%', padding: '12px 20px', background: '#5B4FE9', color: '#FFF', border: 0, borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Resume interview
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 48px', gap: 22, background: '#FFF', borderRight: '1px solid #E2E8F0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 480, height: 480, borderRadius: 9999, background: 'radial-gradient(circle,rgba(91,79,233,0.08) 0%,transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />

        <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600 }}>
          <span style={{ width: 7, height: 7, borderRadius: 9999, background: isRecording ? '#EF4444' : isListening ? '#059669' : '#94A3B8', animation: isRecording || isListening ? 'v2pulse 1.4s ease-in-out infinite' : 'none', display: 'inline-block' }} />
          <span style={{ color: isRecording ? '#EF4444' : isListening ? '#059669' : '#94A3B8' }}>{isRecording ? 'RECORDING' : isListening ? 'READY' : 'STANDBY'}</span>
          <span style={{ color: '#5B4FE9', background: '#EFEDFD', padding: '4px 8px', borderRadius: 9999 }}>{modeLabel}</span>
        </div>

        <div style={{ position: 'absolute', top: 14, right: 16, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: remaining < 120 ? '#EF4444' : '#0F172A', background: '#F1F5F9', padding: '5px 10px', borderRadius: 8 }}>
          <Clock size={13} /> {clk(remaining)} left
        </div>

        <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {aiState === 'listening' && [0, 1, 2].map(i => (
            <span key={i} style={{ position: 'absolute', width: 150, height: 150, borderRadius: 9999, border: '2px solid #059669', animation: `v2ring 2.4s ease-out ${i * 800}ms infinite`, opacity: 0, display: 'inline-block' }} />
          ))}
          <div style={{ width: 130, height: 130, borderRadius: 9999, background: orbConfig.bg, boxShadow: orbConfig.shadow, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: violation ? 'none' : 'v2orbpulse 2s ease-in-out infinite', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 9999, background: 'radial-gradient(circle at 35% 30%,rgba(255,255,255,0.5) 0%,transparent 40%)' }} />
            <Sparkles size={46} color="#FFF" style={{ position: 'relative', zIndex: 1 }} />
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5B4FE9', marginBottom: 4 }}>
            Screeno AI · {questionProgress}
          </div>
          <div style={{ fontSize: 13, color: orbConfig.labelColor, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <orbConfig.Icon size={14} style={{ animation: aiState === 'thinking' ? 'v2spin 1.2s linear infinite' : 'none' }} />
            {orbConfig.label}
          </div>
        </div>

        {currentQuestion && (
          <div style={{ width: '100%', maxWidth: 440, background: '#FAFAFE', border: '1px solid #DEDAFB', borderRadius: 14, padding: '18px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5B4FE9', marginBottom: 8 }}>
              {currentQuestion.phase || 'Question'}
            </div>
            <div style={{ fontSize: 16, color: '#0F172A', lineHeight: 1.5, fontWeight: 500 }}>
              {isDone ? 'That\'s the last question — thanks! You can end the interview now.' : currentQuestion.text}
            </div>
            {!isDone && isRecording && (
              <div style={{ marginTop: 12, fontSize: 12, color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'monospace' }}>
                <Timer size={13} /> Recording {clk(recElapsed)}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 40 }}>
          {[...Array(16)].map((_, i) => (
            <span key={i} style={{ width: 4, height: 34, borderRadius: 9999, background: isRecording ? '#059669' : aiState === 'speaking' ? '#5B4FE9' : '#CBD5E1', animation: violation || isProcessing ? 'none' : `v2wave 1.2s ease-in-out ${i * 70}ms infinite`, transform: 'scaleY(0.25)', transformOrigin: 'center', display: 'inline-block' }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={handleMicToggle} title={muted ? 'Microphone muted' : 'Microphone available'} style={{ width: 52, height: 52, borderRadius: 9999, background: isRecording || muted ? '#FEF2F2' : '#FFF', border: `1px solid ${isRecording || muted ? '#FECACA' : '#CBD5E1'}`, color: isRecording || muted ? '#EF4444' : '#0F172A', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 120ms' }}>

            {muted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {canStartAnswer && (
            <button
              onClick={startRecording}
              style={{ height: 52, padding: '0 26px', borderRadius: 9999, background: '#059669', color: '#FFF', border: 0, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 16px rgba(5,150,105,0.3)' }}
            >
              <Circle size={16} fill="#FFF" /> {phase === 'ai_speaking' ? 'Answer now' : 'Start answer'}
            </button>
          )}
          {isRecording && (
            <button
              onClick={stopRecording}
              style={{ height: 52, padding: '0 26px', borderRadius: 9999, background: '#EF4444', color: '#FFF', border: 0, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 16px rgba(239,68,68,0.3)', animation: 'v2recpulse 1.6s ease-in-out infinite' }}
            >
              <Square size={15} fill="#FFF" /> Stop answer · {clk(recElapsed)}
            </button>
          )}
          {isProcessing && (
            <button disabled style={{ height: 52, padding: '0 26px', borderRadius: 9999, background: '#E2E8F0', color: '#64748B', border: 0, fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={16} style={{ animation: 'v2spin 1s linear infinite' }} /> Processing…
            </button>
          )}
          {isDone && (
            <button onClick={() => navigate(`/interview/${token}/done`)} style={{ height: 52, padding: '0 26px', borderRadius: 9999, background: '#5B4FE9', color: '#FFF', border: 0, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 16px rgba(91,79,233,0.3)' }}>
              <Check size={16} /> Finish &amp; submit
            </button>
          )}

          <button onClick={() => { if (window.confirm('End this interview early? It will be marked abandoned.')) finishInterview('abandoned') }} style={{ width: 52, height: 52, borderRadius: 9999, background: '#FFF', border: '1px solid #FFD4C2', color: '#E0451F', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <PhoneOff size={20} />
          </button>
        </div>

        {manualRetry && (
          <div style={{ width: '100%', maxWidth: 460, background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 6 }}>Transcription failed. Type your answer to continue.</div>
            <textarea value={manualText} onChange={e => setManualText(e.target.value)} rows={4} style={{ width: '100%', border: '1px solid #FDE68A', borderRadius: 8, padding: 10, resize: 'vertical', boxSizing: 'border-box' }} />
            <button onClick={async () => { const ok = await submitManualAnswer(manualText); if (ok) setManualText('') }} style={{ marginTop: 8, padding: '9px 14px', borderRadius: 8, border: 0, background: '#B45309', color: '#FFF', fontWeight: 600, cursor: 'pointer' }}>
              Save typed answer
            </button>
          </div>
        )}

        {interviewError && (
          <div style={{ maxWidth: 440, padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12, textAlign: 'center' }}>
            {interviewError}
          </div>
        )}

        <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', maxWidth: 340, lineHeight: 1.6 }}>
          Recording starts automatically. Press <strong>Stop</strong> when done.
        </p>

        <div style={{ position: 'absolute', bottom: 14, left: 14, width: 92, height: 92, borderRadius: 16, background: '#F1F5F9', border: '3px solid #FFF', boxShadow: '0 8px 20px rgba(15,23,42,0.2)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video ref={cameraVideoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraReady ? 'block' : 'none' }} />
          {!cameraReady && (
            <div style={{ color: '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 10 }}>
              <CameraOff size={22} />
              Camera off
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', background: '#FFF', height: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#5B4FE9', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Live transcript</div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Builds as the interview goes</div>
        </div>
        <div ref={txRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {transcript.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 12 }}>
              {t.who === 'ai' || !t.who ? (
                <div style={{ width: 30, height: 30, borderRadius: 9999, background: '#EFEDFD', color: '#5B4FE9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Sparkles size={14} />
                </div>
              ) : <V2Av name={candidateName} size={30} />}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: (!t.who || t.who === 'ai') ? '#5B4FE9' : '#0F172A' }}>
                    {(!t.who || t.who === 'ai') ? 'Screeno AI' : candidateName}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.65 }}>
                  {t.question || t.answer || t.text || ''}
                </div>
              </div>
            </div>
          ))}
          {isRecording && (
            <div style={{ display: 'flex', gap: 12, opacity: 0.85 }}>
              <V2Av name={candidateName} size={30} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>{candidateName} · transcribing…</div>
                {liveTranscript ? (
                  <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.65 }}>{liveTranscript}</div>
                ) : (
                <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
                  {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: 9999, background: '#94A3B8', animation: `v2pulsedot 1.4s ease-in-out ${i * 0.2}s infinite`, display: 'inline-block' }} />)}
                </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid #F1F5F9', fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Info size={13} color="#94A3B8" />
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
    </div>
  )
}

export default AIInterviewPage
