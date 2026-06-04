import { useState, useEffect } from 'react'
import { Search, UserCheck, Mail, Lightbulb, Loader2 } from 'lucide-react'
import * as api from '../../services/api'

const NEXT_STEPS = [
  { icon: Search,     title: 'We review your answers',  body: 'AI generates a detailed report of your interview performance.' },
  { icon: UserCheck,  title: 'Hiring team reviews',     body: 'Our team reviews the report within 2–3 business days.' },
  { icon: Mail,       title: "You'll hear from us",     body: "We'll email you at your registered address with next steps." },
]

function DonePage() {
  const [tips, setTips]       = useState([])
  const [polling, setPolling] = useState(true)

  useEffect(() => {
    let tries = 0
    const MAX = 3

    async function poll() {
      try {
        const res = await api.getCandidateOwnReport()
        if (res.data?.tips) {
          const parsed = (() => { try { return JSON.parse(res.data.tips) } catch { return [] } })()
          if (parsed.length > 0) { setTips(parsed); setPolling(false); return }
        }
      } catch {}
      tries++
      if (tries < MAX) setTimeout(poll, 5000)
      else setPolling(false)
    }

    const timer = setTimeout(poll, 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
      {/* Animated check */}
      <div style={{
        width: 80, height: 80, borderRadius: 9999,
        background: '#D1FAE5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 12px 28px rgba(5,150,105,0.18), 0 0 0 8px rgba(16,185,129,0.08)',
        marginBottom: 24,
        animation: 'donePop 400ms cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M11 20 L18 27 L30 14"
            stroke="#059669" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ strokeDasharray: 40, strokeDashoffset: 40, animation: 'doneCheck 600ms cubic-bezier(0.2,0,0,1) 300ms forwards' }}
          />
        </svg>
      </div>

      <h1 style={{ fontFamily: "var(--font-display,'Inter')", fontSize: 32, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.025em', margin: '0 0 10px' }}>
        You're all done!
      </h1>
      <p style={{ fontSize: 15, color: '#374151', margin: '0 0 32px', lineHeight: 1.6, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
        Thanks for completing the interview. Your responses have been saved.
      </p>

      {/* Tips / polling */}
      {tips.length > 0 ? (
        <div style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 12, padding: '16px 20px', marginBottom: 28, textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#B45309', fontSize: 13, fontWeight: 600 }}>
            <Lightbulb size={14} /> Quick feedback for you
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tips.map((tip, i) => (
              <div key={i} style={{ fontSize: 13, color: '#92400E', lineHeight: 1.6 }}>• {tip}</div>
            ))}
          </div>
        </div>
      ) : polling ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28, color: '#6B7280', fontSize: 13 }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          Generating your personalised tips…
        </div>
      ) : null}

      <div style={{ height: 1, background: '#E2E8F0', margin: '0 0 28px' }} />

      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5B4FE9', marginBottom: 16 }}>
        What happens next
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, textAlign: 'left', marginBottom: 28 }}>
        {NEXT_STEPS.map(({ icon: Icon, title, body }, i) => (
          <div key={i} style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#EFEDFD', color: '#5B4FE9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Icon size={16} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.55 }}>{body}</div>
          </div>
        ))}
      </div>

      <button
        style={{ padding: '11px 20px', border: '1px solid #CBD5E1', borderRadius: 10, background: '#FFF', fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer', transition: 'background 120ms' }}
        onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
        onMouseLeave={e => e.currentTarget.style.background = '#FFF'}
        onClick={() => window.close()}
      >
        Close window
      </button>

      <style>{`
        @keyframes donePop { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes doneCheck { to{stroke-dashoffset:0} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}

export default DonePage
