// pages/manager/ReportsPage.jsx
// Team reports — list with score bars and view buttons.

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import Avatar from '../../components/shared/Avatar'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import * as api from '../../services/api'
import { formatDate } from '../../utils/helpers'

function MiniBar({ value, max = 10, color = 'var(--brand-500)' }) {
  const pct = value ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 60, height: 5, background: 'var(--slate-100)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{value != null ? value : '—'}</span>
    </div>
  )
}

function ScoreBadge({ score }) {
  if (!score) return <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>—</span>
  const color = score >= 7 ? 'var(--success-500)' : score >= 5 ? 'var(--warning-500)' : 'var(--danger-500)'
  return (
    <span style={{ padding: '4px 10px', borderRadius: 99, background: `${color}18`, color, fontSize: 14, fontWeight: 700 }}>
      {score}/10
    </span>
  )
}

function ReportsPage() {
  const [reports, setReports]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [viewReport, setViewReport] = useState(null)

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

  const filtered = reports.filter(r => {
    if (!search) return true
    const name = `${r.first_name} ${r.last_name}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  if (loading) return <div style={{ padding: 40 }}><Spinner /></div>
  if (error) return <ErrorMessage message={error} />

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Reports</h1>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
          <input type="text" placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '8px 12px 8px 30px', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, outline: 'none', width: 220 }} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={search ? 'No results for this search.' : 'No reports yet. Reports are generated after interviews complete.'} />
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Candidate', 'Confidence', 'Knowledge', 'Communication', 'Overall', ''].map((h, i) => (
                  <th key={i} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', borderBottom: '1px solid var(--border-default)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.candidate_id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={`${r.first_name} ${r.last_name}`} size={32} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-primary)' }}>{r.first_name} {r.last_name}</div>
                        {r.report_date && <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{formatDate(r.report_date)}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}><MiniBar value={r.confidence} /></td>
                  <td style={{ padding: '12px 16px' }}><MiniBar value={r.tech_knowledge} color="var(--info-500)" /></td>
                  <td style={{ padding: '12px 16px' }}><MiniBar value={r.communication} color="var(--success-500)" /></td>
                  <td style={{ padding: '12px 16px' }}><ScoreBadge score={r.overall_score} /></td>
                  <td style={{ padding: '12px 16px' }}>
                    <Button variant="secondary" size="sm" onClick={() => setViewReport(r)}>View Report</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!viewReport} onClose={() => setViewReport(null)} title={viewReport ? `Report — ${viewReport.first_name} ${viewReport.last_name}` : ''} size="md">
        {viewReport && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[['Overall', viewReport.overall_score], ['Confidence', viewReport.confidence], ['Tech Knowledge', viewReport.tech_knowledge], ['Communication', viewReport.communication]].map(([lbl, val]) => (
                <div key={lbl} style={{ padding: 12, background: 'var(--bg-surface-alt)', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4 }}>{lbl}</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{val != null ? `${val}/10` : '—'}</div>
                </div>
              ))}
            </div>
            {viewReport.summary && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Summary</div>
                <p style={{ fontSize: 13, color: 'var(--fg-body)', lineHeight: 1.6, margin: 0 }}>{viewReport.summary}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ReportsPage
