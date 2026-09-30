// UserDetailPage - the full picture of one user for an admin: basic details,
// organization, assigned roles, the ACLs/permissions those roles grant, and their
// interview history (pending vs completed, with result + report access).
// Reached by clicking a row in AdminUsersPage.

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate, useOutletContext } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, ClipboardList, ExternalLink } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import Badge from '../../components/shared/Badge'
import * as api from '../../services/api'
import { formatDate, statusVariant, interviewTypeLabel } from '../../utils/helpers'

function decisionVariant(decision) {
  if (decision === 'pass') return 'success'
  if (decision === 'fail') return 'danger'
  return 'neutral'
}

function DetailField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? 'var(--fg-body)' : 'var(--fg-subtle)', marginTop: 2 }}>{value || '-'}</div>
    </div>
  )
}

function InterviewsTable({ interviews }) {
  const thStyle = {
    textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--fg-subtle)', borderBottom: '1px solid var(--border-default)',
  }
  const tdStyle = { padding: '12px 20px', borderBottom: '1px solid var(--border-default)' }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--bg-surface-alt)' }}>
            {['TYPE', 'DATE', 'STATUS', 'RESULT', 'REPORT'].map(h => <th key={h} style={thStyle}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {interviews.map(interview => (
            <tr key={interview.id}>
              <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--fg-primary)' }}>
                {interviewTypeLabel(interview.type)}
                {interview.context_title && <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--fg-muted)' }}>{interview.context_title}</div>}
              </td>
              <td style={{ ...tdStyle, color: 'var(--fg-muted)' }}>{formatDate(interview.scheduled_at || interview.created)}</td>
              <td style={tdStyle}><Badge variant={statusVariant(interview.status)}>{interview.status}</Badge></td>
              <td style={tdStyle}>
                {interview.decision ? (
                  <Badge variant={decisionVariant(interview.decision)}>
                    {interview.decision}{interview.overall_score != null ? ` · ${interview.overall_score}` : ''}
                  </Badge>
                ) : (
                  <span style={{ color: 'var(--fg-subtle)' }}>-</span>
                )}
              </td>
              <td style={tdStyle}>
                {interview.report_status === 'ready' && interview.report_pdf_url ? (
                  <a href={interview.report_pdf_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--brand-600)', fontWeight: 600, textDecoration: 'none' }}>
                    View report <ExternalLink size={12} />
                  </a>
                ) : interview.report_id ? (
                  <span style={{ color: 'var(--fg-muted)' }}>Generating…</span>
                ) : (
                  <span style={{ color: 'var(--fg-subtle)' }}>-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UserDetailPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const companyId = searchParams.get('companyId')
  const navigate = useNavigate()
  const { setPageMeta } = useOutletContext()

  const [user, setUser] = useState(null)
  const [access, setAccess] = useState([])
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [accessRes, interviewsRes] = await Promise.all([
        api.getUserAccess(id, companyId),
        api.getUserInterviews(id, companyId),
      ])
      setUser(accessRes.data?.user || null)
      setAccess(accessRes.data?.access || [])
      setInterviews(interviewsRes.data || [])
    } catch {
      setError('Could not load this user. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [id, companyId])

  useEffect(() => { if (companyId) load() }, [companyId, load])

  useEffect(() => {
    setPageMeta({ title: 'User Details', subtitle: 'Profile, permissions, and interview history' })
    return () => setPageMeta(null)
  }, [setPageMeta])

  const cardStyle = {
    background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
    borderRadius: 12, boxShadow: '0 1px 3px rgba(15,23,42,0.04)', overflow: 'hidden',
  }
  const backBtnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
    color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 16,
  }
  const detailGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginTop: 16 }
  const sectionHeaderStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: '1px solid var(--border-default)' }
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

            <div style={detailGridStyle}>
              <DetailField label="Organization" value={user.organizationName} />
              <DetailField label="Employee ID" value={user.employee_id} />
              <DetailField label="Job Title" value={user.current_position} />
              <DetailField label="Department" value={user.department} />
              <DetailField label="Location" value={user.location} />
              <DetailField label="Member Since" value={formatDate(user.created)} />
            </div>
          </div>

          <div style={cardStyle}>
            <div style={sectionHeaderStyle}>
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

          <div style={cardStyle}>
            <div style={sectionHeaderStyle}>
              <ClipboardList size={16} />
              <h3 style={{ margin: 0, fontSize: 14, color: 'var(--fg-primary)' }}>Completed interviews</h3>
              <Badge variant="brand">{interviews.filter(i => i.status === 'completed').length}</Badge>
            </div>
            {interviews.filter(i => i.status === 'completed').length === 0 ? (
              <EmptyState message="No completed interviews yet." />
            ) : (
              <InterviewsTable interviews={interviews.filter(i => i.status === 'completed')} />
            )}
          </div>

          <div style={cardStyle}>
            <div style={sectionHeaderStyle}>
              <ClipboardList size={16} />
              <h3 style={{ margin: 0, fontSize: 14, color: 'var(--fg-primary)' }}>Pending interviews</h3>
              <Badge variant="brand">{interviews.filter(i => i.status !== 'completed').length}</Badge>
            </div>
            {interviews.filter(i => i.status !== 'completed').length === 0 ? (
              <EmptyState message="No pending interviews." />
            ) : (
              <InterviewsTable interviews={interviews.filter(i => i.status !== 'completed')} />
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default UserDetailPage
