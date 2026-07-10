import { useEffect, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Download, Filter, FileText, TrendingUp, Star, Clock, AlertTriangle, RotateCw } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import EmptyState from '../../components/shared/EmptyState'
import Avatar from '../../components/shared/Avatar'
import Modal from '../../components/shared/Modal'
import * as api from '../../services/api'
import { formatDate, parseStoredArray } from '../../utils/helpers'

function DecisionBadge({ decision }) {
  const map = {
    pass:       { label: 'Pass',       bg: 'var(--success-50)', fg: 'var(--success-600)' },
    borderline: { label: 'Borderline', bg: 'var(--warning-50)', fg: 'var(--warning-600)' },
    fail:       { label: 'Fail',       bg: 'var(--danger-50)', fg: 'var(--danger-700)' },
    pending:    { label: 'Pending',    bg: 'var(--bg-surface-alt)', fg: 'var(--fg-muted)' },
  }
  const d = map[decision] || map.pending
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 9999, background: d.bg, color: d.fg }}>{d.label}</span>
}

export function ReportTable({ reports, onOpenReport, btnSecondary, thStyle }) {
  if (reports.length === 0) return <EmptyState message="No reports yet. Reports are generated after interviews complete." />
  return (
    <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', minWidth: 780, borderCollapse: 'collapse', fontSize: 13 }}>
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
            <tr key={r.id || i} onClick={() => onOpenReport(r)} style={{ cursor: 'pointer', transition: 'background 120ms' }}
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
                {r.team_member_id != null ? (
                  <button type="button" onClick={event => { event.stopPropagation(); onOpenReport(r) }} style={btnSecondary}>View</button>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontStyle: 'italic' }}>External</span>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
    </div>
  )
}

function ScoreMetric({ label, value }) {
  const score = value == null ? null : Number(value)
  return (
    <div style={{ padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--bg-surface-alt)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-primary)' }}>{score == null || Number.isNaN(score) ? '—' : score.toFixed(1)}</div>
    </div>
  )
}

