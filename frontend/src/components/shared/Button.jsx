// Button — primary, secondary, and danger variants. Handles loading state.

import Spinner from './Spinner'

/**
 * @param {'primary'|'secondary'|'danger'|'ghost'} variant
 * @param {'sm'|'md'|'lg'} size
 * @param {boolean} loading - shows spinner and disables the button
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  fullWidth = false,
  ...rest
}) {
  const styles = {
    primary:   { background: 'var(--brand-500)', color: '#fff', border: 'none' },
    secondary: { background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-default)' },
    danger:    { background: 'var(--danger-500)', color: '#fff', border: 'none' },
    ghost:     { background: 'transparent', color: 'var(--brand-500)', border: 'none' },
  }

  const sizes = {
    sm: { padding: '6px 12px', fontSize: '12px' },
    md: { padding: '10px 20px', fontSize: '14px' },
    lg: { padding: '14px 28px', fontSize: '16px' },
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        borderRadius: 'var(--radius-md)',
        fontWeight: 500,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.15s',
        width: fullWidth ? '100%' : 'auto',
        justifyContent: 'center',
        ...styles[variant],
        ...sizes[size],
      }}
      {...rest}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  )
}

export default Button
