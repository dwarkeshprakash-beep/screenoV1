// AdminStatCard - one headline number on the admin dashboard.

/**
 * @param {string} title
 * @param {number|string} value
 * @param {string} [subtitle]
 * @param {string} color - a CSS color token, e.g. 'var(--success-500)'
 */
function AdminStatCard({ title, value, subtitle, color }) {
  return (
    <div className="admin-panel admin-panel__body">
      <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-muted)', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 'var(--fw-bold)', color, marginBottom: 4 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-subtle)' }}>{subtitle}</div>}
    </div>
  )
}

export default AdminStatCard
