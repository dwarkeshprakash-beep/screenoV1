// Modal — overlay dialog. Closes on backdrop click or Escape key.

import { useEffect } from 'react'

/**
 * @param {boolean} open - controls visibility
 * @param {Function} onClose - called when user dismisses
 * @param {string} title - modal heading
 * @param {'sm'|'md'|'lg'} size
 */
function Modal({ open, onClose, title, children, size = 'md' }) {
  const widths = { sm: '400px', md: '560px', lg: '800px' }

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: widths[size] || widths.md,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-default)',
        }}>
          <h2 id="modal-title" style={{ fontSize: '16px', fontWeight: 600 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal
