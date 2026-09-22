// AclDetailPage - view one ACL and grant its roles a set of permissions. Promoted
// from the old AclPermissionsModal into a full page so the roles x permissions
// grid has room to breathe once a company has more than a handful of either.
// Reached by clicking a row in AdminAclsPage.

import { useState, useEffect, useCallback } from 'react'
import { Link, useParams, useSearchParams, useNavigate, useOutletContext } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import Button from '../../components/shared/Button'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

function AclDetailPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const companyId = searchParams.get('companyId')
  const navigate = useNavigate()
  const { setPageMeta } = useOutletContext()

  const [acl, setAcl] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saveError, setSaveError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [aclRes, permissionsRes] = await Promise.all([
        api.getAcl(id, companyId),
        api.getAclPermissions(id, companyId),
      ])
      setAcl(aclRes.data)
      setPermissions(permissionsRes.data?.permissions || [])
      setRows(permissionsRes.data?.roles || [])
    } catch {
      setError('Could not load this ACL. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [id, companyId])

  useEffect(() => { if (companyId) load() }, [companyId, load])

  useEffect(() => {
    setPageMeta({ title: 'ACL Details', subtitle: 'Manage which roles get which permissions' })
    return () => setPageMeta(null)
  }, [setPageMeta])

  function togglePermission(roleId, permissionId) {
    setRows(current => current.map(row => {
      if (row.roleId !== roleId) return row
      const has = row.permissionIds.includes(permissionId)
      return {
        ...row,
        permissionIds: has
          ? row.permissionIds.filter(pid => pid !== permissionId)
          : [...row.permissionIds, permissionId],
      }
    }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const grants = rows.map(row => ({ roleId: row.roleId, permissionIds: row.permissionIds }))
      await api.updateAclPermissions(id, companyId, grants)
    } catch (err) {
      setSaveError(err.message || 'Could not save permissions')
    } finally {
      setSaving(false)
    }
  }

  const cardStyle = {
    background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
    borderRadius: 12, boxShadow: '0 1px 3px rgba(15,23,42,0.04)', overflow: 'hidden',
  }
  const backBtnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
    color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 16,
  }
  const moduleBadgeStyle = {
    display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
    background: 'var(--brand-50)', color: 'var(--brand-700)',
  }
  const thStyle = {
    textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--fg-subtle)', borderBottom: '1px solid var(--border-default)',
  }
  const thCenterStyle = { ...thStyle, textAlign: 'center' }
  const tdStyle = { padding: '10px 14px', borderBottom: '1px solid var(--border-default)' }

  if (!companyId) return <ErrorMessage message="Missing company context. Go back to ACLs and try again." />

  return (
    <div className="workspace-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button type="button" style={backBtnStyle} onClick={() => navigate('/admin/acls')}>
        <ArrowLeft size={15} /> Back to ACLs
      </button>

      {loading ? <Spinner center /> : error ? <ErrorMessage message={error} onRetry={load} /> : (
        <>
          <div style={{ ...cardStyle, padding: 20 }}>
            {acl.module_name ? (
              <span style={moduleBadgeStyle}>{acl.module_name}</span>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Not assigned to a module yet</span>
            )}
            <h2 style={{ margin: '10px 0 0', fontSize: 18, color: 'var(--fg-primary)' }}>{acl.name}</h2>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: acl.description ? 'var(--fg-body)' : 'var(--fg-subtle)' }}>
              {acl.description || 'No description'}
            </p>
            <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--fg-muted)' }}>Created {formatDate(acl.created)}</p>
          </div>

          <div style={cardStyle}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)' }}>
              <h3 style={{ margin: 0, fontSize: 14, color: 'var(--fg-primary)' }}>Role permissions</h3>
            </div>

            {permissions.length === 0 ? (
              <EmptyState message={
                <>No permissions exist yet. Add some in the <Link to="/admin/permissions">Permissions module</Link> first.</>
              } />
            ) : rows.length === 0 ? (
              <EmptyState message={
                <>No roles exist yet for this company. Create one in the <Link to="/admin/roles">Roles module</Link> first.</>
              } />
            ) : (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border-default)', borderRadius: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-surface-alt)' }}>
                        <th style={thStyle}>Role</th>
                        {permissions.map(p => <th key={p.id} style={thCenterStyle}>{p.name}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => (
                        <tr key={row.roleId}>
                          <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--fg-primary)' }}>{row.roleName}</td>
                          {permissions.map(p => (
                            <td key={p.id} style={{ ...tdStyle, textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={row.permissionIds.includes(p.id)}
                                onChange={() => togglePermission(row.roleId, p.id)}
                                style={{ width: 16, height: 16, cursor: 'pointer' }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {saveError && <p style={{ fontSize: 12, color: 'var(--danger-500)', margin: 0 }}>{saveError}</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="button" loading={saving} onClick={handleSave}>Save Permissions</Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default AclDetailPage
