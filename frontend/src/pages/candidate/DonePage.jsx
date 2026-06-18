import { Mail, Search, UserCheck } from 'lucide-react'

const NEXT_STEPS = [
  { icon: Search, title: 'Report generation', body: 'Screeno generates a scorecard and report from your submitted answers.' },
  { icon: UserCheck, title: 'Manager review', body: 'The responsible manager reviews the report and supporting transcript.' },
  { icon: Mail, title: 'Follow-up', body: 'The hiring or assessment team will contact you with the next step.' },
]

function DonePage() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ width: 80, height: 80, borderRadius: 9999, background: 'var(--success-100)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M11 20 L18 27 L30 14" stroke="var(--success-500)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 10px' }}>Assessment submitted</h1>
      <p style={{ fontSize: 15, color: 'var(--slate-700)', margin: '0 auto 32px', lineHeight: 1.6, maxWidth: 440 }}>
        Your responses were saved. You can close this window safely.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, textAlign: 'left', marginBottom: 28 }}>
        {NEXT_STEPS.map(({ icon: Icon, title, body }) => (
          <div key={title} style={{ background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 18 }}>
            <Icon size={17} color="var(--brand-500)" />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-900)', margin: '10px 0 4px' }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--slate-500)', lineHeight: 1.55 }}>{body}</div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => { try { window.close() } catch {} }} style={{ padding: '11px 20px', border: '1px solid var(--slate-300)', borderRadius: 10, background: 'var(--bg-surface)', fontSize: 14, fontWeight: 600, color: 'var(--slate-700)', cursor: 'pointer' }}>
        Close this tab
      </button>
      <p style={{ marginTop: 10, fontSize: 12, color: 'var(--slate-400)' }}>If the tab doesn't close, you can safely close it manually.</p>
    </div>
  )
}

export default DonePage
