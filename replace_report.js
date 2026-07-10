const fs = require('fs');
const file = 'frontend/src/pages/manager/ReportsPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = 
export function ReportDetailModal({ report, loading, error, onClose }) {
  const [tab, setTab] = useState('summary')
  const strengths = parseStoredArray(report?.strengths)
  const candidateName = report
    ? \\ \\.trim() || 'Candidate'
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


content = content.replace(/export function ReportDetailModal\(\{[\s\S]*?function ReportsPage/, replacement + '\n\nfunction ReportsPage');
fs.writeFileSync(file, content);
console.log('updated report modal');
