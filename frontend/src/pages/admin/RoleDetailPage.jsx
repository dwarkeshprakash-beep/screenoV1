// RoleDetailPage - view a single role: its details plus every user it's assigned to.
// Reached by clicking a row in AdminRolesPage. Lets an admin see who holds a role
// without cross-referencing the Users list one person at a time.

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate, useOutletContext } from 'react-router-dom'
import { ArrowLeft, Users as UsersIcon } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import Badge from '../../components/shared/Badge'
import Pagination from '../../components/shared/Pagination'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

const DEFAULT_PAGE_SIZE = 10
const PORTAL_LABELS = { manager: 'Manager', bde: 'BDE', candidate: 'Candidate' }

function RoleDetailPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const companyId = searchParams.get('companyId')
  const navigate = useNavigate()
  const { setPageMeta } = useOutletContext()

  const [role, setRole] = useState(null)
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  function handlePageSizeChange(newSize) {
    setPageSize(newSize)
    setPage(1)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [roleRes, usersRes] = await Promise.all([
        api.getRole(id, companyId),
        api.getRoleUsers(id, companyId, { page, pageSize }),
      ])
      setRole(roleRes.data)
      setUsers(usersRes.data || [])
      setPagination(usersRes.pagination || null)
    } catch {
      setError('Could not load this role. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [id, companyId, page, pageSize])

  useEffect(() => { if (companyId) load() }, [companyId, load])

  useEffect(() => {
    setPageMeta({ title: 'Role Details', subtitle: 'Role details and assigned users' })
    return () => setPageMeta(null)
  }, [setPageMeta])

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

  if (!companyId) return <ErrorMessage message="Missing company context. Go back to Roles and try again." />

  return (
    <div className="workspace-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button type="button" style={backBtnStyle} onClick={() => navigate('/admin/roles')}>
        <ArrowLeft size={15} /> Back to Roles
      </button>

      {loading ? <Spinner center /> : error ? <ErrorMessage message={error} onRetry={load} /> : (
        <>
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: 'var(--fg-primary)' }}>{role.name}</h2>
              {role.portal && <Badge variant="brand">{PORTAL_LABELS[role.portal] || role.portal}</Badge>}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: role.description ? 'var(--fg-body)' : 'var(--fg-subtle)' }}>
              {role.description || 'No description'}
            </p>
            <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--fg-muted)' }}>Created {formatDate(role.created)}</p>
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: '1px solid var(--border-default)' }}>
              <UsersIcon size={16} />
              <h3 style={{ margin: 0, fontSize: 14, color: 'var(--fg-primary)' }}>Assigned users</h3>
              <Badge variant="brand">{pagination?.total ?? users.length}</Badge>
            </div>

            {users.length === 0 ? (
              <EmptyState message="No users hold this role yet." />
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-surface-alt)' }}>
                        {['NAME', 'EMAIL'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id}>
                          <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--fg-primary)' }}>{user.first_name} {user.last_name}</td>
                          <td style={{ ...tdStyle, color: 'var(--fg-body)' }}>{user.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
        </>
      )}
    </div>
  )
}

export default RoleDetailPage
