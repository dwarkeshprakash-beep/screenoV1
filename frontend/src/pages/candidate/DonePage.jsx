// pages/candidate/DonePage.jsx
// Interview completion screen — polls for report and shows AI improvement tips.

import { useState, useEffect } from 'react'
import { CheckCircle, FileText, Users, Mail, Loader } from 'lucide-react'
import * as api from '../../services/api'

const NEXT_STEPS = [
  { icon: FileText, title: 'We review your answers', desc: 'Our AI generates a detailed report for the hiring team.' },
  { icon: Users,    title: 'Hiring team reviews',    desc: 'Your manager will review the report within 2–3 business days.' },
  { icon: Mail,     title: "You'll hear from us",    desc: "We'll send you an update at your registered email address." },
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
        if (res.data && res.data.tips) {
          const parsed = (() => { try { return JSON.parse(res.data.tips) } catch { return [] } })()
          if (parsed.length > 0) {
            setTips(parsed)
            setPolling(false)
            return
          }
        }
      } catch {
        // ignore and retry
      }
      tries++
      if (tries < MAX) {
        setTimeout(poll, 5000)
      } else {
        setPolling(false)
      }
    }

    // Start polling after a short delay to give the backend time to process
    const timer = setTimeout(poll, 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
        {/* Animated check */}
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--success-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 24px rgba(5,150,105,0.3)' }}>
          <CheckCircle size={40} color="#fff" />
        </div>

        <h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--fg-primary)', marginBottom: 12 }}>You're all done!</h1>
        <p style={{ fontSize: 15, color: 'var(--fg-muted)', marginBottom: 32, lineHeight: 1.6 }}>
          Thanks for completing the interview. Your responses have been saved.
        </p>

        {/* Improvement tips — shown once the report is ready */}
        {tips.length > 0 ? (
          <div style={{ marginBottom: 28, textAlign: 'left' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>Tips to improve your next interview</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tips.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'var(--brand-50)', border: '1px solid var(--brand-100)', borderRadius: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--brand-500)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ fontSize: 13, color: 'var(--fg-body)', lineHeight: 1.6 }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        ) : polling ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28, color: 'var(--fg-muted)', fontSize: 13 }}>
            <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
            Generating your personalised tips…
          </div>
        ) : null}

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-default)', marginBottom: 28 }} />

        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>What happens next</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
          {NEXT_STEPS.map(({ icon: Icon, title, desc }, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color="var(--brand-500)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 28, fontSize: 13, color: 'var(--fg-muted)' }}>You can safely close this tab.</p>
      </div>
    </div>
  )
}

export default DonePage
