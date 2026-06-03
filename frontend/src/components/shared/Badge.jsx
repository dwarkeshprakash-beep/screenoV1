// Badge — small status pill. Used in tables and member cards.

/**
 * @param {'success'|'warning'|'danger'|'info'|'neutral'} variant
 */
function Badge({ children, variant = 'neutral' }) {
  const colors = {
    success: { bg: 'var(--success-50)',  color: 'var(--success-600)' },
    warning: { bg: 'var(--warning-50)',  color: 'var(--warning-600)' },
    danger:  { bg: 'var(--danger-50)',   color: 'var(--danger-600)'  },
    info:    { bg: 'var(--info-50)',     color: 'var(--info-600)'    },
    neutral: { bg: 'var(--slate-100)',   color: 'var(--slate-600)'   },
    brand:   { bg: 'var(--brand-50)',    color: 'var(--brand-600)'   },
  }

  const { bg, color } = colors[variant] || colors.neutral

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        borderRadius: '999px',
        background: bg,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

export default Badge
