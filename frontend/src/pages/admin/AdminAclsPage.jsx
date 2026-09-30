// AdminAclsPage - manage the per-company ACL catalog for the RBAC system. Each
// ACL gates exactly one module (strict 1:1); role grants come in a later phase.
// See docs/rbac-multi-tenant-plan.md.

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import Pagination from '../../components/shared/Pagination'
import AclFormModal from '../../components/admin/AclFormModal'
import CompanyScopedToolbar from '../../components/admin/CompanyScopedToolbar'
import AclsTable from '../../components/admin/AclsTable'
import * as api from '../../services/api'

const DEFAULT_PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

function AdminAclsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [companies, setCompanies] = useState([])
  const [companyId, setCompanyId] = useState(null)
  const [acls, setAcls] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingAcl, setEditingAcl] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  async function loadCompanies() {
    try {
      const res = await api.getAdminCompanies()
      setCompanies(res.data || [])
    } catch {
      setError('Could not load organizations. Please try again.')
      setLoading(false)
    }
  }
  useEffect(() => { loadCompanies() }, [])
  // Re-derive the selected company whenever the ?companyId= query param changes, not
  // just on mount - OrganizationDetailPage links here with a different companyId each
  // time, and React Router doesn't remount this page for a same-route navigation.
  useEffect(() => {
    if (companies.length === 0) return
    const requestedId = Number(searchParams.get('companyId'))
    setCompanyId(companies.some(c => c.id === requestedId) ? requestedId : (companies[0]?.id || null))
  }, [searchParams, companies])
  useEffect(() => { setPage(1); setSearchInput(''); setSearch('') }, [companyId])
  useEffect(() => {
    const timeout = setTimeout(() => { setSearch(searchInput.trim()); setPage(1) }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [searchInput])
  // Memoised on everything it reads so the effect below re-runs exactly when they change.
  const loadAcls = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getAcls(companyId, { page, pageSize, search })
      const data = res.data || []
      if (data.length === 0 && page > 1) {
        setPage(p => p - 1)
        return
      }
      setAcls(data)
      setPagination(res.pagination || null)
    } catch {
      setError('Could not load ACLs. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [companyId, page, pageSize, search])
  useEffect(() => { if (companyId) loadAcls() }, [companyId, loadAcls])

  function handlePageSizeChange(newSize) {
    setPageSize(newSize)
    setPage(1)
  }

  async function handleDelete() {
    try {
      await api.deleteAcl(deleteTarget.id, companyId)
      await loadAcls()
    } catch (err) {
      setError(err.message || 'Could not delete ACL')
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
          searchPlaceholder="Search by ACL name…"
          itemLabel="ACL"
          count={pagination?.total ?? acls.length}
          showCount={!loading && !error}
          addLabel="Add ACL"
          addIcon={LockKeyhole}
          onAdd={() => { setEditingAcl(null); setFormOpen(true) }}
        />

        {loading ? <Spinner center /> : error ? <ErrorMessage message={error} onRetry={loadAcls} /> : acls.length === 0 ? (
          <EmptyState message={search ? 'No ACLs match your search.' : 'No ACLs yet for this organization. Add the first one.'} />
        ) : (
          <>
            <AclsTable
              acls={acls}
              onView={acl => navigate(`/admin/acls/${acl.id}?companyId=${companyId}`)}
              onEdit={acl => { setEditingAcl(acl); setFormOpen(true) }}
              onDelete={acl => setDeleteTarget(acl)}
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

      <AclFormModal
        open={formOpen}
        companyId={companyId}
        acl={editingAcl}
        onClose={() => setFormOpen(false)}
        onDone={loadAcls}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete ACL"
        message={`Delete the "${deleteTarget?.name}" ACL? This cannot be undone.`}
        confirmText="Delete"
        danger
      />
    </div>
  )
}

export default AdminAclsPage
