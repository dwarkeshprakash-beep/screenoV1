// AdminRolesPage — manage the per-company Role catalog for the RBAC system.
// Roles belong to one company at a time (admin is platform-wide), so a company
// must be picked before the role list/actions are usable. See docs/rbac-multi-tenant-plan.md.

import { useState, useEffect } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import RoleFormModal from '../../components/admin/RoleFormModal'
import RolesToolbar from '../../components/admin/RolesToolbar'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

function AdminRolesPage() {
  const [companies, setCompanies] = useState([])
  const [companyId, setCompanyId] = useState(null)
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => { loadCompanies() }, [])
  useEffect(() => { if (companyId) loadRoles() }, [companyId])

  async function loadCompanies() {
    try {
      const res = await api.getAdminCompanies()
      const list = res.data || []
      setCompanies(list)
      setCompanyId(list[0]?.id || null)
    } catch {
      setError('Could not load companies. Please try again.')
      setLoading(false)
    }
  }

  async function loadRoles() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getRoles(companyId)
      setRoles(res.data || [])
    } catch {
      setError('Could not load roles. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    try {
      await api.deleteRole(deleteTarget.id, companyId)
      await loadRoles()
    } catch (err) {
      setError(err.message || 'Could not delete role')
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
  const iconBtnStyle = {
    background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8,
    padding: '6px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
  }

  return (
    <div className="workspace-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={cardStyle}>
        <RolesToolbar
          companies={companies}
          companyId={companyId}
          onCompanyChange={setCompanyId}
          roleCount={roles.length}
          showCount={!loading && !error}
          onAdd={() => { setEditingRole(null); setFormOpen(true) }}
        />

        {loading ? <Spinner center /> : error ? <ErrorMessage message={error} onRetry={loadRoles} /> : roles.length === 0 ? (
          <EmptyState message="No roles yet for this company. Add the first one." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-alt)' }}>
                  {['NAME', 'DESCRIPTION', 'CREATED', 'ACTIONS'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {roles.map(role => (
                  <tr key={role.id} style={{ transition: 'background 120ms' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-alt)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--fg-primary)' }}>{role.name}</td>
                    <td style={{ ...tdStyle, color: role.description ? 'var(--fg-body)' : 'var(--fg-subtle)' }}>{role.description || '—'}</td>
                    <td style={{ ...tdStyle, color: 'var(--fg-muted)' }}>{formatDate(role.created)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" style={iconBtnStyle} onClick={() => { setEditingRole(role); setFormOpen(true) }} aria-label="Edit role">
                          <Pencil size={13} />
                        </button>
                        <button type="button" style={{ ...iconBtnStyle, color: 'var(--danger-500)' }} onClick={() => setDeleteTarget(role)} aria-label="Delete role">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RoleFormModal
        open={formOpen}
        companyId={companyId}
        role={editingRole}
        onClose={() => setFormOpen(false)}
        onDone={loadRoles}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Role"
        message={`Delete the "${deleteTarget?.name}" role? This cannot be undone.`}
        confirmText="Delete"
        danger
      />
    </div>
  )
}

export default AdminRolesPage
