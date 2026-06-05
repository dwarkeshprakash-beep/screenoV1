import { useState, useEffect } from 'react'
import { Filter, Download } from 'lucide-react'
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
    pass:    { label: 'Pass',    bg: '#ECFDF5', fg: '#047857' },
    maybe:   { label: 'Maybe',   bg: '#FFFBEB', fg: '#B45309' },
    pending: { label: 'Pending', bg: '#F1F5F9', fg: '#6B7280' },
  }
  const d = map[decision] || map.pending
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 9999, background: d.bg, color: d.fg }}>{d.label}</span>
  )
}

function ReportsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getTeamReports()
      setReports(res.data || [])
    } catch (err) {
      setError('Could not load reports. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{ padding: 40 }}><Spinner /></div>
  if (error) return <ErrorMessage message={error} />

  const cardStyle = { background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }
  const thStyle = { textAlign: 'left', padding: '11px 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#94A3B8', borderBottom: '1px solid #E2E8F0' }
  const btnSecondary = { background: '#FFF', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: 8, fontWeight: 600, padding: '5px 10px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }

  const statCards = [
    { label: 'Total interviews', value: reports.length,                                            sub: 'This quarter' },
    { label: 'Pass rate',        value: reports.length ? `${Math.round(reports.filter(r => r.decision === 'pass').length / reports.length * 100)}%` : '—', sub: `${reports.filter(r => r.decision === 'pass').length} of ${reports.length}` },
    { label: 'Avg score',        value: reports.length ? (reports.reduce((a, r) => a + (r.overall_score || 0), 0) / reports.length).toFixed(1) : '—', sub: ‘↑ vs last month’ },
    { label: 'Reports pending',  value: reports.filter(r => !r.decision || r.decision === 'pending').length, sub: 'Send after attempt' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5B4FE9' }}>MANAGER · REPORTS</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', margin: '6px 0', letterSpacing: '-0.02em' }}>Reports</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {statCards.map((s, i) => (
          <div key={i} style={{ ...cardStyle, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280' }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#059669', fontWeight: 500, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Candidate reports</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnSecondary}><Filter size={12} /> Filter</button>
            <button style={btnSecondary}><Download size={12} /> Export all</button>
          </div>
        </div>

        {reports.length === 0 ? (
          <EmptyState message="No reports yet. Reports are generated after interviews complete." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['CANDIDATE', 'ROLE', 'ATTEMPTS', 'DATE', 'OVERALL', 'JD MATCH', 'DECISION', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((r, i) => {
                const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.name || 'Unknown'
                const overall = r.overall_score != null ? r.overall_score / 2 : null
                const jdMatch = r.jd_match != null ? r.jd_match : null

                return (
                  <tr key={r.candidate_id || i}
                    style={{ cursor: 'pointer', transition: 'background 120ms' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = '#FFF'}
                  >
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={name} size={32} />
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{name}</div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', color: '#6B7280' }}>{r.role || '—'}</td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>{r.attempts || 1}</td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', color: '#6B7280' }}>{r.report_date ? formatDate(r.report_date) : '—'}</td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
                      {overall != null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: overall >= 4 ? '#047857' : overall >= 3 ? '#B45309' : '#B53618' }}>{overall.toFixed(1)}</span>
                          <span style={{ flex: 1, height: 4, background: '#F1F5F9', borderRadius: 9999, overflow: 'hidden', display: 'inline-block', width: 48 }}>
                            <span style={{ display: 'block', height: '100%', width: `${(overall / 5) * 100}%`, background: '#5B4FE9', borderRadius: 9999 }} />
                          </span>
                        </div>
                      ) : <span style={{ color: '#94A3B8' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
                      {jdMatch != null
                        ? <span style={{ fontFamily: 'monospace', fontWeight: 700, color: jdMatch >= 75 ? '#047857' : jdMatch >= 60 ? '#B45309' : '#B53618' }}>{jdMatch}%</span>
                        : <span style={{ color: '#94A3B8' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
                      <DecisionBadge decision={r.decision} />
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
                      <button style={btnSecondary}>View report</button>
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

