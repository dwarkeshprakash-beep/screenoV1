// Spinner — shown while data is loading.
// Use <Spinner /> inline, or <Spinner center /> to center in the nearest block.

function Spinner({ size = 24, label = 'Loading…', center = false }) {
  const inner = (
    <div
      role="status"
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: 'spin 0.8s linear infinite' }}
      >
        <circle cx="12" cy="12" r="10" stroke="var(--slate-200, var(--slate-200))" strokeWidth="3" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--brand-500, var(--brand-500))" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (center) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '60px 0',
      }}>
        {inner}
      </div>
    )
  }

  return inner
}

export default Spinner
