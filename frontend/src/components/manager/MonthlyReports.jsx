import { useState, useEffect } from 'react'
import * as api from '../../services/api'
import { ReportTable, ReportDetailModal } from '../../pages/manager/ReportsPage'
import Spinner from '../shared/Spinner'
import ErrorMessage from '../shared/ErrorMessage'

export function MonthlyReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [selectedReport, setSelectedReport] = useState(null)
  const [detailError, setDetailError] = useState(null)
  
  const [decisionFilter, setDecisionFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')

  useEffect(() => {
    api.getTeamReports('monthly')
      .then(res => {
        setReports(Array.isArray(res) ? res : res.data?.reports || res.reports || [])
      })
      .catch(err => setError('Could not load reports. ' + err.message))
      .finally(() => setLoading(false))
  }, [])

  const openReport = async (report) => {
    setSelectedReport(report)
    setDetailError(null)
    try {
      const res = report.interview_id
        ? await api.getReportByInterview(report.interview_id)
        : await api.getReportDetail(report.id)
      setSelectedReport({ ...report, ...(res.data || {}) })
    } catch (err) {
      setDetailError(err.message || 'Could not load report detail.')
    }
  }

  const users = [...new Set(reports.map(r => `${r.candidate_first || ''} ${r.candidate_last || ''}`.trim() || r.candidate_email).filter(Boolean))]

  const visible = reports.filter(r => {
    if (decisionFilter && r.decision !== decisionFilter) return false
    if (userFilter) {
      const name = `${r.candidate_first || ''} ${r.candidate_last || ''}`.trim() || r.candidate_email
      if (name !== userFilter) return false
    }
    return true
  })

  return (
    <div className="workspace-stack">
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <select value={decisionFilter} onChange={e => setDecisionFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-default)' }}>
          <option value="">All Decisions</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
          <option value="pending">Pending</option>
        </select>
        <select value={userFilter} onChange={e => setUserFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-default)' }}>
          <option value="">All Users</option>
          {users.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : error ? <ErrorMessage message={error} /> : (
        <ReportTable
          reports={visible}
          onOpenReport={openReport}
          btnSecondary={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, border: '1px solid var(--border-default)', background: 'var(--bg-surface-alt)', borderRadius: 6, color: 'var(--fg-primary)' }}
          thStyle={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', background: 'var(--bg-surface-alt)', borderBottom: '1px solid var(--border-default)' }}
        />
      )}

      <ReportDetailModal
        report={selectedReport}
        error={detailError}
        onClose={() => { setSelectedReport(null); setDetailError(null) }}
      />
    </div>
  )
}
