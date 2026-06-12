import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Filter, FileText, TrendingUp, Star, Clock } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import Avatar from '../../components/shared/Avatar'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

function DecisionBadge({ decision }) {
  const map = {
    pass: { label: 'Pass', bg: 'var(--success-50)', fg: 'var(--success-600)' },
    maybe: { label: 'Maybe', bg: 'var(--warning-50)', fg: 'var(--warning-600)' },
    needs_review: { label: 'Needs review', bg: 'var(--info-50)', fg: 'var(--info-600)' },
    pending: { label: 'Pending', bg: 'var(--slate-100)', fg: 'var(--slate-500)' },
  }
  const d = map[decision] || map.pending
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 9999, background: d.bg, color: d.fg }}>{d.label}</span>
}

function ReportsPage() {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState(null)
  const [decisionFilter, setDecisionFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getTeamReports()
      const payload = res.data || {}
      setReports(Array.isArray(payload) ? payload : payload.reports || [])
      setStats(Array.isArray(payload) ? null : payload.stats || null)
    } catch {
      setError('Could not load reports. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Spinner center />
  if (error) return <ErrorMessage message={error} />

  const visibleReports = decisionFilter === 'all' ? reports : reports.filter(r => (r.decision || 'pending') === decisionFilter)
  const cardStyle = { background: 'var(--bg-surface)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }
  const thStyle = { textAlign: 'left', padding: '11px 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--slate-400)', borderBottom: '1px solid var(--slate-200)' }
  const btnSecondary = { background: 'var(--bg-surface)', color: 'var(--slate-900)', border: '1px solid var(--slate-300)', borderRadius: 8, fontWeight: 600, padding: '5px 10px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }

  function exportCsv() {
    const headers = ['Candidate', 'Email', 'Type', 'Date', 'Score', 'Decision']
    const rows = visibleReports.map(r => [
      `${r.candidate_first || ''} ${r.candidate_last || ''}`.trim(),
      r.email || '',
      r.interview_type || '',
      r.created || '',
      r.overall_score ?? '',
      r.decision || 'pending',
    ])
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `screeno-reports-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const totalCount = reports.length
  const passCount = reports.filter(r => r.decision === 'pass').length
  const passRate = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : null
  const scores = reports.map(r => Number(r.overall_score)).filter(s => !isNaN(s) && s > 0)
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const pendingCount = reports.filter(r => r.status === 'generating').length

  const statCards = [
    { icon: FileText,   bg: 'var(--brand-50)', color: 'var(--brand-500)', label: 'Total interviews', value: totalCount,                               sub: 'Completed attempts' },
    { icon: TrendingUp, bg: 'var(--success-50)', color: 'var(--success-500)', label: 'Pass rate',        value: passRate == null ? '—' : `${passRate}%`,                   sub: `${passCount} pass decisions` },
    { icon: Star,       bg: 'var(--warning-50)', color: 'var(--warning-500)', label: 'Avg score',        value: avgScore == null ? '—' : avgScore.toFixed(1),       sub: `Out of 10` },
    { icon: Clock,      bg: 'var(--danger-50)', color: 'var(--danger-600)', label: 'Pending reports',  value: pendingCount,       sub: 'Worker queue' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {statCards.map(s => (
          <div key={s.label} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, padding: 18 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={20} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--slate-900)', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--slate-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)' }}>Candidate reports</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <label style={btnSecondary}>
              <Filter size={12} /> Filter
              <select aria-label="Filter reports by decision" value={decisionFilter} onChange={e => setDecisionFilter(e.target.value)} style={{ border: 0, outline: 'none', fontSize: 12, fontWeight: 600, background: 'transparent' }}>
                <option value="all">All</option>
                <option value="pass">Pass</option>
                <option value="maybe">Maybe</option>
                <option value="needs_review">Needs review</option>
                <option value="pending">Pending</option>
              </select>
            </label>
            <button type="button" onClick={exportCsv} style={btnSecondary} aria-label="Export visible reports as CSV"><Download size={12} /> Export all</button>
          </div>
        </div>

        {visibleReports.length === 0 ? (
          <EmptyState message="No reports yet. Reports are generated after interviews complete." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--slate-50)' }}>
                {['CANDIDATE', 'TYPE', 'DATE', 'OVERALL', 'DECISION', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {visibleReports.map((r, i) => {
                const name = `${r.candidate_first || ''} ${r.candidate_last || ''}`.trim() || r.name || 'Unknown'
                const overall = r.overall_score != null ? Number(r.overall_score) : null
                const scoreMax = Number(r.score_max || stats?.scoreMax || 10)
                return (
                  <tr key={r.id || i} style={{ cursor: 'pointer', transition: 'background 120ms' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--slate-50)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--slate-100)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={name} size={32} />
                        <div style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{name}</div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-500)' }}>{r.interview_type || '-'}</td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--slate-100)', color: 'var(--slate-500)' }}>{formatDate(r.created)}</td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--slate-100)' }}>
                      {overall != null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: overall >= 7.5 ? 'var(--success-600)' : overall >= 5.5 ? 'var(--warning-600)' : 'var(--danger-700)' }}>{overall.toFixed(1)}</span>
                          <span style={{ flex: 1, height: 4, background: 'var(--slate-100)', borderRadius: 9999, overflow: 'hidden', display: 'inline-block', width: 48 }}>
                            <span style={{ display: 'block', height: '100%', width: `${Math.min(100, (overall / scoreMax) * 100)}%`, background: 'var(--brand-500)', borderRadius: 9999 }} />
                          </span>
                        </div>
                      ) : <span style={{ color: 'var(--slate-400)' }}>-</span>}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--slate-100)' }}><DecisionBadge decision={r.decision} /></td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--slate-100)' }}>
                      <button type="button" onClick={() => { if (r.team_member_id) navigate(`/manager/team/${r.team_member_id}`) }} style={btnSecondary} aria-label={`View report for ${name}`}>View report</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default ReportsPage
