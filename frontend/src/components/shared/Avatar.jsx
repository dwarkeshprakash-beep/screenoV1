// Avatar — circular user image with initials fallback.

/**
 * @param {string} src - image URL (optional)
 * @param {string} name - full name used to generate initials fallback
 * @param {'sm'|'md'|'lg'} size
 */
function Avatar({ src, name = '', size = 'md' }) {
  const presets = { sm: 28, md: 36, lg: 48 }
  const px = typeof size === 'number' ? size : (presets[size] || 36)

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')

  // Pick a consistent background color based on the first character
  const hue = (name.charCodeAt(0) || 0) * 37 % 360

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={px}
        height={px}
        style={{
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <div
      aria-label={name}
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        background: `hsl(${hue}, 55%, 50%)`,
        color: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: px * 0.36,
        fontWeight: 600,
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {initials || '?'}
    </div>
  )
}

export default Avatar
