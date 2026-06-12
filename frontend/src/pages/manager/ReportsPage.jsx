import { useEffect, useState, useCallback } from 'react'
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
    pass:         { label: 'Pass',         bg: 'var(--success-50)', fg: 'var(--success-600)' },
    maybe:        { label: 'Maybe',        bg: 'var(--warning-50)', fg: 'var(--warning-600)' },
    needs_review: { label: 'Needs review', bg: 'var(--info-50)',    fg: 'var(--info-600)'    },
    pending:      { label: 'Pending',      bg: 'var(--bg-surface-alt)', fg: 'var(--fg-muted)' },
  }
  const d = map[decision] || map.pending
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 9999, background: d.bg, color: d.fg }}>{d.label}</span>
}

function ReportTable({ reports, navigate, btnSecondary, thStyle }) {
  if (reports.length === 0) return <EmptyState message="No reports yet. Reports are generated after interviews complete." />
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: 'var(--bg-surface-alt)' }}>
          {['CANDIDATE', 'SOURCE', 'TYPE', 'DATE', 'OVERALL', 'DECISION', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {reports.map((r, i) => {
          const name = `${r.candidate_first || ''} ${r.candidate_last || ''}`.trim() || 'Unknown'
          const overall = r.overall_score != null ? Number(r.overall_score) : null
          const source = r.client_name ? r.client_name : r.assessment_subject ? r.assessment_subject : '—'
          return (
            <tr key={r.id || i} style={{ cursor: 'pointer', transition: 'background 120ms' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-alt)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}>
              <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={name} size={32} />
                  <div style={{ fontWeight: 600, color: 'var(--fg-primary)' }}>{name}</div>
                </div>
              </td>
              <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)', color: 'var(--fg-muted)', fontSize: 12 }}>
                <span style={{ background: r.client_name ? 'var(--brand-50)' : r.assessment_subject ? 'var(--warning-50)' : 'var(--bg-surface-alt)', color: r.client_name ? 'var(--brand-700)' : r.assessment_subject ? 'var(--warning-700)' : 'var(--fg-subtle)', padding: '2px 7px', borderRadius: 4, fontWeight: 600, fontSize: 11 }}>
                  {source}
                </span>
              </td>
              <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)', color: 'var(--fg-muted)' }}>{r.interview_type || '-'}</td>
              <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)', color: 'var(--fg-muted)' }}>{formatDate(r.created)}</td>
              <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)' }}>
                {overall != null ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: overall >= 7.5 ? 'var(--success-600)' : overall >= 5.5 ? 'var(--warning-600)' : 'var(--danger-700)' }}>{overall.toFixed(1)}</span>
                    <span style={{ width: 48, height: 4, background: 'var(--bg-surface-alt)', borderRadius: 9999, overflow: 'hidden', display: 'inline-block' }}>
                      <span style={{ display: 'block', height: '100%', width: `${Math.min(100, (overall / 10) * 100)}%`, background: 'var(--brand-500)', borderRadius: 9999 }} />
                    </span>
                  </div>
                ) : <span style={{ color: 'var(--fg-subtle)' }}>—</span>}
              </td>
              <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)' }}><DecisionBadge decision={r.decision} /></td>
              <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)' }}>
                <button type="button" onClick={() => { if (r.team_member_id) navigate(`/manager/team/${r.team_member_id}`) }} style={btnSecondary}>View</button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function ReportsPage() {
  const navigate = useNavigate()
  const [mainTab, setMainTab]         = useState('all')
  const [reports, setReports]         = useState([])
  const [stats, setStats]             = useState(null)
  const [decisionFilter, setDecision] = useState('all')
  const [templateFilter, setTemplate] = useState('all')
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  const load = useCallback(async (tab) => {
    setLoading(true)
    setError(null)
    try {
      const source = tab === 'client' ? 'client' : tab === 'monthly' ? 'monthly' : null
      const res = await api.getTeamReports(source)
      const payload = res.data || {}
      setReports(Array.isArray(payload) ? payload : payload.reports || [])
      setStats(Array.isArray(payload) ? null : payload.stats || null)
    } catch {
      setError('Could not load reports. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(mainTab) }, [mainTab, load])

  function handleTabChange(t) { setMainTab(t); setDecision('all'); setTemplate('all') }

  function exportCsv() {
    const rows = visible.map(r => [
      `${r.candidate_first || ''} ${r.candidate_last || ''}`.trim(),
      r.client_name || r.assessment_subject || '',
      r.interview_type || '',
      r.created || '',
      r.overall_score ?? '',
      r.decision || 'pending',
    ])
    const csv = [['Candidate', 'Source', 'Type', 'Date', 'Score', 'Decision'], ...rows]
      .map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `screeno-reports-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const clientNames = [...new Set(reports.filter(r => r.client_name).map(r => r.client_name))]

  const visible = reports.filter(r => {
    if (decisionFilter !== 'all' && (r.decision || 'pending') !== decisionFilter) return false
    if (templateFilter !== 'all' && r.client_name !== templateFilter) return false
    return true
  })

  const passCount   = reports.filter(r => r.decision === 'pass').length
  const passRate    = reports.length > 0 ? Math.round((passCount / reports.length) * 100) : null
  const scores      = reports.map(r => Number(r.overall_score)).filter(s => !isNaN(s) && s > 0)
  const avgScore    = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const pendingCount = reports.filter(r => r.status === 'generating').length

  const cardStyle    = { background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }
  const thStyle      = { textAlign: 'left', padding: '11px 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--fg-subtle)', borderBottom: '1px solid var(--border-default)' }
  const btnSecondary = { background: 'var(--bg-surface)', color: 'var(--fg-primary)', border: '1px solid var(--border-default)', borderRadius: 8, fontWeight: 600, padding: '5px 10px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }
  const tabStyle = (t) => ({
    padding: '8px 16px', borderRadius: 0, border: 0, background: 'transparent',
    fontWeight: mainTab === t ? 700 : 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
    color: mainTab === t ? 'var(--brand-500)' : 'var(--fg-muted)',
    borderBottom: mainTab === t ? '2px solid var(--brand-500)' : '2px solid transparent',
    marginBottom: -1,
  })

  const statCards = [
    { icon: FileText,   bg: 'var(--brand-50)',   color: 'var(--brand-500)',   label: 'Total reports',    value: reports.length,                              sub: 'Completed interviews' },
    { icon: TrendingUp, bg: 'var(--success-50)', color: 'var(--success-500)', label: 'Pass rate',         value: passRate == null ? '—' : `${passRate}%`,      sub: `${passCount} pass decisions` },
    { icon: Star,       bg: 'var(--warning-50)', color: 'var(--warning-500)', label: 'Avg score',         value: avgScore == null ? '—' : avgScore.toFixed(1), sub: 'Out of 10' },
    { icon: Clock,      bg: 'var(--danger-50)',  color: 'var(--danger-600)',  label: 'Pending reports',   value: pendingCount,                                 sub: 'Generating…' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {statCards.map(s => (
          <div key={s.label} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, padding: 18 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={20} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--fg-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {/* Main tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', padding: '0 20px', gap: 4 }}>
          <button style={tabStyle('all')} onClick={() => handleTabChange('all')}>All Reports</button>
          <button style={tabStyle('client')} onClick={() => handleTabChange('client')}>Client Interviews</button>
          <button style={tabStyle('monthly')} onClick={() => handleTabChange('monthly')}>Monthly Assessments</button>
        </div>

        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label style={btnSecondary}>
              <Filter size={12} /> Decision
              <select value={decisionFilter} onChange={e => setDecision(e.target.value)} style={{ border: 0, outline: 'none', fontSize: 12, fontWeight: 600, background: 'transparent', cursor: 'pointer' }}>
                <option value="all">All</option>
                <option value="pass">Pass</option>
                <option value="maybe">Maybe</option>
                <option value="needs_review">Needs review</option>
                <option value="pending">Pending</option>
              </select>
            </label>
            {mainTab !== 'monthly' && clientNames.length > 0 && (
              <label style={btnSecondary}>
                <Filter size={12} /> Client
                <select value={templateFilter} onChange={e => setTemplate(e.target.value)} style={{ border: 0, outline: 'none', fontSize: 12, fontWeight: 600, background: 'transparent', cursor: 'pointer' }}>
                  <option value="all">All clients</option>
                  {clientNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            )}
          </div>
          <button type="button" onClick={exportCsv} style={btnSecondary}><Download size={12} /> Export CSV</button>
        </div>

        {loading ? <Spinner center /> : error ? <ErrorMessage message={error} /> : (
          <ReportTable reports={visible} navigate={navigate} btnSecondary={btnSecondary} thStyle={thStyle} />
        )}
      </div>
    </div>
  )
}

export default ReportsPage
