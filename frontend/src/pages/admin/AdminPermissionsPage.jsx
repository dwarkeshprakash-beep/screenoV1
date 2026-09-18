// AdminPermissionsPage - manage the global Permissions catalog (Read/Save/Delete by
// default). Not per-company - these are the actions the ACL permissions grid lets
// you grant to a role. See docs/rbac-multi-tenant-plan.md.

import { useState, useEffect } from 'react'
import { KeyRound } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import PermissionFormModal from '../../components/admin/PermissionFormModal'
import PermissionsTable from '../../components/admin/PermissionsTable'
import * as api from '../../services/api'

function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingPermission, setEditingPermission] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => { loadPermissions() }, [])

  async function loadPermissions() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getPermissions()
      setPermissions(res.data || [])
    } catch {
      setError('Could not load permissions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    try {
      await api.deletePermission(deleteTarget.id)
      await loadPermissions()
    } catch (err) {
      setError(err.message || 'Could not delete permission')
    }
  }

  const cardStyle = {
    background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
    borderRadius: 12, boxShadow: '0 1px 3px rgba(15,23,42,0.04)', overflow: 'hidden',
  }

  return (
    <div className="workspace-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={cardStyle}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          padding: '16px 20px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface-alt)',
        }}>
          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
            Global - the same catalog every ACL's permissions grid draws its columns from.
          </span>
          <button
            type="button"
            onClick={() => { setEditingPermission(null); setFormOpen(true) }}
            style={{
              background: 'var(--brand-500)', color: 'var(--bg-surface)', border: 0, borderRadius: 8,
              fontWeight: 600, fontSize: 13, padding: '9px 16px', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <KeyRound size={14} /> Add Permission
          </button>
        </div>

        {loading ? <Spinner center /> : error ? <ErrorMessage message={error} onRetry={loadPermissions} /> : permissions.length === 0 ? (
          <EmptyState message="No permissions yet. Add the first one." />
        ) : (
          <PermissionsTable
            permissions={permissions}
            onEdit={permission => { setEditingPermission(permission); setFormOpen(true) }}
            onDelete={permission => setDeleteTarget(permission)}
          />
        )}
      </div>

      <PermissionFormModal
        open={formOpen}
        permission={editingPermission}
        onClose={() => setFormOpen(false)}
        onDone={loadPermissions}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Permission"
        message={`Delete the "${deleteTarget?.name}" permission? This cannot be undone.`}
        confirmText="Delete"
        danger
      />
    </div>
  )
}

export default AdminPermissionsPage
