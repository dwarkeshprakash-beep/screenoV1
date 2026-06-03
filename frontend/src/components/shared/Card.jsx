// Card — white surface container with border and optional padding.

/**
 * @param {'sm'|'md'|'lg'} padding
 * @param {boolean} hoverable - adds lift shadow on hover
 */
function Card({ children, padding = 'md', hoverable = false, style = {} }) {
  const paddings = { sm: '12px', md: '20px', lg: '32px' }

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: paddings[padding] || paddings.md,
        transition: hoverable ? 'box-shadow 0.15s, transform 0.15s' : undefined,
        cursor: hoverable ? 'pointer' : undefined,
        ...style,
      }}
      onMouseEnter={hoverable ? (e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      } : undefined}
      onMouseLeave={hoverable ? (e) => {
        e.currentTarget.style.boxShadow = ''
        e.currentTarget.style.transform = ''
      } : undefined}
    >
      {children}
    </div>
  )
}

export default Card
