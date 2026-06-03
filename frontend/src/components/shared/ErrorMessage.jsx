// ErrorMessage — displayed when an API call fails.
// Pass a human-readable message (never a raw JS error).

function ErrorMessage({ message = 'Something went wrong. Please try again.', onRetry }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        padding: '24px',
        color: 'var(--danger-500)',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: '14px' }}>{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            border: '1px solid var(--danger-500)',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: 'var(--danger-500)',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      )}
    </div>
  )
}

export default ErrorMessage
