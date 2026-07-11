import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import * as api from '../../services/api'

function LogoMark({ size = 22 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.27), background: 'linear-gradient(135deg,var(--brand-500),var(--brand-600))', display: 'inline-flex', flexShrink: 0, position: 'relative' }}>
      <div style={{ position: 'absolute', left: '23%', top: '32%', width: '54%', height: '11%', background: 'var(--bg-surface)', borderRadius: 2, opacity: 0.95 }} />
      <div style={{ position: 'absolute', left: '23%', top: '57%', width: '54%', height: '11%', background: 'var(--bg-surface)', borderRadius: 2, opacity: 0.6 }} />
    </div>
  )
}

function CandidateLayout() {
  const navigate = useNavigate()
  const canOpenCandidateDashboard = (() => {
    if (!localStorage.getItem('accessToken')) return false
    try {
      return JSON.parse(localStorage.getItem('user') || '{}').role === 'candidate'
    } catch {
      return false
    }
  })()

  // Only logged-in candidates have a dashboard to return to — magic-link
  // interview sessions have no authenticated user, so the logo stays static there.
  function handleLogoClick() {
    if (canOpenCandidateDashboard) navigate('/candidate/dashboard')
  }

  async function handleLogout() {
    try {
      await api.logout()
    } catch {
      // Local cleanup is enough if the server session is already gone.
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    localStorage.removeItem('interviewAccessToken')
    localStorage.removeItem('interviewSession')
    window.dispatchEvent(new Event('user_logout'))
    navigate('/login', { replace: true })
  }

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
        <div
          onClick={handleLogoClick}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleLogoClick() }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: canOpenCandidateDashboard ? 'pointer' : 'default' }}
        >
          <LogoMark size={22} />
          <span style={{ color: 'var(--bg-surface)', fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>Screeno</span>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>
            Need help? <a href="mailto:support@screeno.ai" style={{ color: '#94A3B8', cursor: 'pointer', textDecoration: 'none', fontWeight: 600 }}>Support</a>
          </span>
          {canOpenCandidateDashboard && (
            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 5,
                border: '1px solid transparent',
                background: 'transparent',
                color: '#64748B',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'color 120ms',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--bg-surface)'}
              onMouseLeave={e => e.currentTarget.style.color = '#64748B'}
            >
              <LogOut size={13} /> Logout
            </button>
          )}
        </div>
      </header>

      <div style={{ flex: 1, background: 'var(--slate-50)' }}>
        <Outlet />
      </div>
    </div>
  )
}

export default CandidateLayout
