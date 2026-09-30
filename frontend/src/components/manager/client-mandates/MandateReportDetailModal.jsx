import ErrorMessage from '../../shared/ErrorMessage'
import Modal from '../../shared/Modal'
import Spinner from '../../shared/Spinner'
import { formatDate, parseStoredArray } from '../../../utils/helpers'

function MandateReportDetailModal({ report, loading, error, onClose }) {
  const strengths = parseStoredArray(report?.strengths)
  const name = report
    ? `${report.candidate_first || ''} ${report.candidate_last || ''}`.trim() || 'Candidate'
    : 'Candidate'

  return (
    <Modal open={!!report} onClose={onClose} title="Report detail" size="lg">
      {loading ? <Spinner center /> : error ? <ErrorMessage message={error} /> : report && (
        <div className="workspace-stack">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-primary)', margin: '0 0 4px' }}>{name}</h3>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>{report.candidate_email || 'No email'} | {report.interview_type || 'Interview'}</p>
              <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: '4px 0 0' }}>{formatDate(report.interview_date || report.created)}</p>
            </div>
            <span className={`status-pill${report.decision === 'pass' ? ' status-pill--success' : report.decision === 'fail' ? ' status-pill--danger' : ' status-pill--warning'}`}>{report.decision || 'Review'}</span>
          </div>
          <div className="detail-facts">
            <div className="detail-fact"><div className="detail-fact__label">Overall</div><div className="detail-fact__value">{report.overall_score ?? 'Not scored'}</div></div>
            <div className="detail-fact"><div className="detail-fact__label">Technical</div><div className="detail-fact__value">{report.tech_knowledge ?? 'Not scored'}</div></div>
            <div className="detail-fact"><div className="detail-fact__label">Communication</div><div className="detail-fact__value">{report.communication ?? 'Not scored'}</div></div>
            <div className="detail-fact"><div className="detail-fact__label">Problem solving</div><div className="detail-fact__value">{report.problem_solving ?? 'Not scored'}</div></div>
          </div>
          {report.summary && (
            <section>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-primary)', margin: '0 0 8px' }}>Summary</h3>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--fg-body)', margin: 0 }}>{report.summary}</p>
            </section>
          )}
          {strengths.length > 0 && (
            <section>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-primary)', margin: '0 0 8px' }}>Highlights</h3>
              <div className="tag-list">{strengths.map(item => <span className="tag" key={item}>{item}</span>)}</div>
            </section>
          )}
          {report.reason && (
            <section>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-primary)', margin: '0 0 8px' }}>Decision reason</h3>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--fg-body)', margin: 0 }}>{report.reason}</p>
            </section>
          )}
        </div>
      )}
    </Modal>
  )
}

export default MandateReportDetailModal
