// pages/candidate/DeviceCheckPage.jsx
// Sequential device checks before interview starts.

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Camera, Mic, Volume2, Wifi, RefreshCw } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import Button from '../../components/shared/Button'

const CHECKS = ['camera', 'microphone', 'speaker', 'network']

function StatusIcon({ status }) {
  if (status === 'checking') return <Spinner size={18} />
  if (status === 'pass')    return <CheckCircle size={18} color="var(--success-500)" />
  if (status === 'fail')    return <XCircle size={18} color="var(--danger-500)" />
  return <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border-default)' }} />
}

function CheckIcon({ check }) {
  const icons = { camera: Camera, microphone: Mic, speaker: Volume2, network: Wifi }
  const Icon = icons[check]
  return <Icon size={20} color="var(--fg-muted)" />
}

// Desktop-only guard
if (typeof window !== 'undefined' && window.innerWidth < 768) {
  document.body.innerHTML = '<div style="padding:40px;text-align:center"><h2>Please use a desktop or laptop</h2><p>Interviews require a larger screen.</p></div>'
}

function DeviceCheckPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)

  const [statuses, setStatuses] = useState({ camera: 'pending', microphone: 'pending', speaker: 'pending', network: 'pending' })
  const [speakerConfirmed, setSpeakerConfirmed] = useState(false)
  const [currentCheck, setCurrentCheck] = useState(0)
  const [speakerPlayed, setSpeakerPlayed] = useState(false)

  const setStatus = (check, val) => setStatuses(s => ({ ...s, [check]: val }))

  useEffect(() => { runNextCheck(0) }, [])

  async function runNextCheck(idx) {
    if (idx >= CHECKS.length) return
    const check = CHECKS[idx]
    setCurrentCheck(idx)
    setStatus(check, 'checking')

    if (check === 'camera') await checkCamera()
    else if (check === 'microphone') await checkMicrophone()
    else if (check === 'network') await checkNetwork()
    // Speaker is manual — user clicks "Play" and confirms
  }

  async function checkCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
      setStatus('camera', 'pass')
      setTimeout(() => runNextCheck(1), 600)
    } catch {
      setStatus('camera', 'fail')
    }
  }

  async function checkMicrophone() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      setStatus('microphone', 'pass')
      setTimeout(() => runNextCheck(2), 600)
    } catch {
      setStatus('microphone', 'fail')
    }
  }

  function playTestTone() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(440, ctx.currentTime)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 1)
    setSpeakerPlayed(true)
  }

  function confirmSpeaker() {
    setSpeakerConfirmed(true)
    setStatus('speaker', 'pass')
    setTimeout(() => runNextCheck(3), 400)
  }

  function failSpeaker() {
    setStatus('speaker', 'fail')
  }

  async function checkNetwork() {
    const start = Date.now()
    try {
      await fetch('/health').catch(() => fetch('https://httpbin.org/get'))
      const ms = Date.now() - start
      setStatus('network', ms < 3000 ? 'pass' : 'fail')
    } catch {
      setStatus('network', 'fail')
    }
    setCurrentCheck(4)
  }

  async function retryCheck(check) {
    const idx = CHECKS.indexOf(check)
    setStatus(check, 'pending')
    if (check === 'speaker') setSpeakerPlayed(false)
    await new Promise(r => setTimeout(r, 300))
    runNextCheck(idx)
  }

  const allPassed = CHECKS.every(c => statuses[c] === 'pass')

  const checkLabels = { camera: 'Camera', microphone: 'Microphone', speaker: 'Speaker', network: 'Network' }
  const checkDesc   = { camera: 'Live video preview', microphone: 'Audio input detected', speaker: 'Play test tone to verify', network: 'Connection speed check' }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Device Check</h2>
      <p style={{ color: 'var(--fg-muted)', fontSize: 14, marginBottom: 24 }}>Making sure everything works before you start.</p>

      {/* Camera preview */}
      {(statuses.camera === 'checking' || statuses.camera === 'pass') && (
        <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '16/9', maxHeight: 180 }}>
          <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* Check list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {CHECKS.map((check) => (
          <div key={check} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <CheckIcon check={check} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                {checkLabels[check]}
                {statuses[check] === 'pass' && <span style={{ fontSize: 12, color: 'var(--success-500)' }}>Working</span>}
                {statuses[check] === 'fail' && <span style={{ fontSize: 12, color: 'var(--danger-500)' }}>Failed — check your settings</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{checkDesc[check]}</div>

              {/* Speaker controls */}
              {check === 'speaker' && statuses.speaker !== 'pass' && currentCheck >= 2 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={playTestTone} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', cursor: 'pointer' }}>Play test sound</button>
                  {speakerPlayed && !speakerConfirmed && (
                    <>
                      <button onClick={confirmSpeaker} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: 'none', background: 'var(--success-500)', color: '#fff', cursor: 'pointer' }}>I heard it ✓</button>
                      <button onClick={failSpeaker} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--danger-500)', color: 'var(--danger-500)', background: 'none', cursor: 'pointer' }}>No sound</button>
                    </>
                  )}
                </div>
              )}
            </div>
            <StatusIcon status={statuses[check]} />
            {statuses[check] === 'fail' && (
              <button onClick={() => retryCheck(check)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--brand-500)', fontSize: 12 }}>
                <RefreshCw size={12} /> Retry
              </button>
            )}
          </div>
        ))}
      </div>

      <Button
        fullWidth
        size="lg"
        disabled={!allPassed}
        onClick={() => navigate(`/interview/${token}/consent`)}
      >
        Continue →
      </Button>
      {!allPassed && <p style={{ fontSize: 12, color: 'var(--fg-muted)', textAlign: 'center', marginTop: 8 }}>All checks must pass to continue</p>}
    </div>
  )
}

export default DeviceCheckPage
