import { Outlet, useNavigate } from 'react-router-dom'

function CandidateLayout() {
  const navigate = useNavigate()

  // Only logged-in candidates have a dashboard to return to — magic-link
  // interview sessions have no authenticated user, so the logo stays static there.
  function handleLogoClick() {
    if (localStorage.getItem('accessToken')) navigate('/candidate/dashboard')
  }

  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
        height: '3.5rem',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div
          onClick={handleLogoClick}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleLogoClick() }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: localStorage.getItem('accessToken') ? 'pointer' : 'default' }}
        >
          <div style={{
            width: '1.75rem',
            height: '1.75rem',
            borderRadius: '0.4375rem',
            background: 'linear-gradient(135deg,var(--brand-500),var(--brand-600))',
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', left: '0.375rem', top: '0.5625rem', width: '1rem', height: '0.15625rem', background: 'var(--bg-surface)', borderRadius: '0.125rem', opacity: 0.95 }} />
            <div style={{ position: 'absolute', left: '0.375rem', top: '0.9375rem', width: '1rem', height: '0.15625rem', background: 'var(--bg-surface)', borderRadius: '0.125rem', opacity: 0.6 }} />
          </div>
          <span style={{ fontSize: '1.0625rem', fontWeight: 'var(--fw-bold)', color: 'var(--fg-primary)', letterSpacing: 'var(--tracking-tight)' }}>Screeno</span>
        </div>

        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-subtle)' }}>
          Need help? <a href="mailto:support@screeno.ai" style={{ color: 'var(--fg-link)', cursor: 'pointer', textDecoration: 'none', fontWeight: 'var(--fw-semibold)' }}>Support</a>
        </span>
      </header>

      <div style={{ flex: 1, background: 'var(--slate-50)' }}>
        <Outlet />
      </div>
    </div>
  )
}

export default CandidateLayout
