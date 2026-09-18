// AclPermissionsModal - for one ACL, grant each of the company's roles a set of
// permissions. Columns are whatever exists in the global Permissions catalog right
// now (see AdminPermissionsPage) - nothing hardcoded here. Saving replaces the
// ACL's entire grant set in one call. See docs/rbac-multi-tenant-plan.md.

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import Spinner from '../shared/Spinner'
import EmptyState from '../shared/EmptyState'
import * as api from '../../services/api'

function AclPermissionsModal({ open, onClose, companyId, acl }) {
  const [permissions, setPermissions] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !acl) return
    loadPermissions()
  }, [open, acl])

  async function loadPermissions() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getAclPermissions(acl.id, companyId)
      setPermissions(res.data?.permissions || [])
      setRows(res.data?.roles || [])
    } catch (err) {
      setError(err.message || 'Could not load permissions')
    } finally {
      setLoading(false)
    }
  }

  function togglePermission(roleId, permissionId) {
    setRows(current => current.map(row => {
      if (row.roleId !== roleId) return row
      const has = row.permissionIds.includes(permissionId)
      return {
        ...row,
        permissionIds: has
          ? row.permissionIds.filter(id => id !== permissionId)
          : [...row.permissionIds, permissionId],
      }
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const grants = rows.map(row => ({ roleId: row.roleId, permissionIds: row.permissionIds }))
      await api.updateAclPermissions(acl.id, companyId, grants)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save permissions')
    } finally {
      setSaving(false)
    }
  }

  const thStyle = {
    textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--fg-subtle)', borderBottom: '1px solid var(--border-default)',
  }
  const thCenterStyle = { ...thStyle, textAlign: 'center' }
  const tdStyle = { padding: '10px 14px', borderBottom: '1px solid var(--border-default)' }

  return (
    <Modal open={open} onClose={onClose} title={acl ? `Permissions - ${acl.name}` : 'Permissions'} size="lg">
      {loading ? <Spinner center /> : permissions.length === 0 ? (
        <EmptyState message={
          <>No permissions exist yet. Add some in the <Link to="/admin/permissions">Permissions module</Link> first.</>
        } />
      ) : rows.length === 0 ? (
        <EmptyState message="No roles exist yet for this company. Create a role first, then come back here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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

          {error && <p style={{ fontSize: 12, color: 'var(--danger-500)', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="button" loading={saving} onClick={handleSave}>Save Permissions</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default AclPermissionsModal
