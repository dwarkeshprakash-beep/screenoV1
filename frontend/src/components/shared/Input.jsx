// Input — labeled text field with inline error display.

/**
 * @param {string} label - visible label above the input
 * @param {string} error - validation error shown below the input
 * @param {string} type - HTML input type (text, email, password, etc.)
 */
function Input({
  label,
  id,
  error,
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  required = false,
  ...rest
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          {label}
          {required && <span style={{ color: 'var(--danger-500)', marginLeft: '2px' }}>*</span>}
        </label>
      )}

      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        style={{
          padding: '10px 12px',
          fontSize: '14px',
          border: error
            ? '1px solid var(--danger-500)'
            : '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          outline: 'none',
          width: '100%',
          transition: 'border-color 0.15s',
        }}
        {...rest}
      />

      {error && (
        <span style={{ fontSize: '12px', color: 'var(--danger-500)' }}>
          {error}
        </span>
      )}
    </div>
  )
}

export default Input
