// pages/candidate/ConsentPage.jsx
// Consent screen before the interview begins.

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Video, Camera, Monitor, Cpu, Database } from 'lucide-react'
import Button from '../../components/shared/Button'

const CONSENT_ITEMS = [
  { icon: Video,    text: 'Your video and audio will be recorded during the interview.' },
  { icon: Camera,   text: 'Periodic screenshots will be taken every 30 seconds.' },
  { icon: Monitor,  text: 'Tab switches and fullscreen exits will be monitored.' },
  { icon: Cpu,      text: 'Your responses will be processed by AI to generate a transcript.' },
  { icon: Database, text: 'Data will be stored securely for 90 days for evaluation purposes.' },
]

function ConsentPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [agreed, setAgreed] = useState(false)

  function handleStart() {
    const session = JSON.parse(localStorage.getItem('interviewSession') || '{}')
    const route = session.type === 'exam' ? `/interview/${token}/exam` : `/interview/${token}/ai`
    navigate(route)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Before you begin</h2>
      <p style={{ color: 'var(--fg-muted)', fontSize: 14, marginBottom: 24 }}>
        Please review what will be captured during your interview.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {CONSENT_ITEMS.map(({ icon: Icon, text }, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, alignItems: 'flex-start' }}>
            <Icon size={18} color="var(--brand-500)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 14, color: 'var(--fg-body)', lineHeight: 1.5 }}>{text}</span>
          </div>
        ))}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--brand-500)' }}
        />
        <span style={{ fontSize: 14, color: 'var(--fg-body)' }}>I have read and understand the above</span>
      </label>

      <Button fullWidth size="lg" disabled={!agreed} onClick={handleStart}>
        Start Interview →
      </Button>

      <p style={{ textAlign: 'center', marginTop: 16 }}>
        <button
          onClick={() => navigate(`/interview/${token}`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--fg-muted)', textDecoration: 'underline' }}
        >
          I do not consent — go back
        </button>
      </p>
    </div>
  )
}

export default ConsentPage
