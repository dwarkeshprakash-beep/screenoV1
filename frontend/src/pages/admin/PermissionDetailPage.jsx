// PermissionDetailPage - view one permission and every role it's granted to,
// across every organization. Reached by clicking a row in AdminPermissionsPage.
// Permissions are a global catalog, so unlike Roles/Users/ACLs this list spans
// companies - each row names which organization the granted role belongs to.

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import Badge from '../../components/shared/Badge'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

function PermissionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [permission, setPermission] = useState(null)
  const [grants, setGrants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [permissionRes, grantsRes] = await Promise.all([
        api.getPermission(id),
        api.getPermissionRoles(id),
      ])
      setPermission(permissionRes.data)
      setGrants(grantsRes.data || [])
    } catch {
      setError('Could not load this permission. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const cardStyle = {
    background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
    borderRadius: 12, boxShadow: '0 1px 3px rgba(15,23,42,0.04)', overflow: 'hidden',
  }
  const thStyle = {
    textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--fg-subtle)', borderBottom: '1px solid var(--border-default)',
  }
  const tdStyle = { padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }
  const backBtnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
    color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 16,
  }

  return (
    <div className="workspace-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button type="button" style={backBtnStyle} onClick={() => navigate('/admin/permissions')}>
        <ArrowLeft size={15} /> Back to Permissions
      </button>

      {loading ? <Spinner center /> : error ? <ErrorMessage message={error} onRetry={load} /> : (
        <>
          <div style={{ ...cardStyle, padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--fg-primary)' }}>{permission.name}</h2>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: permission.description ? 'var(--fg-body)' : 'var(--fg-subtle)' }}>
              {permission.description || 'No description'}
            </p>
            <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--fg-muted)' }}>Created {formatDate(permission.created)}</p>
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: '1px solid var(--border-default)' }}>
              <ShieldCheck size={16} />
              <h3 style={{ margin: 0, fontSize: 14, color: 'var(--fg-primary)' }}>Granted to</h3>
              <Badge variant="brand">{grants.length}</Badge>
            </div>

            {grants.length === 0 ? (
              <EmptyState message="This permission isn't granted to any role yet." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface-alt)' }}>
                      {['ORGANIZATION', 'ROLE'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {grants.map(grant => (
                      <tr key={`${grant.company_id}-${grant.role_id}`}>
                        <td style={{ ...tdStyle, color: 'var(--fg-body)' }}>{grant.company_name}</td>
                        <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--fg-primary)' }}>{grant.role_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default PermissionDetailPage
