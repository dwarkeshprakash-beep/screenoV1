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
  className = '',
  style,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`product-button product-button--${variant} product-button--${size} ${className}`.trim()}
      style={{
        width: fullWidth ? '100%' : 'auto',
        ...style,
      }}
      {...rest}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  )
}

export default Button
