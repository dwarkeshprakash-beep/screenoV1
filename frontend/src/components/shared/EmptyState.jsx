// EmptyState — shown when a data list is empty (not an error, just no records).

function EmptyState({ message = 'Nothing here yet.', action }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        padding: '48px 24px',
        color: 'var(--fg-muted)',
        textAlign: 'center',
      }}
    >
      <svg
        width="48" height="48" viewBox="0 0 48 48" fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="24" cy="24" r="20" fill="var(--slate-100)" />
        <path
          d="M16 32L20 28M20 28L24 24M24 24L28 20M24 24L20 20M24 24L28 28"
          stroke="var(--slate-400)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      <p style={{ fontSize: '14px', maxWidth: '280px' }}>{message}</p>

      {action && action}
    </div>
  )
}

export default EmptyState
