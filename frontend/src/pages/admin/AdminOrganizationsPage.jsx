// AdminOrganizationsPage - manage Organizations (the companies table - the tenant
// boundary every other RBAC module is scoped under). Backend-driven pagination +
// search, same pattern as Roles/Users.

import { useState, useEffect } from 'react'
import { Building2, Search } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import Pagination from '../../components/shared/Pagination'
import OrganizationFormModal from '../../components/admin/OrganizationFormModal'
import OrganizationsTable from '../../components/admin/OrganizationsTable'
import * as api from '../../services/api'

const DEFAULT_PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    const timeout = setTimeout(() => { setSearch(searchInput.trim()); setPage(1) }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [searchInput])
  useEffect(() => { loadOrganizations() }, [page, pageSize, search])

  function handlePageSizeChange(newSize) {
    setPageSize(newSize)
    setPage(1)
  }

  async function loadOrganizations() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getOrganizations({ page, pageSize, search })
      const data = res.data || []
      if (data.length === 0 && page > 1) {
        setPage(p => p - 1)
        return
      }
      setOrganizations(data)
      setPagination(res.pagination || null)
    } catch {
      setError('Could not load organizations. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    try {
      await api.deleteOrganization(deleteTarget.id)
      await loadOrganizations()
    } catch (err) {
      setError(err.message || 'Could not delete organization')
    }
  }

  const cardStyle = {
    background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
    borderRadius: 12, boxShadow: '0 1px 3px rgba(15,23,42,0.04)', overflow: 'hidden',
  }
  const labelStyle = { fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }

  return (
    <div className="workspace-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={cardStyle}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap',
          padding: '16px 20px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface-alt)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="org-search" style={labelStyle}>Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
              <input
                id="org-search"
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search by organization name…"
                style={{
                  padding: '8px 12px 8px 32px', border: '1px solid var(--border-default)', borderRadius: 8,
                  fontSize: 13, fontFamily: 'inherit', background: 'var(--bg-surface)', color: 'var(--fg-primary)',
                  minWidth: 240,
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {!loading && !error && (
              <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                {pagination?.total ?? organizations.length} organization{(pagination?.total ?? organizations.length) === 1 ? '' : 's'}
              </span>
            )}
            <button
              type="button"
              onClick={() => { setEditingOrg(null); setFormOpen(true) }}
              style={{
                background: 'var(--brand-500)', color: 'var(--bg-surface)', border: 0, borderRadius: 8,
                fontWeight: 600, fontSize: 13, padding: '9px 16px', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <Building2 size={14} /> Add Organization
            </button>
          </div>
        </div>

        {loading ? <Spinner center /> : error ? <ErrorMessage message={error} onRetry={loadOrganizations} /> : organizations.length === 0 ? (
          <EmptyState message={search ? 'No organizations match your search.' : 'No organizations yet. Add the first one.'} />
        ) : (
          <>
            <OrganizationsTable
              organizations={organizations}
              onEdit={org => { setEditingOrg(org); setFormOpen(true) }}
              onDelete={org => setDeleteTarget(org)}
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

      <OrganizationFormModal
        open={formOpen}
        organization={editingOrg}
        onClose={() => setFormOpen(false)}
        onDone={loadOrganizations}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Organization"
        message={`Delete the "${deleteTarget?.name}" organization? This cannot be undone.`}
        confirmText="Delete"
        danger
      />
    </div>
  )
}

export default AdminOrganizationsPage
