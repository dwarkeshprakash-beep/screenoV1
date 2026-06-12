import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Video, Camera, Monitor, Sparkles, Database, ArrowRight, Check } from 'lucide-react'

const CONSENT_ITEMS = [
  { icon: Video,    title: 'Video recording',       body: 'Your face and voice will be recorded for this session.' },
  { icon: Camera,   title: 'Periodic snapshots',    body: 'Screenshots taken every 30 seconds during the interview.' },
  { icon: Monitor,  title: 'Tab & screen activity', body: 'We detect tab switches, minimising, or external searches. Violations are logged.' },
  { icon: Sparkles, title: 'AI processing',         body: 'Your responses are analysed by AI to generate a performance report.' },
  { icon: Database, title: 'Data retention',        body: 'Data stored for 6 months, then permanently deleted. Request deletion anytime.' },
]

function ConsentPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [agreed, setAgreed] = useState(false)

  function handleStart() {
    const session = JSON.parse(localStorage.getItem('interviewSession') || '{}')
    const route = ['exam', 'ai_exam'].includes(session.type)
      ? `/interview/${token}/exam`
      : session.type === 'human'
        ? `/interview/${token}/human`
        : `/interview/${token}/ai`
    navigate(route)
  }

  return (
    <div style={{ padding: '40px 24px', maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--slate-900)', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
        Before you begin
      </h1>
      <p style={{ fontSize: 14, color: 'var(--slate-500)', margin: '0 0 24px' }}>
        Please review what will be recorded during your interview.
      </p>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 14, padding: 24, marginBottom: 18, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
        {CONSENT_ITEMS.map((it, i) => (
          <div key={it.title} style={{ display: 'flex', gap: 14, padding: `${i === 0 ? 0 : 14}px 0 ${i === CONSENT_ITEMS.length - 1 ? 0 : 14}px`, borderTop: i === 0 ? '0' : '1px solid var(--slate-100)' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--brand-50)', color: 'var(--brand-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <it.icon size={16} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate-900)' }}>{it.title}</div>
              <div style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 2, lineHeight: 1.55 }}>{it.body}</div>
            </div>
          </div>
        ))}
      </div>

      <label
        onClick={() => setAgreed(a => !a)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: agreed ? '#F3F0FF' : 'var(--slate-50)', border: `1px solid ${agreed ? 'var(--brand-500)' : 'var(--slate-200)'}`, borderRadius: 10, cursor: 'pointer', marginBottom: 14, transition: 'all 160ms' }}
      >
        <span style={{ width: 20, height: 20, borderRadius: 5, background: agreed ? 'var(--brand-500)' : 'var(--bg-surface)', border: `1.5px solid ${agreed ? 'var(--brand-500)' : 'var(--slate-300)'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 160ms' }}>
          {agreed && <Check size={13} color="var(--bg-surface)" />}
        </span>
        <span style={{ fontSize: 13, color: 'var(--slate-900)', fontWeight: 500 }}>I have read and understand the above</span>
      </label>

      <button
        disabled={!agreed}
        onClick={handleStart}
        style={{ width: '100%', padding: '13px 20px', borderRadius: 10, border: 0, background: agreed ? 'var(--brand-500)' : 'var(--slate-200)', color: agreed ? 'var(--bg-surface)' : 'var(--slate-400)', fontSize: 14, fontWeight: 600, cursor: agreed ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: agreed ? '0 8px 20px rgba(91,79,233,0.25)' : 'none', transition: 'all 160ms' }}
      >
        Start interview <ArrowRight size={14} />
      </button>

      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <button
          onClick={() => navigate(`/interview/${token}`)}
          style={{ background: 'transparent', border: 0, color: 'var(--slate-400)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
        >
          I do not consent
        </button>
      </div>

      <p style={{ fontSize: 11, color: 'var(--slate-400)', textAlign: 'center', margin: '16px 0 0', lineHeight: 1.6 }}>
        Request data deletion anytime: <a style={{ color: 'var(--brand-500)' }}>privacy@screeno.io</a>
      </p>
    </div>
  )
}

export default ConsentPage
