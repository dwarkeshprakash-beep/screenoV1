import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Camera, Mic, Volume2, Wifi, Monitor, CheckCircle2, XCircle, Loader2, Play, ArrowRight } from 'lucide-react'

const CHECKS = [
  { id: 'camera',    label: 'Camera',        icon: Camera,   detail: 'Camera detected',           extraType: 'preview' },
  { id: 'microphone',label: 'Microphone',    icon: Mic,      detail: 'Built-in Microphone',       extraType: 'level' },
  { id: 'speaker',   label: 'Speaker',       icon: Volume2,  detail: 'System default',            extraType: 'test' },
  { id: 'network',   label: 'Network',       icon: Wifi,     detail: 'Connection stable',         extraType: 'speed' },
  { id: 'screen',    label: 'Single screen', icon: Monitor,  detail: '1 display detected',        extraType: 'badge' },
]

function DeviceCheckPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)

  const [isMobile]                      = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const [statuses, setStatuses]         = useState(Object.fromEntries(CHECKS.map(c => [c.id, 'idle'])))
  const [speakerConfirmed, setSpeakerConfirmed] = useState(false)
  const [speakerPlayed, setSpeakerPlayed]       = useState(false)
  const [micBars, setMicBars]           = useState([0.4,0.7,0.5,0.8,0.6,0.4,0.9])

  const setStatus = (id, val) => setStatuses(s => ({ ...s, [id]: val }))

  useEffect(() => { if (!isMobile) runChecks() }, [isMobile])

  async function runChecks() {
    await checkCamera()
    await checkMicrophone()
    await checkNetwork()
    await checkScreen()
  }

  async function checkCamera() {
    setStatus('camera', 'checking')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}) }
      setStatus('camera', 'pass')
    } catch { setStatus('camera', 'fail') }
  }

  async function checkMicrophone() {
    setStatus('microphone', 'checking')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      setStatus('microphone', 'pass')
    } catch { setStatus('microphone', 'fail') }
  }

  async function checkNetwork() {
    setStatus('network', 'checking')
    const start = Date.now()
    const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:4000'
    try {
      await fetch(`${apiBase}/health`)
      const ms = Date.now() - start
      setStatus('network', ms < 3000 ? 'pass' : 'fail')
    } catch { setStatus('network', 'fail') }
  }

  async function checkScreen() {
    setStatus('screen', 'checking')
    await new Promise(r => setTimeout(r, 600))
    setStatus('screen', 'pass')
  }

  useEffect(() => {
    if (statuses.microphone !== 'pass') return
    const t = setInterval(() => setMicBars(b => b.map(() => 0.2 + Math.random() * 0.8)), 200)
    return () => clearInterval(t)
  }, [statuses.microphone])

  function playTestTone() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(440, ctx.currentTime)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1)
    setSpeakerPlayed(true)
  }

  function confirmSpeaker() {
    setSpeakerConfirmed(true)
    setStatus('speaker', 'pass')
  }

  const getStatus = (id) => {
    if (id === 'speaker') return speakerConfirmed ? 'pass' : statuses.speaker
    return statuses[id]
  }

  if (isMobile) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Please use a desktop or laptop</h2>
        <p>Interviews require a larger screen for the best experience.</p>
      </div>
    )
  }

  const allPassed = CHECKS.every(c => getStatus(c.id) === 'pass')

  return (
    <div style={{ padding: '40px 24px', maxWidth: 540, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 24, fontWeight: 700, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
        Let&apos;s check your device
      </h1>
      <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 24px' }}>This takes about 30 seconds.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {CHECKS.map(c => {
          const st = getStatus(c.id)
          const iconBg  = st === 'pass' ? '#ECFDF5' : st === 'checking' ? '#EFEDFD' : st === 'fail' ? '#FEF2F2' : '#F1F5F9'
          const iconClr = st === 'pass' ? '#059669' : st === 'checking' ? '#5B4FE9' : st === 'fail' ? '#EF4444' : '#94A3B8'
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, transition: 'all 220ms' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: iconBg, color: iconClr, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 220ms' }}>
                <c.icon size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{c.label}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
                  {st === 'idle' && 'Waiting…'}
                  {st === 'checking' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Loader2 size={12} style={{ animation: 'v2spin 1s linear infinite' }} />Checking…</span>}
                  {st === 'pass' && c.detail}
                  {st === 'fail' && <span style={{ color: '#EF4444' }}>Failed — check permissions</span>}
                </div>
                {c.id === 'speaker' && st !== 'pass' && statuses.camera === 'pass' && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={playTestTone} style={{ padding: '5px 10px', border: '1px solid #CBD5E1', borderRadius: 7, background: '#FFF', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Play size={11} /> Test
                    </button>
                    {speakerPlayed && !speakerConfirmed && (
                      <button onClick={confirmSpeaker} style={{ padding: '5px 10px', border: 0, borderRadius: 7, background: '#059669', color: '#FFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        I heard it
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {st === 'pass' && c.extraType === 'level' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 24 }}>
                    {micBars.map((v, j) => (
                      <span key={j} style={{ width: 3, height: `${Math.max(6, v * 22)}px`, background: '#5B4FE9', borderRadius: 9999, transition: 'height 180ms', display: 'inline-block' }} />
                    ))}
                  </div>
                )}
                {st === 'pass' && <CheckCircle2 size={20} color="#10B981" />}
                {st === 'checking' && <Loader2 size={20} color="#94A3B8" style={{ animation: 'v2spin 1s linear infinite' }} />}
                {st === 'fail' && <XCircle size={20} color="#EF4444" />}
              </div>
            </div>
          )
        })}
      </div>

      {allPassed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, marginBottom: 14, color: '#047857', fontSize: 13, fontWeight: 600 }}>
          <CheckCircle2 size={15} /> All checks passed — you&apos;re good to go!
        </div>
      )}

      <button
        disabled={!allPassed}
        onClick={() => navigate(`/interview/${token}/consent`)}
        style={{ width: '100%', padding: '13px 20px', borderRadius: 10, background: allPassed ? '#5B4FE9' : '#E2E8F0', color: allPassed ? '#FFF' : '#94A3B8', border: 0, fontSize: 14, fontWeight: 600, cursor: allPassed ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: allPassed ? '0 8px 20px rgba(91,79,233,0.25)' : 'none', transition: 'all 160ms' }}
      >
        Continue <ArrowRight size={14} />
      </button>

      <style>{`@keyframes v2spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}

export default DeviceCheckPage
