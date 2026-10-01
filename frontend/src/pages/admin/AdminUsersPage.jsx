// AdminUsersPage - the only place user accounts are created. Lists users per company
// and manages their legacy role plus RBAC role assignments. See docs/rbac-multi-tenant-plan.md.

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { UserPlus, Upload } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import Pagination from '../../components/shared/Pagination'
import UserFormModal from '../../components/admin/UserFormModal'
import CompanyScopedToolbar from '../../components/admin/CompanyScopedToolbar'
import UsersTable from '../../components/admin/UsersTable'
import * as api from '../../services/api'

const DEFAULT_PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

function AdminUsersPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [companies, setCompanies] = useState([])
  const [companyId, setCompanyId] = useState(null)
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [actionError, setActionError] = useState(null)
  // One-time bulk backfill tool - see docs/open-issues.md if this is still here later
  // than expected; remove this state/handler/button plus the import API call once done.
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState('')
  const importInputRef = useRef(null)

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
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.getUsers(companyId, { page, pageSize, search }),
        api.getRoles(companyId), // full list - feeds the role-assignment picker, not paginated
      ])
      const data = usersRes.data || []
      if (data.length === 0 && page > 1) {
        setPage(p => p - 1)
        return
      }
      setUsers(data)
      setPagination(usersRes.pagination || null)
      setRoles(rolesRes.data || [])
    } catch {
      setError('Could not load users. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [companyId, page, pageSize, search])
  useEffect(() => { if (companyId) loadData() }, [companyId, loadData])

  function handlePageSizeChange(newSize) {
    setPageSize(newSize)
    setPage(1)
  }

  async function handleImportFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true); setImportStatus('')
    try {
      const csv = await file.text()
      const res = await api.importAdminUsersCSV(companyId, csv)
      const data = res.data || {}
      const parts = [`Imported ${data.inserted?.length || 0} new`]
      if (data.skippedExisting) parts.push(`${data.skippedExisting} already existed`)
      if (data.conflicts?.length) parts.push(`${data.conflicts.length} email conflict(s)`)
      if (data.missingRoles?.length) parts.push(`${data.missingRoles.length} with missing role(s)`)
      if (data.errors?.length) parts.push(`${data.errors.length} row error(s)`)
      setImportStatus(parts.join('; ') + '.')
      await loadData()
    } catch (err) {
      setImportStatus(err.message || 'CSV import failed.')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  async function handleDelete() {
    const target = deleteTarget
    setDeleteTarget(null)
    setActionError(null)
    try {
      await api.deleteUser(target.id, companyId)
      await loadData()
    } catch (err) {
      setActionError(err.message || 'Could not delete user')
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
          searchPlaceholder="Search by name or email…"
          itemLabel="user"
          count={pagination?.total ?? users.length}
          showCount={!loading && !error}
          addLabel="Add User"
          addIcon={UserPlus}
          onAdd={() => { setEditingUser(null); setFormOpen(true) }}
          extraActions={(
            <>
              <input ref={importInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} style={{ display: 'none' }} />
              <button
                type="button"
                disabled={!companyId || importing}
                onClick={() => importInputRef.current?.click()}
                style={{
                  background: 'var(--bg-surface)', color: 'var(--fg-primary)', border: '1px solid var(--border-default)', borderRadius: 8,
                  fontWeight: 600, fontSize: 13, padding: '9px 16px', cursor: (!companyId || importing) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6, opacity: (!companyId || importing) ? 0.6 : 1,
                }}
              >
                <Upload size={14} /> {importing ? 'Importing…' : 'Import CSV'}
              </button>
            </>
          )}
        />

        {importStatus && (
          <div style={{ padding: '10px 20px', background: 'var(--bg-surface-alt)', color: 'var(--fg-muted)', fontSize: 13, borderBottom: '1px solid var(--border-default)' }}>
            {importStatus}
          </div>
        )}

        {actionError && (
          <div role="alert" style={{ padding: '10px 20px', background: 'var(--danger-50)', color: 'var(--danger-700)', fontSize: 13, borderBottom: '1px solid var(--border-default)' }}>
            {actionError}
          </div>
        )}

        {loading ? <Spinner center /> : error ? <ErrorMessage message={error} onRetry={loadData} /> : users.length === 0 ? (
          <EmptyState message={search ? 'No users match your search.' : 'No users yet for this organization. Add the first one.'} />
        ) : (
          <>
            <UsersTable
              users={users}
              onView={u => navigate(`/admin/users/${u.id}?companyId=${companyId}`)}
              onEdit={u => { setEditingUser(u); setFormOpen(true) }}
              onDelete={u => { setDeleteTarget(u); setActionError(null) }}
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

      <UserFormModal
        open={formOpen}
        companyId={companyId}
        roles={roles}
        user={editingUser}
        onClose={() => setFormOpen(false)}
        onDone={loadData}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Delete ${deleteTarget?.first_name} ${deleteTarget?.last_name}? This cannot be undone.`}
        confirmText="Delete"
        danger
      />
    </div>
  )
}

export default AdminUsersPage
