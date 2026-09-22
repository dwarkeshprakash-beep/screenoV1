// Select - labeled dropdown styled to match Input.jsx, with the chevron affordance
// every admin form's custom dropdown (module picker, portal picker, ...) needs.

import { ChevronDown } from 'lucide-react'

/**
 * @param {string} label - visible label above the select
 * @param {string} helperText - small note shown below the select (hidden when error is set)
 * @param {string} error - validation error shown below the select instead of helperText
 * @param {{value: string|number, label: string, disabled?: boolean}[]} options
 */
function Select({
  label,
  id,
  error,
  helperText,
  placeholder,
  value,
  onChange,
  options = [],
  disabled = false,
  required = false,
  ...rest
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && (
        <label htmlFor={id} style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-primary)' }}>
          {label}
          {required && <span style={{ color: 'var(--danger-500)', marginLeft: 2 }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          style={{
            appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
            padding: '10px 32px 10px 12px', fontSize: 14,
            border: error ? '1px solid var(--danger-500)' : '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', color: 'var(--fg-primary)',
            width: '100%', fontFamily: 'inherit', cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          {...rest}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown
          size={14}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }}
        />
      </div>

      {error ? (
        <span style={{ fontSize: 12, color: 'var(--danger-500)' }}>{error}</span>
      ) : helperText ? (
        <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>{helperText}</span>
      ) : null}
    </div>
  )
}

export default Select
