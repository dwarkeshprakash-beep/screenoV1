import { APP_NAME } from '../../config/app.config'
import { Outlet } from 'react-router-dom'

// Bare shell for the anonymous magic-link exam flow (/interview/:token) only - there is
// no authenticated user here (a candidate's own dashboard now lives at /workspace,
// inside AppLayout), so this never needs a logout button or session state.
function LogoMark({ size = 22 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.27), background: 'linear-gradient(135deg,var(--brand-500),var(--brand-600))', display: 'inline-flex', flexShrink: 0, position: 'relative' }}>
      <div style={{ position: 'absolute', left: '23%', top: '32%', width: '54%', height: '11%', background: 'var(--bg-surface)', borderRadius: 2, opacity: 0.95 }} />
      <div style={{ position: 'absolute', left: '23%', top: '57%', width: '54%', height: '11%', background: 'var(--bg-surface)', borderRadius: 2, opacity: 0.6 }} />
    </div>
  )
}

function CandidateLayout() {
  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: 'var(--slate-900)',
        borderBottom: '1px solid #1E293B',
        height: 38,
        padding: '0 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <LogoMark size={22} />
          <span style={{ color: 'var(--bg-surface)', fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>{APP_NAME}</span>
          <div style={{ width: 1, height: 18, background: '#1E293B', margin: '0 8px' }} />
          <span style={{
            padding: '4px 12px',
            borderRadius: 5,
            border: '1px solid #334155',
            color: 'var(--bg-surface)',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.06em',
          }}>
            CANDIDATE
          </span>
        </div>

        <span style={{ fontSize: 12, color: '#64748B' }}>
          Need help? <a href="mailto:support@screeno.ai" style={{ color: '#94A3B8', cursor: 'pointer', textDecoration: 'none', fontWeight: 600 }}>Support</a>
        </span>
      </header>

      <div style={{ flex: 1, background: 'var(--slate-50)' }}>
        <Outlet />
      </div>
    </div>
  )
}

export default CandidateLayout
