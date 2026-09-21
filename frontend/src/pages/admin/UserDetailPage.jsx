// UserDetailPage - view a single user: their profile, assigned roles, and the
// effective permissions those roles grant. Reached by clicking a row in
// AdminUsersPage. Mirrors RoleDetailPage from the other direction - there you see
// a role's users, here you see a user's roles and what those roles unlock.

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import Badge from '../../components/shared/Badge'
import * as api from '../../services/api'

function UserDetailPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const companyId = searchParams.get('companyId')
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [access, setAccess] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getUserAccess(id, companyId)
      setUser(res.data?.user || null)
      setAccess(res.data?.access || [])
    } catch {
      setError('Could not load this user. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [id, companyId])

  useEffect(() => { if (companyId) load() }, [companyId, load])

  const cardStyle = {
    background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
    borderRadius: 12, boxShadow: '0 1px 3px rgba(15,23,42,0.04)', overflow: 'hidden',
  }
  const backBtnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
    color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 16,
  }
  const moduleRowStyle = { padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }

  if (!companyId) return <ErrorMessage message="Missing company context. Go back to Users and try again." />

  return (
    <div className="workspace-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button type="button" style={backBtnStyle} onClick={() => navigate('/admin/users')}>
        <ArrowLeft size={15} /> Back to Users
      </button>

      {loading ? <Spinner center /> : error ? <ErrorMessage message={error} onRetry={load} /> : (
        <>
          <div style={{ ...cardStyle, padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--fg-primary)' }}>{user.first_name} {user.last_name}</h2>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--fg-body)' }}>{user.email}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {user.roles.length === 0 ? (
                <span style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>No roles assigned</span>
              ) : (
                user.roles.map(r => <Badge key={r.id} variant="brand">{r.name}</Badge>)
              )}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: '1px solid var(--border-default)' }}>
              <ShieldCheck size={16} />
              <h3 style={{ margin: 0, fontSize: 14, color: 'var(--fg-primary)' }}>Effective permissions</h3>
              <Badge variant="brand">{access.length}</Badge>
            </div>

            {access.length === 0 ? (
              <EmptyState message="This user's roles don't grant any permissions yet." />
            ) : (
              access.map(entry => (
                <div key={entry.aclId} style={moduleRowStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {entry.moduleName}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)' }}>{entry.aclName}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {entry.permissions.map(p => <Badge key={p.id}>{p.name}</Badge>)}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default UserDetailPage