export function ReportDetailModal({ report, loading, error, onClose }) {
  const [tab, setTab] = useState('summary')
  const strengths = parseStoredArray(report?.strengths)
  const candidateName = report
    ? `${report.candidate_first || ''} ${report.candidate_last || ''}`.trim() || 'Candidate'
    : 'Candidate'
  const source = report?.client_name || report?.assessment_subject || 'General assessment'

  return (
    <Modal open={!!report} onClose={onClose} title="Report Detail" size="lg">
      {loading ? <Spinner center /> : error ? <ErrorMessage message={error} /> : report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-primary)', margin: '0 0 4px' }}>{candidateName}</h3>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>{report.candidate_email || 'No email'} &middot; {source}</p>
              <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: '4px 0 0' }}>{report.interview_type || 'Interview'} &middot; {formatDate(report.interview_date || report.created)}</p>
            </div>
            <DecisionBadge decision={report.decision} />
          </div>

          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', gap: 20 }}>
            <button
              onClick={() => setTab('summary')}
              style={{ padding: '8px 4px', border: 'none', borderBottom: tab === 'summary' ? '2px solid var(--brand-500)' : '2px solid transparent', background: 'none', color: tab === 'summary' ? 'var(--brand-600)' : 'var(--fg-muted)', fontWeight: 600, cursor: 'pointer' }}
            >
              Summary
            </button>
            <button
              onClick={() => setTab('transcript')}
              style={{ padding: '8px 4px', border: 'none', borderBottom: tab === 'transcript' ? '2px solid var(--brand-500)' : '2px solid transparent', background: 'none', color: tab === 'transcript' ? 'var(--brand-600)' : 'var(--fg-muted)', fontWeight: 600, cursor: 'pointer' }}
            >
              Transcript
            </button>
          </div>

          {tab === 'summary' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(8.5rem, 1fr))', gap: 10 }}>
                <ScoreMetric label="Overall" value={report.overall_score} />
                <ScoreMetric label="Confidence" value={report.confidence} />
                <ScoreMetric label="Technical" value={report.tech_knowledge} />
                <ScoreMetric label="Communication" value={report.communication} />
                <ScoreMetric label="Problem solving" value={report.problem_solving} />
              </div>

              {report.summary && (
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Summary</h4>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--fg-body)', margin: 0 }}>{report.summary}</p>
                </div>
              )}

              {strengths.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Highlights</h4>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {strengths.map(item => (
                      <span key={item} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 999, background: 'var(--brand-50)', color: 'var(--brand-700)', fontWeight: 600 }}>{item}</span>
                    ))}
                  </div>
                </div>
              )}

              {report.reason && (
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Decision reason</h4>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--fg-body)', margin: 0 }}>{report.reason}</p>
                </div>
              )}

              {report.pdf_url && (
                <div>
                  <a href={report.pdf_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-500)', textDecoration: 'none' }}>
                    Open PDF report
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '50vh', overflowY: 'auto', paddingRight: 8 }}>
              {report.transcripts && report.transcripts.length > 0 ? report.transcripts.map((t, idx) => (
                <div key={t.id || idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--brand-100)', color: 'var(--brand-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 'bold' }}>AI</div>
                    <div style={{ background: 'var(--bg-surface-alt)', padding: '10px 14px', borderRadius: '0 12px 12px 12px', fontSize: 14, color: 'var(--fg-primary)', lineHeight: 1.5 }}>{t.question}</div>
                  </div>
                  {t.answer && (
                    <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-end', flexDirection: 'row-reverse' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--gray-200)', color: 'var(--gray-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 'bold' }}>
                        {candidateName.charAt(0)}
                      </div>
                      <div style={{ background: 'var(--brand-600)', color: '#fff', padding: '10px 14px', borderRadius: '12px 0 12px 12px', fontSize: 14, lineHeight: 1.5 }}>{t.answer}</div>
                    </div>
                  )}
                </div>
              )) : (
                <p style={{ color: 'var(--fg-muted)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No transcript available for this interview.</p>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function ReportsPage() {
  const location = useLocation()
  const [mainTab, setMainTab]         = useState('all')
  const [reports, setReports]         = useState([])
  const [reportJobs, setReportJobs]   = useState([])
  const [decisionFilter, setDecision] = useState('all')
  const [templateFilter, setTemplate] = useState('all')
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)
  const [queryHandled, setQueryHandled] = useState(false)
  const [retryingJobId, setRetryingJobId] = useState(null)

  const load = useCallback(async (tab) => {
    setLoading(true)
    setError(null)
    try {
      const source = tab === 'client' ? 'client' : tab === 'monthly' ? 'monthly' : null
      const [res, jobsRes] = await Promise.all([
        api.getTeamReports(source),
        api.getReportJobs().catch(() => ({ data: [] })),
      ])
      const payload = res.data || {}
      setReports(Array.isArray(payload) ? payload : payload.reports || [])
      setReportJobs(jobsRes.data || [])
    } catch {
      setError('Could not load reports. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(mainTab) }, [mainTab, load])

  const openReport = useCallback(async (report) => {
    setSelectedReport(report)
    setDetailLoading(true)
    setDetailError(null)
    try {
      const res = report.interview_id
        ? await api.getReportByInterview(report.interview_id)
        : await api.getReportDetail(report.id)
      setSelectedReport({ ...report, ...(res.data || {}) })
    } catch (err) {
      setDetailError(err.message || 'Could not load report detail.')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    setQueryHandled(false)
  }, [location.search])

  useEffect(() => {
    const interviewId = new URLSearchParams(location.search).get('interview')
    if (!interviewId || queryHandled || loading) return
    setQueryHandled(true)
    void openReport({ interview_id: interviewId })
  }, [location.search, queryHandled, loading, openReport])

  function handleTabChange(t) { setMainTab(t); setDecision('all'); setTemplate('all') }

  async function retryJob(job) {
    setRetryingJobId(job.id)
    setError(null)
    try {
      await api.retryReportJob(job.id)
      const jobsRes = await api.getReportJobs()
      setReportJobs(jobsRes.data || [])
    } catch (err) {
      setError(err.message || 'Could not retry report job.')
    } finally {
      setRetryingJobId(null)
    }
  }

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
  const failedJobs = reportJobs.filter(job => job.status === 'failed')
  const activeJobs = reportJobs.filter(job => ['pending', 'processing'].includes(job.status))
  const pendingCount = reports.filter(r => r.status === 'generating').length + failedJobs.length + activeJobs.length

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
    <div className="workspace-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))', gap: 14 }}>
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

      {(failedJobs.length > 0 || activeJobs.length > 0) && (
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color="var(--warning-600)" />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>Report jobs</h2>
          </div>
          <div className="assignment-list">
            {[...failedJobs, ...activeJobs].slice(0, 8).map(job => {
              const name = `${job.candidate_first || ''} ${job.candidate_last || ''}`.trim() || 'Candidate'
              return (
                <div className="assignment-row" key={job.id}>
                  <div className="assignment-row__content">
                    <strong>{name}</strong>
                    <span>{job.context_title || job.interview_type || 'Assessment'} | attempts {job.attempts || 0}</span>
                    {job.last_error && <span style={{ color: 'var(--danger-700)' }}>{job.last_error}</span>}
                  </div>
                  <span className={`status-pill${job.status === 'failed' ? ' status-pill--danger' : ' status-pill--brand'}`}>{job.status}</span>
                  {job.status === 'failed' && (
                    <button type="button" onClick={() => retryJob(job)} disabled={retryingJobId === job.id} style={btnSecondary}>
                      <RotateCw size={12} />{retryingJobId === job.id ? 'Retrying...' : 'Retry'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

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
                <option value="borderline">Borderline</option>
                <option value="fail">Fail</option>
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
          <ReportTable reports={visible} onOpenReport={openReport} btnSecondary={btnSecondary} thStyle={thStyle} />
        )}
      </div>
      <ReportDetailModal
        report={selectedReport}
        loading={detailLoading}
        error={detailError}
        onClose={() => { setSelectedReport(null); setDetailError(null) }}
      />
    </div>
  )
}

export default ReportsPage



