import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Filter, FileText, TrendingUp, Star, Clock } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

const AV_COLORS = [
  { bg: '#EDE9FE', fg: '#5B21B6' }, { bg: '#FED7AA', fg: '#9A3412' },
  { bg: '#A7F3D0', fg: '#065F46' }, { bg: '#BFDBFE', fg: '#1E40AF' },
  { bg: '#FBCFE8', fg: '#9D174D' }, { bg: '#FDE68A', fg: '#854D0E' },
  { bg: '#C7D2FE', fg: '#3730A3' }, { bg: '#FCA5A5', fg: '#7F1D1D' },
]

function avHash(s) {
  let h = 0
  for (let i = 0; i < (s || '').length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function Avatar({ name = '?', size = 32 }) {
  const c = AV_COLORS[avHash(name) % AV_COLORS.length]
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: 9999, flexShrink: 0, background: c.bg, color: c.fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: Math.round(size * 0.38), letterSpacing: '-0.01em' }}>
      {initials}
    </div>
  )
}

function DecisionBadge({ decision }) {
  const map = {
    pass: { label: 'Pass', bg: '#ECFDF5', fg: '#047857' },
    maybe: { label: 'Maybe', bg: '#FFFBEB', fg: '#B45309' },
    needs_review: { label: 'Needs review', bg: '#EFF6FF', fg: '#1D4ED8' },
    pending: { label: 'Pending', bg: '#F1F5F9', fg: '#6B7280' },
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
  const cardStyle = { background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }
  const thStyle = { textAlign: 'left', padding: '11px 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#94A3B8', borderBottom: '1px solid #E2E8F0' }
  const btnSecondary = { background: '#FFF', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: 8, fontWeight: 600, padding: '5px 10px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }

  function exportCsv() {
    const headers = ['Candidate', 'Email', 'Type', 'Attempt', 'Completed', 'Score', 'Decision']
    const rows = visibleReports.map(r => [
      `${r.first_name || ''} ${r.last_name || ''}`.trim(),
      r.email || '',
      r.interview_type || '',
      r.attempts || '',
      r.completed_date || r.report_date || '',
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

  const statCards = [
    { icon: FileText,   bg: '#EFEDFD', color: '#5B4FE9', label: 'Total interviews', value: stats?.totalInterviews ?? reports.length,                               sub: 'Completed attempts' },
    { icon: TrendingUp, bg: '#ECFDF5', color: '#059669', label: 'Pass rate',        value: stats?.passRate == null ? '—' : `${stats.passRate}%`,                   sub: `${stats?.passCount ?? 0} pass decisions` },
    { icon: Star,       bg: '#FFFBEB', color: '#D97706', label: 'Avg score',        value: stats?.averageScore == null ? '—' : stats.averageScore.toFixed(1),       sub: `Out of ${stats?.scoreMax || 10}` },
    { icon: Clock,      bg: '#FEF2F2', color: '#EF4444', label: 'Pending reports',  value: stats?.reportsPending ?? reports.filter(r => !r.report_id).length,       sub: 'Worker queue' },
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
              <div style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Candidate reports</div>
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
              <tr style={{ background: '#F8FAFC' }}>
                {['CANDIDATE', 'TYPE', 'ATTEMPT', 'DATE', 'OVERALL', 'DECISION', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {visibleReports.map((r, i) => {
                const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.name || 'Unknown'
                const overall = r.overall_score != null ? Number(r.overall_score) : null
                const scoreMax = Number(r.score_max || stats?.scoreMax || 10)
                return (
                  <tr key={r.attempt_id || r.report_id || r.candidate_id || i} style={{ cursor: 'pointer', transition: 'background 120ms' }} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = '#FFF'}>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={name} size={32} />
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{name}</div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', color: '#6B7280' }}>{r.interview_type || r.type || '-'}</td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>{r.attempts || 1}</td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', color: '#6B7280' }}>{formatDate(r.report_date || r.completed_date || r.scheduled_date)}</td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
                      {overall != null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: overall >= 7.5 ? '#047857' : overall >= 5.5 ? '#B45309' : '#B53618' }}>{overall.toFixed(1)}</span>
                          <span style={{ flex: 1, height: 4, background: '#F1F5F9', borderRadius: 9999, overflow: 'hidden', display: 'inline-block', width: 48 }}>
                            <span style={{ display: 'block', height: '100%', width: `${Math.min(100, (overall / scoreMax) * 100)}%`, background: '#5B4FE9', borderRadius: 9999 }} />
                          </span>
                        </div>
                      ) : <span style={{ color: '#94A3B8' }}>-</span>}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}><DecisionBadge decision={r.decision} /></td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
                      <button type="button" onClick={() => navigate(`/manager/team/${r.candidate_id}`)} style={btnSecondary} aria-label={`View report for ${name}`}>View report</button>
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
