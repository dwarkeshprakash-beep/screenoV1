import { useEffect, useMemo, useState } from 'react'
import { Building2, CalendarDays, CircleHelp, Info, SlidersHorizontal } from 'lucide-react'
import EmptyState from '../shared/EmptyState'
import Modal from '../shared/Modal'
import { formatDate, formatDateTime } from '../../utils/helpers'

const SOURCES = [
  { value: 'client_mandate', label: 'Client mandates' },
  { value: 'monthly_assessment', label: 'Monthly assessments' },
]

function displayValue(value, fallback = '—') {
  return value === undefined || value === null || value === '' ? fallback : value
}

function titleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())
}

function recordDate(item) {
  return item.scheduled_at || item.started_at || item.ended_at || item.created
}

function scoreLabel(item) {
  if (item.overall_score === undefined || item.overall_score === null || item.overall_score === '') return '—'
  const score = Number(item.overall_score)
  return Number.isFinite(score) ? score.toFixed(1) + '/10' : '—'
}

function resultLabel(item) {
  return titleCase(item.result || item.decision || item.status || 'Pending')
}

function resultStyle(item) {
  const value = String(item.result || item.decision || item.status || '').toLowerCase()
  if (['passed', 'success', 'completed', 'hired', 'offer_made', 'selected'].includes(value)) {
    return { background: 'var(--success-50)', color: 'var(--success-700)' }
  }
  if (['failed', 'rejected', 'cancelled', 'expired_no_show', 'withdrawn'].includes(value)) {
    return { background: 'var(--danger-50)', color: 'var(--danger-700)' }
  }
  return { background: 'var(--warning-50)', color: 'var(--warning-700)' }
}

