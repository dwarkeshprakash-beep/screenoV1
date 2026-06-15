import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Loader2,
  Mic,
  Monitor,
  Play,
  Volume2,
  Wifi,
  XCircle,
} from 'lucide-react'
import * as api from '../../services/api'

const CHECKS = [
  { id: 'camera', label: 'Camera', icon: Camera, detail: 'Camera detected' },
  { id: 'microphone', label: 'Microphone', icon: Mic, detail: 'Microphone detected' },
  { id: 'speaker', label: 'Speaker', icon: Volume2, detail: 'Test tone confirmed' },
  { id: 'network', label: 'Network', icon: Wifi, detail: 'API connection healthy' },
  { id: 'screen', label: 'Screen environment', icon: Monitor, detail: 'Screen check complete' },
]
const REQUIRED_CHECK_IDS = ['microphone', 'speaker', 'network', 'screen']

function DeviceCheckPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const [isMobile] = useState(() => window.innerWidth < 768)
  const [statuses, setStatuses] = useState(
    Object.fromEntries(CHECKS.map(check => [check.id, 'idle']))
  )
  const [speakerPlayed, setSpeakerPlayed] = useState(false)

  const setStatus = useCallback((id, status) => {
    setStatuses(current => ({ ...current, [id]: status }))
  }, [])

  const getMediaWithTimeout = useCallback(async constraints => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Media devices are not supported')
    }
    let timeoutId
    try {
      return await Promise.race([
        navigator.mediaDevices.getUserMedia(constraints),
        new Promise((_, reject) => {
          timeoutId = window.setTimeout(
            () => reject(new Error('Permission request timed out')),
            10000
          )
        }),
      ])
    } finally {
      window.clearTimeout(timeoutId)
    }
  }, [])

  const runChecks = useCallback(async () => {
    setStatus('camera', 'checking')
    setStatus('microphone', 'checking')
    setStatus('network', 'checking')
    setStatus('screen', 'checking')

    await Promise.allSettled([
      (async () => {
        try {
          cameraStreamRef.current?.getTracks().forEach(track => track.stop())
          const stream = await getMediaWithTimeout({ video: true })
          cameraStreamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            await videoRef.current.play()
          }
          setStatus('camera', 'pass')
        } catch {
          setStatus('camera', 'fail')
        }
      })(),
      (async () => {
        try {
          const stream = await getMediaWithTimeout({ audio: true })
          stream.getTracks().forEach(track => track.stop())
          setStatus('microphone', 'pass')
        } catch {
          setStatus('microphone', 'fail')
        }
      })(),
      (async () => {
        const start = performance.now()
        try {
          await api.getHealth()
          setStatus('network', performance.now() - start < 5000 ? 'pass' : 'fail')
        } catch {
          setStatus('network', 'fail')
        }
      })(),
      (async () => {
        const extended = window.screen?.isExtended
        setStatus('screen', extended === true ? 'fail' : 'pass')
      })(),
    ])
  }, [getMediaWithTimeout, setStatus])

  useEffect(() => {
    if (!isMobile) void runChecks()
    return () => {
      cameraStreamRef.current?.getTracks().forEach(track => track.stop())
    }
  }, [isMobile, runChecks])

  function playTestTone() {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) {
      setStatus('speaker', 'fail')
      return
    }
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.frequency.setValueAtTime(440, context.currentTime)
    gain.gain.setValueAtTime(0.25, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1)
    oscillator.start()
    oscillator.stop(context.currentTime + 1)
    setSpeakerPlayed(true)
  }

  if (isMobile) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Please use a desktop or laptop</h2>
        <p>Interviews require a larger screen and supported media devices.</p>
      </div>
    )
  }

  const requiredPassed = REQUIRED_CHECK_IDS.every(id => statuses[id] === 'pass')
  const finished = CHECKS
    .filter(check => check.id !== 'speaker')
    .every(check => ['pass', 'fail'].includes(statuses[check.id]))

  return (
    <div style={{ padding: '40px 24px', maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px' }}>
        Check your device
      </h1>
      <p style={{ fontSize: 14, color: 'var(--slate-500)', margin: '0 0 20px' }}>
        Microphone, speaker, network, and screen checks are required. Camera access is recommended but optional.
      </p>

      <video ref={videoRef} muted playsInline style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 12, background: 'var(--slate-900)', marginBottom: 14 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {CHECKS.map(check => {
          const status = statuses[check.id]
          return (
            <div key={check.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--slate-200)', borderRadius: 10, background: 'var(--bg-surface)' }}>
              <check.icon size={18} color="var(--brand-500)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{check.label}</div>
                <div style={{ fontSize: 12, color: status === 'fail' ? 'var(--danger-700)' : 'var(--slate-500)' }}>
                  {status === 'idle' && 'Waiting'}
                  {status === 'checking' && 'Checking...'}
                  {status === 'pass' && check.detail}
                  {status === 'fail' && (
                    check.id === 'screen'
                      ? 'Multiple displays detected'
                      : check.id === 'camera'
                        ? 'Camera unavailable. You can still continue.'
                        : 'Check browser permissions and retry'
                  )}
                </div>
                {check.id === 'speaker' && status !== 'pass' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 7 }}>
                    <button type="button" onClick={playTestTone} style={{ padding: '5px 9px', border: '1px solid var(--slate-300)', borderRadius: 7, background: 'var(--bg-surface)', cursor: 'pointer' }}>
                      <Play size={11} /> Test tone
                    </button>
                    {speakerPlayed && (
                      <button type="button" onClick={() => setStatus('speaker', 'pass')} style={{ padding: '5px 9px', border: 0, borderRadius: 7, background: 'var(--success-500)', color: 'white', cursor: 'pointer' }}>
                        I heard it
                      </button>
                    )}
                  </div>
                )}
              </div>
              {status === 'checking' && <Loader2 size={19} style={{ animation: 'deviceSpin 1s linear infinite' }} />}
              {status === 'pass' && <CheckCircle2 size={19} color="var(--success-500)" />}
              {status === 'fail' && <XCircle size={19} color="var(--danger-600)" />}
            </div>
          )
        })}
      </div>

      {finished && !requiredPassed && (
        <button type="button" onClick={runChecks} style={{ width: '100%', marginTop: 14, padding: 10, border: '1px solid var(--slate-300)', borderRadius: 9, background: 'var(--bg-surface)', cursor: 'pointer', fontWeight: 600 }}>
          Retry failed checks
        </button>
      )}

      <button
        type="button"
        disabled={!requiredPassed}
        onClick={() => navigate(`/interview/${token}/consent`)}
        style={{ width: '100%', marginTop: 14, padding: '13px 20px', borderRadius: 10, border: 0, background: requiredPassed ? 'var(--brand-500)' : 'var(--slate-200)', color: requiredPassed ? 'white' : 'var(--slate-400)', cursor: requiredPassed ? 'pointer' : 'not-allowed', fontWeight: 600 }}
      >
        Continue <ArrowRight size={14} />
      </button>
      <style>{`@keyframes deviceSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default DeviceCheckPage
