// AdminModulesPage - read-only list of the global module catalog. Modules are seeded by
// migration, not editable here - this page exists so admins can see what's available to
// gate with an ACL. See docs/rbac-multi-tenant-plan.md.

import { useState, useEffect } from 'react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import * as api from '../../services/api'

function AdminModulesPage() {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { loadModules() }, [])

  async function loadModules() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getModules()
      setModules(res.data || [])
    } catch {
      setError('Could not load modules. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const cardStyle = {
    background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
    borderRadius: 12, boxShadow: '0 1px 3px rgba(15,23,42,0.04)', overflow: 'hidden',
  }
  const thStyle = {
    textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--fg-subtle)', borderBottom: '1px solid var(--border-default)',
  }
  const tdStyle = { padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }

  return (
    <div className="workspace-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={cardStyle}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface-alt)' }}>
          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
            Fixed, global list - the same for every company. Each ACL gates exactly one of these.
          </span>
        </div>

        {loading ? <Spinner center /> : error ? <ErrorMessage message={error} onRetry={loadModules} /> : modules.length === 0 ? (
          <EmptyState message="No modules found." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-alt)' }}>
                  {['NAME', 'KEY'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {modules.map(m => (
                  <tr key={m.id}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--fg-primary)' }}>{m.name}</td>
                    <td style={{ ...tdStyle, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{m.key}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminModulesPage
