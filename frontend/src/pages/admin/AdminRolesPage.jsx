// AdminRolesPage - manage the per-company Role catalog for the RBAC system.
// Roles belong to one company at a time (admin is platform-wide), so a company
// must be picked before the role list/actions are usable. See docs/rbac-multi-tenant-plan.md.

import { useState, useEffect } from 'react'
import { ShieldPlus } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import Pagination from '../../components/shared/Pagination'
import RoleFormModal from '../../components/admin/RoleFormModal'
import CompanyScopedToolbar from '../../components/admin/CompanyScopedToolbar'
import RolesTable from '../../components/admin/RolesTable'
import * as api from '../../services/api'

const DEFAULT_PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

function AdminRolesPage() {
  const [companies, setCompanies] = useState([])
  const [companyId, setCompanyId] = useState(null)
  const [roles, setRoles] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => { loadCompanies() }, [])
  useEffect(() => { setPage(1); setSearchInput(''); setSearch('') }, [companyId])
  useEffect(() => {
    const timeout = setTimeout(() => { setSearch(searchInput.trim()); setPage(1) }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [searchInput])
  useEffect(() => { if (companyId) loadRoles() }, [companyId, page, pageSize, search])

  function handlePageSizeChange(newSize) {
    setPageSize(newSize)
    setPage(1)
  }

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
      const res = await api.getRoles(companyId, { page, pageSize, search })
      const data = res.data || []
      if (data.length === 0 && page > 1) {
        setPage(p => p - 1)
        return
      }
      setRoles(data)
      setPagination(res.pagination || null)
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

  return (
    <div className="workspace-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={cardStyle}>
        <CompanyScopedToolbar
          companies={companies}
          companyId={companyId}
          onCompanyChange={setCompanyId}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Search by role name…"
          itemLabel="role"
          count={pagination?.total ?? roles.length}
          showCount={!loading && !error}
          addLabel="Add Role"
          addIcon={ShieldPlus}
          onAdd={() => { setEditingRole(null); setFormOpen(true) }}
        />

        {loading ? <Spinner center /> : error ? <ErrorMessage message={error} onRetry={loadRoles} /> : roles.length === 0 ? (
          <EmptyState message={search ? 'No roles match your search.' : 'No roles yet for this company. Add the first one.'} />
        ) : (
          <>
            <RolesTable
              roles={roles}
              onEdit={role => { setEditingRole(role); setFormOpen(true) }}
              onDelete={role => setDeleteTarget(role)}
            />
            {pagination && (
              <Pagination
                page={pagination.page}
                pageSize={pageSize}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </>
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
