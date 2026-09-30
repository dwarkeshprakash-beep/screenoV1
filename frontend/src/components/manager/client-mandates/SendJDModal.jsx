import { useEffect, useState } from 'react'
import { Mail } from 'lucide-react'
import Button from '../../shared/Button'
import ErrorMessage from '../../shared/ErrorMessage'
import Modal from '../../shared/Modal'
import * as api from '../../../services/api'
import { APP_NAME } from '../../../config/app.config'
import Field from './Field'

function SendJDModal({ open, onClose, onSent, member, template }) {
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { if (open) { setCustomMessage(''); setError(null) } }, [open])

  const roleName = member?.requirement_name || template?.requirements || 'Role'
  const jdSource = member?.requirement_jd_text || template?.jd_text || template?.requirements || ''
  const previewText = customMessage.trim() || `Your profile is being considered for a client requirement at ${template?.client_name || 'our client'}.`
  const jdPreview = jdSource.slice(0, 600)

  async function send() {
    setSending(true)
    setError(null)
    try {
      await api.sendClientJD(template.id, member.id, { customMessage: customMessage.trim() })
      onSent()
      onClose()
    } catch (err) { setError(err.message || 'Could not send JD.') }
    finally { setSending(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Send JD to candidate" size="lg">
      <div className="workspace-stack">
        <div className="detail-facts">
          <div className="detail-fact"><div className="detail-fact__label">Candidate</div><div className="detail-fact__value">{member?.first_name} {member?.last_name}</div></div>
          <div className="detail-fact"><div className="detail-fact__label">Client</div><div className="detail-fact__value">{template?.client_name}</div></div>
          <div className="detail-fact"><div className="detail-fact__label">Role</div><div className="detail-fact__value">{roleName}</div></div>
        </div>

        <Field label="Custom message (optional)" help="Appears above the JD in the email. Leave blank to use the default.">
          <textarea className="form-input" rows={4} value={customMessage} onChange={e => setCustomMessage(e.target.value)} placeholder="Hi [Name], we think your profile is a great fit for this role at our client..." style={{ resize: 'vertical' }} />
        </Field>

        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email preview</p>
          <div style={{ border: '1px solid var(--border-default)', borderRadius: 10, padding: 18, background: 'var(--bg-page)', fontSize: 13, color: 'var(--fg-body)' }}>
            <p style={{ margin: '0 0 10px', fontWeight: 600, color: 'var(--fg-primary)' }}>Subject: [{template?.client_name}] Job opportunity - {roleName}</p>
            <p style={{ margin: '0 0 8px' }}>Hi <strong>{member?.first_name}</strong>,</p>
            <p style={{ margin: '0 0 12px', color: 'var(--fg-muted)' }}>{previewText}</p>
            {jdPreview && (
              <div style={{ background: 'var(--brand-50)', borderLeft: '3px solid var(--brand-500)', padding: '10px 14px', borderRadius: '0 6px 6px 0', fontSize: 12, color: 'var(--fg-body)', whiteSpace: 'pre-wrap' }}>
                {jdPreview}{jdSource.length > 600 ? '...' : ''}
              </div>
            )}
            <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--fg-subtle)' }}>Log in to {APP_NAME} to submit your resume for this opportunity.</p>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}
        <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={send} loading={sending}><Mail size={14} />Send JD</Button>
        </div>
      </div>
    </Modal>
  )
}

export default SendJDModal
