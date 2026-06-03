// TopBar — page header showing current page title and user avatar.

import Avatar from '../shared/Avatar'

/**
 * @param {string} title - current page name
 * @param {Object} user - { name, avatarUrl }
 */
function TopBar({ title = '', user = {} }) {
  return (
    <header
      style={{
        height: '60px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        flexShrink: 0,
      }}
    >
      <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
        {title}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {user.name && (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {user.name}
          </span>
        )}
        <Avatar name={user.name || ''} src={user.avatarUrl} size="sm" />
      </div>
    </header>
  )
}

export default TopBar