function DetailFact({ label, value }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div style={{ padding: 12, background: 'var(--bg-surface-alt)', border: '1px solid var(--border-default)', borderRadius: 9 }}>
      <div style={{ color: 'var(--fg-subtle)', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--fg-primary)', fontSize: 13, lineHeight: 1.45, overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  )
}

export default function InterviewHistoryPanel({
  interviews = [],
  defaultSource = 'client_mandate',
  showSourceFilter = true,
  title = 'Interview history',
}) {
  const [source, setSource] = useState(defaultSource)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => { setSource(defaultSource) }, [defaultSource])

  const filtered = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null
    const to = dateTo ? new Date(dateTo + 'T23:59:59.999').getTime() : null
    return interviews
      .filter(item => !showSourceFilter || item.history_source === source)
      .filter(item => {
        const timestamp = new Date(recordDate(item) || 0).getTime()
        if (from !== null && timestamp < from) return false
        if (to !== null && timestamp > to) return false
        return true
      })
      .sort((a, b) => new Date(recordDate(b) || 0) - new Date(recordDate(a) || 0))
  }, [interviews, source, dateFrom, dateTo, showSourceFilter])

  const groups = useMemo(() => {
    const grouped = new Map()
    filtered.forEach(item => {
      const key = item.history_source === 'monthly_assessment'
        ? item.context_title || item.role_name || 'Monthly assessment'
        : item.company_name || item.context_title || 'Client mandate'
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(item)
    })
    return [...grouped.entries()]
  }, [filtered])

  return (
    <div className="workspace-stack" style={{ gap: 14 }}>
      <div className="workspace-toolbar" style={{ alignItems: 'flex-end' }}>
        <div>
          <h3 style={{ fontSize: 16, margin: 0 }}>{title}</h3>
          <p style={{ margin: '4px 0 0', color: 'var(--fg-muted)', fontSize: 12 }}>
            Grouped by {source === 'client_mandate' ? 'client company' : 'assessment'}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {showSourceFilter && (
            <label style={{ display: 'grid', gap: 4, fontSize: 11, color: 'var(--fg-muted)', fontWeight: 600 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><SlidersHorizontal size={11} />History type</span>
              <select className="form-input" value={source} onChange={event => setSource(event.target.value)} style={{ minWidth: 170 }}>
                {SOURCES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          )}
          <label style={{ display: 'grid', gap: 4, fontSize: 11, color: 'var(--fg-muted)', fontWeight: 600 }}>
            From
            <input className="form-input" type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 11, color: 'var(--fg-muted)', fontWeight: 600 }}>
            To
            <input className="form-input" type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} />
          </label>
          {(dateFrom || dateTo) && (
            <button type="button" className="product-button product-button--secondary product-button--md" onClick={() => { setDateFrom(''); setDateTo('') }}>
              Clear dates
            </button>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="workspace-panel">
          <EmptyState message="No interview history matches these filters." />
        </div>
      ) : groups.map(([groupName, rows]) => (
        <section className="workspace-panel" key={groupName} style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface-alt)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <Building2 size={15} color="var(--brand-500)" />
              <strong style={{ color: 'var(--fg-primary)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>{groupName}</strong>
            </div>
            <span className="status-pill status-pill--brand">{rows.length} interview{rows.length === 1 ? '' : 's'}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--fg-muted)', fontSize: 11 }}>
                  <th style={{ padding: '10px 14px' }}>Date</th>
                  <th style={{ padding: '10px 14px' }}>Role / assessment</th>
                  <th style={{ padding: '10px 14px' }}>Interview</th>
                  <th style={{ padding: '10px 14px' }}>Status / result</th>
                  <th style={{ padding: '10px 14px' }}>Score</th>
                  <th style={{ padding: '10px 14px', width: 56 }}>Info</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(item => (
                  <tr key={item.record_kind + '-' + item.id} style={{ borderTop: '1px solid var(--border-default)', color: 'var(--fg-primary)', fontSize: 12 }}>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>{recordDate(item) ? formatDate(recordDate(item)) : '—'}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{displayValue(item.role_name || item.context_title)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {item.record_kind === 'client_round'
                        ? 'Client round ' + displayValue(item.round_number, '')
                        : titleCase(item.type || item.interview_mode || 'Interview')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ ...resultStyle(item), display: 'inline-flex', padding: '3px 8px', borderRadius: 999, fontWeight: 700, fontSize: 11 }}>{resultLabel(item)}</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{scoreLabel(item)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <button type="button" aria-label="View interview details" onClick={() => setSelected(item)} style={{ display: 'inline-flex', padding: 6, borderRadius: 7, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--brand-500)', cursor: 'pointer' }}>
                        <Info size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Interview details" size="md">
        {selected && (
          <div className="workspace-stack" style={{ gap: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 10, background: 'var(--brand-50)' }}>
              <CircleHelp size={18} color="var(--brand-600)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong style={{ color: 'var(--fg-primary)', fontSize: 14 }}>{selected.company_name || selected.context_title || 'Interview'}</strong>
                <div style={{ color: 'var(--fg-muted)', fontSize: 12, marginTop: 3 }}>{selected.role_name || 'Role not recorded'}</div>
              </div>
            </div>
            <div className="form-grid">
              <DetailFact label="Candidate" value={[selected.candidate_first, selected.candidate_last].filter(Boolean).join(' ')} />
              <DetailFact label="Email" value={selected.candidate_email} />
              <DetailFact label="Scheduled" value={recordDate(selected) ? formatDateTime(recordDate(selected)) : null} />
              <DetailFact label="Result" value={resultLabel(selected)} />
              <DetailFact label="Interview type" value={selected.record_kind === 'client_round' ? 'Client round ' + displayValue(selected.round_number, '') : titleCase(selected.type)} />
              <DetailFact label="Mode" value={titleCase(selected.interview_mode)} />
              <DetailFact label="Difficulty" value={titleCase(selected.difficulty)} />
              <DetailFact label="Score" value={scoreLabel(selected) === '—' ? null : scoreLabel(selected)} />
              <DetailFact label="Duration" value={selected.duration_minutes ? selected.duration_minutes + ' minutes' : null} />
              <DetailFact label="Location" value={selected.location} />
              <DetailFact label="Feedback" value={selected.feedback} />
              <DetailFact label="Manager notes" value={selected.manager_notes} />
              <DetailFact label="Decision reason" value={selected.reason} />
            </div>
            {selected.meeting_url && (
              <a className="product-button product-button--secondary product-button--md" href={selected.meeting_url} target="_blank" rel="noreferrer" style={{ alignSelf: 'flex-start', textDecoration: 'none' }}>
                <CalendarDays size={14} />Open meeting link
              </a>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
