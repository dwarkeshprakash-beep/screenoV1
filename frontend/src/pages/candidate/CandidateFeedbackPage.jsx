import { useCallback, useEffect, useState } from 'react'
import { Lightbulb, FileText } from 'lucide-react'
import Spinner from '../../components/shared/Spinner'
import * as api from '../../services/api'
import { formatDate, parseStoredArray } from '../../utils/helpers'

function CandidateFeedbackPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getCandidateFeedbackHistory()
      setReports((res.data || []).filter(report => report.status === 'ready'))
    } catch {
      setError('Could not load feedback yet.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>

  return (
    <div style={{ padding: '1.5rem 1.75rem', maxWidth: '52rem', margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-primary)', letterSpacing: '-0.02em', margin: 0 }}>Feedback</h1>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4, marginBottom: 0 }}>Improvement tips from your completed assessments</p>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--danger-50)', color: 'var(--danger-700)', fontSize: 13, marginBottom: 20, border: '1px solid var(--danger-100)' }}>
          {error}
        </div>
      )}

      {reports.length === 0 ? (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '44px 20px', textAlign: 'center', boxShadow: 'var(--shadow-xs)' }}>
          <Lightbulb size={26} color="var(--fg-subtle)" style={{ marginBottom: 10 }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-primary)', margin: '0 0 5px' }}>No feedback yet</p>
          <p style={{ fontSize: 13, color: 'var(--fg-subtle)', margin: 0 }}>Feedback appears here after your manager's report is ready.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reports.map(report => {
            const tips = parseStoredArray(report.strengths)
            return (
              <div key={report.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--warning-50)', color: 'var(--warning-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={17} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-primary)', margin: 0 }}>{report.context_title || 'Assessment feedback'}</p>
                    <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '3px 0 0' }}>{report.interview_type || 'Interview'} - {formatDate(report.created)}</p>
                  </div>
                </div>

                {report.summary && (
                  <p style={{ fontSize: 13, color: 'var(--fg-body)', lineHeight: 1.65, margin: '0 0 12px' }}>{report.summary}</p>
                )}

                {tips.length > 0 ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {tips.map(tip => (
                      <span key={tip} style={{ fontSize: 12, padding: '5px 9px', borderRadius: 999, background: 'var(--warning-50)', color: 'var(--warning-700)', fontWeight: 600 }}>
                        {tip}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: 0 }}>Detailed tips are still being prepared.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CandidateFeedbackPage
