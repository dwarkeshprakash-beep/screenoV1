// pages/candidate/DonePage.jsx
// Interview completion screen.

import { useParams } from 'react-router-dom'
import { CheckCircle, FileText, Users, Mail } from 'lucide-react'

function DonePage() {
  const session = (() => {
    try { return JSON.parse(localStorage.getItem('interviewSession') || '{}') } catch { return {} }
  })()

  const NEXT_STEPS = [
    { icon: FileText, title: 'We review your answers', desc: 'Our AI generates a detailed report for the hiring team.' },
    { icon: Users,    title: 'Hiring team reviews',     desc: 'Your manager will review the report within 2–3 business days.' },
    { icon: Mail,     title: "You'll hear from us",     desc: 'We\'ll send you an update at your registered email address.' },
  ]

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
