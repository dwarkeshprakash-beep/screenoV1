// OrganizationDetailPage - a dashboard-lite summary for one tenant: how much of
// the RBAC surface (users/roles/ACLs) it actually uses. Reached by clicking a
// row in AdminOrganizationsPage. The stat tiles deep-link into the other admin
// modules pre-filtered to this company, since Roles/Users/ACLs are all
// company-scoped lists that otherwise default to whichever company loads first.

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Users, ShieldCheck, LockKeyhole } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import { formatDate } from '../../utils/helpers'
import * as api from '../../services/api'

function OrganizationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getOrganizationSummary(id)
      setSummary(res.data)
    } catch {
      setError('Could not load this organization. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const cardStyle = {
    background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
    borderRadius: 12, boxShadow: '0 1px 3px rgba(15,23,42,0.04)', overflow: 'hidden',
  }
  const backBtnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
    color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 16,
  }
  const statGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }
  const statTileStyle = {
    ...cardStyle, padding: 18, display: 'flex', flexDirection: 'column', gap: 8,
    textDecoration: 'none', transition: 'border-color 120ms',
  }
  const statValueStyle = { fontSize: 26, fontWeight: 700, color: 'var(--fg-primary)' }
  const statLabelStyle = { fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }

  if (loading) return <Spinner center />
  if (error) return <ErrorMessage message={error} onRetry={load} />

  const { organization, userCount, roleCount, aclCount } = summary

  return (
    <div className="workspace-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button type="button" style={backBtnStyle} onClick={() => navigate('/admin/organizations')}>
        <ArrowLeft size={15} /> Back to Organizations
      </button>

      <div style={{ ...cardStyle, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        {organization.logo_url && (
          <img src={organization.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
        )}
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: 'var(--fg-primary)' }}>{organization.name}</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--fg-muted)' }}>Created {formatDate(organization.created)}</p>
        </div>
      </div>

      <div style={statGridStyle}>
        <Link to={`/admin/users?companyId=${organization.id}`} style={statTileStyle}>
          <Users size={18} color="var(--brand-500)" />
          <span style={statValueStyle}>{userCount}</span>
          <span style={statLabelStyle}>Users</span>
        </Link>
        <Link to={`/admin/roles?companyId=${organization.id}`} style={statTileStyle}>
          <ShieldCheck size={18} color="var(--brand-500)" />
          <span style={statValueStyle}>{roleCount}</span>
          <span style={statLabelStyle}>Roles</span>
        </Link>
        <Link to={`/admin/acls?companyId=${organization.id}`} style={statTileStyle}>
          <LockKeyhole size={18} color="var(--brand-500)" />
          <span style={statValueStyle}>{aclCount}</span>
          <span style={statLabelStyle}>ACLs</span>
        </Link>
      </div>
    </div>
  )
}

export default OrganizationDetailPage
