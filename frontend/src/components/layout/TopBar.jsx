import { Search, Bell } from 'lucide-react'

function TopBar({ title = '', subtitle = '', action = null, notifCount = 2 }) {
  return (
    <header style={{
      height: 56,
      background: '#FFF',
      borderBottom: '1px solid #E2E8F0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      flexShrink: 0,
    }}>
      <div>
        <h1 style={{
          fontFamily: "var(--font-display, 'Inter')",
          fontSize: 18,
          fontWeight: 700,
          color: '#0F172A',
          margin: 0,
          letterSpacing: '-0.015em',
        }}>
          {title}
        </h1>
        {subtitle && (
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{subtitle}</div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#F1F5F9',
          borderRadius: 8,
          padding: '7px 12px',
          width: 260,
        }}>
          <Search size={13} color="#94A3B8" />
          <span style={{ fontSize: 13, color: '#94A3B8', flex: 1 }}>Search candidates, jobs…</span>
          <kbd style={{
            fontSize: 11,
            color: '#94A3B8',
            border: '1px solid #E2E8F0',
            borderRadius: 4,
            padding: '1px 5px',
            background: '#FFF',
            marginLeft: 'auto',
          }}>⌘K</kbd>
        </div>

        <div style={{ position: 'relative' }}>
          <button style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: '#F1F5F9',
            border: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <Bell size={15} color="#374151" />
          </button>
          {notifCount > 0 && (
            <span style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              borderRadius: 9999,
              background: '#EF4444',
              boxShadow: '0 0 0 2px #FFF',
            }} />
          )}
        </div>

        {action}
      </div>
    </header>
  )
}

export default TopBar
