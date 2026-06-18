import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Check, Mic, Monitor, Sparkles } from 'lucide-react'

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ? Date.now() / 1000 > payload.exp : true
  } catch {
    return true
  }
}

const CONSENT_ITEMS = [
  {
    icon: Mic,
    title: 'Audio transcription',
    body: 'Your spoken answers are sent for transcription. Screeno stores the resulting text, not the audio recording.',
  },
  {
    icon: Monitor,
    title: 'Tab and fullscreen activity',
    body: 'A first tab or fullscreen violation shows a warning. A repeated violation ends the assessment.',
  },
  {
    icon: Sparkles,
    title: 'AI evaluation',
    body: 'Your question-and-answer transcript is analyzed to create a scorecard and report.',
  },
]

function ConsentPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [agreed, setAgreed] = useState(false)
  const [sessionError, setSessionError] = useState(null)

  function start() {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken || isTokenExpired(accessToken)) {
      setSessionError('Your session has expired. Please use your original magic link to start again.')
      return
    }
    let session
    try {
      session = JSON.parse(localStorage.getItem('interviewSession') || '{}')
    } catch {
      session = {}
    }
    navigate(`/interview/${token}/${session.type === 'exam' ? 'exam' : 'ai'}`)
  }

  return (
    <div style={{ padding: '40px 24px', maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 6px' }}>Before you begin</h1>
      <p style={{ fontSize: 14, color: 'var(--slate-500)', margin: '0 0 24px' }}>Review how this assessment works.</p>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 14, padding: 24, marginBottom: 18 }}>
        {CONSENT_ITEMS.map((item, index) => (
          <div key={item.title} style={{ display: 'flex', gap: 14, padding: index === 0 ? '0 0 14px' : '14px 0', borderTop: index === 0 ? 0 : '1px solid var(--slate-100)' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--brand-50)', color: 'var(--brand-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <item.icon size={16} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate-900)' }}>{item.title}</div>
              <div style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 2, lineHeight: 1.55 }}>{item.body}</div>
            </div>
          </div>
        ))}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: agreed ? 'var(--brand-50)' : 'var(--slate-50)', border: `1px solid ${agreed ? 'var(--brand-500)' : 'var(--slate-200)'}`, borderRadius: 10, cursor: 'pointer', marginBottom: 14 }}>
        <input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} style={{ position: 'absolute', opacity: 0 }} />
        <span style={{ width: 20, height: 20, borderRadius: 5, background: agreed ? 'var(--brand-500)' : 'var(--bg-surface)', border: `1.5px solid ${agreed ? 'var(--brand-500)' : 'var(--slate-300)'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {agreed && <Check size={13} color="white" />}
        </span>
        <span style={{ fontSize: 13, color: 'var(--slate-900)', fontWeight: 500 }}>I understand and consent to this processing.</span>
      </label>

      {sessionError && (
        <div role="alert" style={{ marginBottom: 12, padding: '12px 14px', background: 'var(--danger-50)', border: '1px solid var(--danger-500)', borderRadius: 8, fontSize: 13, color: 'var(--danger-700)', lineHeight: 1.55 }}>
          {sessionError}
        </div>
      )}
      <button type="button" disabled={!agreed} onClick={start} style={{ width: '100%', padding: '13px 20px', borderRadius: 10, border: 0, background: agreed ? 'var(--brand-500)' : 'var(--slate-200)', color: agreed ? 'white' : 'var(--slate-400)', cursor: agreed ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
        Start assessment <ArrowRight size={14} />
      </button>
    </div>
  )
}

export default ConsentPage
