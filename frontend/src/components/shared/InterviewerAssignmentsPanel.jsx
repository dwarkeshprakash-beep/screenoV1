import { useState } from 'react'
import { Clock, FileText, Pencil, Upload } from 'lucide-react'
import * as api from '../../services/api'
import { formatDateTime } from '../../utils/helpers'

function AssignmentCard({ assignment, onCompleted }) {
  const [outcome, setOutcome] = useState('pass')
  const [feedback, setFeedback] = useState(assignment.feedback || '')
  const [file, setFile] = useState(null)
  const [editingFeedback, setEditingFeedback] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const feedbackOverdue = assignment.status !== 'completed'
    && assignment.due_at
    && new Date(assignment.due_at) <= new Date()

  async function complete() {
    setSaving(true)
    setError(null)
    try {
      await api.completeInterviewerAssignment(assignment.id, { outcome, feedback, file })
      await onCompleted()
    } catch (err) {
      setError(err.message || 'Could not save interview feedback.')
    } finally {
      setSaving(false)
    }
  }

  async function saveFeedback() {
    setSaving(true)
    setError(null)
    try {
      await api.updateInterviewerFeedback(assignment.id, feedback)
      setEditingFeedback(false)
      await onCompleted()
    } catch (err) {
      setError(err.message || 'Could not update interview feedback.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div><strong>{assignment.candidate_first} {assignment.candidate_last}</strong><p style={{ margin: '4px 0', color: 'var(--fg-muted)', fontSize: 12 }}>{assignment.client_name} · {assignment.stage_name}</p></div>
        <span className={`status-pill${assignment.status === 'completed' ? ' status-pill--success' : ' status-pill--brand'}`}>{assignment.status}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}><Clock size={11} /> {formatDateTime(assignment.scheduled_at)}{assignment.location ? ` · ${assignment.location}` : ''}</p>
      {feedbackOverdue && <p style={{ fontSize: 12, color: 'var(--warning-700)', margin: '0 0 10px' }}>Interview time has ended. Please submit the pending feedback.</p>}
      {assignment.meeting_url && assignment.status !== 'completed' && <a className="product-button product-button--secondary product-button--sm" href={assignment.meeting_url} target="_blank" rel="noreferrer">Join meeting</a>}
      {assignment.status !== 'completed' && (
        <div className="workspace-stack" style={{ marginTop: 14 }}>
          <label className="form-field"><span className="form-label">Outcome</span><select className="form-input" value={outcome} onChange={event => setOutcome(event.target.value)}><option value="pass">Pass</option><option value="fail">Fail</option></select></label>
          <label className="form-field"><span className="form-label">Feedback</span><textarea className="form-input" rows={4} value={feedback} onChange={event => setFeedback(event.target.value)} placeholder="Interview feedback (optional)" /></label>
          <label className="product-button product-button--secondary product-button--sm" style={{ width: 'fit-content', cursor: 'pointer' }}><Upload size={13} />{file ? file.name : 'Attach document (optional)'}<input type="file" accept=".pdf,.doc,.docx,.txt" hidden onChange={event => setFile(event.target.files?.[0] || null)} /></label>
          {error && <p style={{ color: 'var(--danger-700)', fontSize: 12 }}>{error}</p>}
          <button className="product-button product-button--primary product-button--md" disabled={saving} onClick={complete}>{saving ? 'Saving...' : 'Complete interview'}</button>
        </div>
      )}
      {assignment.status === 'completed' && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <strong style={{ fontSize: 12 }}>Your submitted review</strong>
              <span className={`status-pill${assignment.outcome === 'pass' ? ' status-pill--success' : ' status-pill--danger'}`}>
                {assignment.outcome === 'pass' ? 'Passed' : 'Failed'}
              </span>
            </div>
            {!editingFeedback && (
              <button type="button" className="product-button product-button--secondary product-button--sm" onClick={() => setEditingFeedback(true)}>
                <Pencil size={12} />Edit comment
              </button>
            )}
          </div>
          {editingFeedback ? (
            <div className="workspace-stack">
              <label className="form-field">
                <span className="form-label">Feedback comment</span>
                <textarea className="form-input" rows={4} maxLength={5000} value={feedback} onChange={event => setFeedback(event.target.value)} />
              </label>
              {error && <p style={{ color: 'var(--danger-700)', fontSize: 12 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="product-button product-button--secondary product-button--sm" onClick={() => { setFeedback(assignment.feedback || ''); setEditingFeedback(false) }}>Cancel</button>
                <button type="button" className="product-button product-button--primary product-button--sm" disabled={saving} onClick={saveFeedback}>{saving ? 'Saving...' : 'Save comment'}</button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--fg-body)', margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>
              {assignment.feedback || 'No written feedback submitted.'}
            </p>
          )}
          {assignment.file_url && (
            <a className="product-button product-button--secondary product-button--sm" href={assignment.file_url} target="_blank" rel="noreferrer">
              <FileText size={12} />{assignment.original_filename || 'Submitted document'}
            </a>
          )}
          <p className="form-help" style={{ marginTop: 8 }}>The pass/fail decision and attachment are locked after submission.</p>
        </div>
      )}
    </div>
  )
}

function InterviewerAssignmentsPanel({ assignments, onCompleted }) {
  if (assignments.length === 0) return <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 10, padding: 32, textAlign: 'center', color: 'var(--fg-muted)' }}>No interviewer assignments.</div>
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{assignments.map(assignment => <AssignmentCard key={assignment.id} assignment={assignment} onCompleted={onCompleted} />)}</div>
}

export default InterviewerAssignmentsPanel
