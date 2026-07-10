import { useState, useEffect } from 'react'
import { AlertCircle, Loader2, FileText, Users, Calendar } from 'lucide-react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import * as api from '../../services/api'

export default function DeleteMandateModal({ template, open, onClose, onSuccess }) {
  const [impact, setImpact] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (open && template) {
      setLoading(true)
      setError(null)
      setImpact(null)
      setConfirmText('')
      api.deleteClientTemplatePreview(template.id)
        .then(res => setImpact(res.data))
        .catch(err => setError(err.message || 'Could not load deletion impact.'))
        .finally(() => setLoading(false))
    }
  }, [open, template])

  if (!open || !template) return null

  const targetText = template.client_name
  const canSubmit = impact?.canDelete && confirmText === targetText && !deleting

  async function handleDelete() {
    if (!canSubmit) return
    setDeleting(true)
    try {
      await api.deleteClientTemplate(template.id)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Deletion failed.')
      setDeleting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Permanently Delete Mandate">
      <div style={{ padding: '0 20px 20px' }}>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
          Permanently deleting this mandate will remove all associated candidates, scheduled interviews, transcripts, and scorecards. This action <strong>cannot be undone</strong>.
        </p>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--danger-50)', color: 'var(--danger-700)', fontSize: 13, marginBottom: 20, border: '1px solid var(--danger-100)' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30, gap: 10, color: 'var(--fg-muted)', fontSize: 13, fontWeight: 500 }}>
            <Loader2 className="spin" size={16} /> Calculating impact...
          </div>
        ) : impact ? (
          <>
            <div style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-primary)', margin: '0 0 12px' }}>Items that will be permanently deleted:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--fg-body)' }}>
                  <Users size={16} color="var(--fg-muted)" /> {impact.candidates} prospect candidates removed from mandate
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--fg-body)' }}>
                  <Calendar size={16} color="var(--fg-muted)" /> {impact.interviews} interviews (including canceled/completed)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--fg-body)' }}>
                  <FileText size={16} color="var(--fg-muted)" /> {impact.reports} full interview reports & scorecards
                </div>
              </div>
            </div>

            {!impact.canDelete ? (
              <div style={{ padding: 14, borderRadius: 8, background: 'var(--warning-50)', border: '1px solid var(--warning-100)', display: 'flex', gap: 12, marginBottom: 20 }}>
                <AlertCircle size={18} color="var(--warning-600)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning-700)', margin: '0 0 4px' }}>Deletion Blocked</p>
                  <p style={{ fontSize: 13, color: 'var(--warning-700)', margin: 0 }}>This mandate has {impact.inProgressCount} in-progress interview(s). You must wait for them to finish or cancel them before deleting the mandate.</p>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-primary)', marginBottom: 6 }}>
                  Type <strong style={{ color: 'var(--danger-600)' }}>{targetText}</strong> to confirm:
                </label>
                <input
                  type="text"
                  className="input"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder={targetText}
                  style={{ width: '100%', borderColor: confirmText && confirmText !== targetText ? 'var(--danger-300)' : undefined }}
                />
              </div>
            )}
          </>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="secondary" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button variant="danger" disabled={!canSubmit} onClick={handleDelete}>
            {deleting ? 'Deleting...' : 'Permanently Delete'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
