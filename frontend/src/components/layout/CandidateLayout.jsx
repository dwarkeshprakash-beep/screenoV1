import { Outlet } from 'react-router-dom'

function CandidateLayout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: '#FFF',
        borderBottom: '1px solid #E2E8F0',
        height: 56,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: 'linear-gradient(135deg,#5B4FE9,#4A3FCE)',
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', left: 6, top: 9, width: 16, height: 2.5, background: '#FFF', borderRadius: 2, opacity: 0.95 }} />
            <div style={{ position: 'absolute', left: 6, top: 15, width: 16, height: 2.5, background: '#FFF', borderRadius: 2, opacity: 0.6 }} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>Screeno</span>
        </div>

        <span style={{ fontSize: 13, color: '#94A3B8' }}>
          Need help? <a href="mailto:dwarkesh.vajjala@prakashinfotech.com" style={{ color: '#5B4FE9', cursor: 'pointer', textDecoration: 'none', fontWeight: 600 }}>Support</a>
        </span>
      </header>

      <div style={{ flex: 1, background: '#F8FAFC' }}>
        <Outlet />
      </div>
    </div>
  )
}

export default CandidateLayout
