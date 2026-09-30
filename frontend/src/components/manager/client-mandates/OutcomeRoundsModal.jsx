import { useCallback, useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import Avatar from '../../shared/Avatar'
import Button from '../../shared/Button'
import ErrorMessage from '../../shared/ErrorMessage'
import Modal from '../../shared/Modal'
import Spinner from '../../shared/Spinner'
import * as api from '../../../services/api'
import { formatDateTime, serializeDatetimeLocal } from '../../../utils/helpers'
import Field from './Field'

const EMPTY_OUTCOME_ROUND_FORM = { interview_at: '', outcome: 'pending', feedback: '', manager_notes: '' }

function freshOutcomeRoundForm() {
  return { ...EMPTY_OUTCOME_ROUND_FORM }
}

function OutcomeRoundsModal({ open, onClose, onSaved, member, template }) {
  const [rounds, setRounds] = useState([])
  const [editingRound, setEditingRound] = useState(null)
  const [form, setForm] = useState(freshOutcomeRoundForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const memberId = member?.id
  const templateId = template?.id

  const loadRounds = useCallback(async () => {
    if (!open || !memberId || !templateId) return
    setLoading(true)
    setError(null)
    try {
      const response = await api.getOutcomeRounds(templateId, memberId)
      setRounds(response.data || [])
    } catch (err) {
      setError(err.message || 'Could not load outcome rounds.')
      setRounds([])
    } finally {
      setLoading(false)
    }
  }, [open, memberId, templateId])

  useEffect(() => {
    if (!open) return
    setEditingRound(null)
    setForm(freshOutcomeRoundForm())
    void loadRounds()
  }, [open, loadRounds])

  function editRound(round) {
    setEditingRound(round)
    setForm({
      interview_at: round.interview_at ? String(round.interview_at).slice(0, 16) : '',
      outcome: round.outcome || 'pending',
      feedback: round.feedback || '',
      manager_notes: round.manager_notes || '',
    })
  }

  async function saveRound() {
    if (!memberId || !templateId) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        interview_at: form.interview_at ? serializeDatetimeLocal(form.interview_at) : null,
      }
      if (editingRound) await api.updateOutcomeRound(templateId, memberId, editingRound.id, payload)
      else await api.createOutcomeRound(templateId, memberId, payload)
      setEditingRound(null)
      setForm(freshOutcomeRoundForm())
      await loadRounds()
      await onSaved?.()
    } catch (err) {
      setError(err.message || 'Could not save round.')
    } finally {
      setSaving(false)
    }
  }

  async function togglePublish(round) {
    if (!memberId || !templateId) return
    setSaving(true)
    setError(null)
    try {
      if (round.candidate_visible) await api.unpublishOutcomeRound(templateId, memberId, round.id)
      else await api.publishOutcomeRound(templateId, memberId, round.id)
      await loadRounds()
      await onSaved?.()
    } catch (err) {
      setError(err.message || 'Could not update publish state.')
    } finally {
      setSaving(false)
    }
  }

  const candidateName = `${member?.first_name || ''} ${member?.last_name || ''}`.trim() || 'Candidate'
  const roleName = member?.requirement_name || template?.requirements || 'Role not assigned'

  return (
    <Modal open={open} onClose={onClose} title="Client outcome rounds" size="lg">
      <div className="workspace-stack" style={{ gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, border: '1px solid var(--border-default)', borderRadius: 14, background: 'linear-gradient(135deg, var(--brand-50), var(--bg-surface))' }}>
          <Avatar name={candidateName} size={42} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: 'var(--fg-primary)', fontSize: 15, fontWeight: 800 }}>{candidateName}</div>
            <div style={{ marginTop: 3, color: 'var(--fg-muted)', fontSize: 12 }}>{template?.client_name || 'Client'} · {roleName}</div>
          </div>
          <span className="status-pill status-pill--brand">{rounds.length} round{rounds.length === 1 ? '' : 's'}</span>
        </div>

        {loading ? <Spinner center /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rounds.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px', border: '1px dashed var(--border-default)', borderRadius: 14, background: 'var(--bg-surface-alt)', color: 'var(--fg-muted)' }}>
                <span style={{ width: 34, height: 34, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--brand-50)', color: 'var(--brand-600)', flexShrink: 0 }}>
                  <AlertCircle size={17} />
                </span>
                <div>
                  <strong style={{ display: 'block', color: 'var(--fg-primary)', fontSize: 13 }}>No client outcome rounds yet</strong>
                  <span style={{ display: 'block', fontSize: 12, marginTop: 3 }}>Add the first client-side round below, then publish it when candidates should see the update.</span>
                </div>
              </div>
            ) : rounds.map(round => (
              <div key={round.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 14, alignItems: 'center', padding: '14px 16px', border: '1px solid var(--border-default)', borderRadius: 14, background: 'var(--bg-surface)', boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ color: 'var(--fg-primary)', fontSize: 13 }}>Round {round.round_number}</strong>
                    <span className={`status-pill${round.candidate_visible ? ' status-pill--success' : ''}`}>
                      {round.candidate_visible ? 'Visible to candidate' : 'Draft'}
                    </span>
                    <span style={{ color: 'var(--fg-muted)', fontSize: 12, textTransform: 'capitalize' }}>
                      {round.outcome?.replace(/_/g, ' ') || 'pending'}
                    </span>
                  </div>
                  <div style={{ marginTop: 6, color: 'var(--fg-muted)', fontSize: 12 }}>
                    {round.interview_at ? formatDateTime(round.interview_at) : 'Interview date not set'}
                  </div>
                  {round.feedback && <div style={{ marginTop: 8, color: 'var(--fg-body)', fontSize: 12, lineHeight: 1.55 }}>{round.feedback}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                  <Button size="sm" variant="secondary" disabled={saving || round.candidate_visible} onClick={() => editRound(round)}>Edit</Button>
                  <Button size="sm" variant={round.candidate_visible ? 'secondary' : 'primary'} disabled={saving} onClick={() => togglePublish(round)}>
                    {round.candidate_visible ? 'Unpublish' : 'Publish'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: 18, border: '1px solid var(--brand-100)', borderRadius: 16, background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-surface-alt) 100%)', boxShadow: 'var(--shadow-xs)' }}>
          <div className="workspace-section-heading" style={{ marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 15 }}>{editingRound ? `Edit round ${editingRound.round_number}` : 'Add client round'}</h3>
              <p>Only published rounds are visible to candidates. Manager notes stay private.</p>
            </div>
            {editingRound && <Button size="sm" variant="secondary" onClick={() => { setEditingRound(null); setForm(freshOutcomeRoundForm()) }}>Cancel edit</Button>}
          </div>
          <div className="form-grid">
            <Field label="Interview date">
              <input className="form-input" type="datetime-local" value={form.interview_at} onChange={e => setForm(c => ({ ...c, interview_at: e.target.value }))} />
            </Field>
            <Field label="Outcome">
              <select className="form-input" value={form.outcome} onChange={e => setForm(c => ({ ...c, outcome: e.target.value }))}>
                <option value="pending">Pending</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="on_hold">On hold</option>
                <option value="offer_made">Offer made</option>
                <option value="hired">Hired</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </Field>
            <Field label="Candidate-visible feedback" full>
              <textarea className="form-input" rows={3} value={form.feedback} onChange={e => setForm(c => ({ ...c, feedback: e.target.value }))} style={{ resize: 'vertical' }} />
            </Field>
            <Field label="Private manager notes" full>
              <textarea className="form-input" rows={3} value={form.manager_notes} onChange={e => setForm(c => ({ ...c, manager_notes: e.target.value }))} style={{ resize: 'vertical' }} />
            </Field>
          </div>
          <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
            <Button onClick={saveRound} loading={saving}>{editingRound ? 'Save changes' : 'Add round'}</Button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}
      </div>
    </Modal>
  )
}

export default OutcomeRoundsModal
