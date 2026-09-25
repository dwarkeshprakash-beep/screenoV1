// Notice - inline, dismissible feedback banner for the result of an action
// (e.g. "Mandate archived"). Use instead of window.alert().
import { X } from 'lucide-react'

const TONES = {
  success: { bg: 'var(--success-50)', fg: 'var(--success-700)', border: 'var(--success-200)' },
  error:   { bg: 'var(--danger-50)',  fg: 'var(--danger-700)',  border: 'var(--danger-200)' },
  warning: { bg: 'var(--warning-50)', fg: 'var(--warning-700)', border: 'var(--warning-100)' },
}

/**
 * @param {'success'|'error'|'warning'} type
 * @param {string} message - nothing renders when empty
 * @param {Function} [onDismiss] - shows a close button when provided
 */
function Notice({ type = 'success', message, onDismiss }) {
  const tone = TONES[type] || TONES.success

  if (!message) return null

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 'var(--fs-sm)',
        background: tone.bg, color: tone.fg, border: `1px solid ${tone.border}`,
      }}
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{ border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

export default Notice
