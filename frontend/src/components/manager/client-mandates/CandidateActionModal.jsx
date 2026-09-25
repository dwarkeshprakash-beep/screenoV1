import { useEffect, useState } from 'react'
import { UserCheck } from 'lucide-react'
import Avatar from '../../shared/Avatar'
import Button from '../../shared/Button'
import ErrorMessage from '../../shared/ErrorMessage'
import Modal from '../../shared/Modal'
import Field from './Field'
import { requirementMeta } from './mandateHelpers'

function CandidateActionModal({ candidate, requirements, onClose, onViewProfile, onAdd, adding, error }) {
  const [requirementId, setRequirementId] = useState('')
  useEffect(() => { setRequirementId('') }, [candidate])

  if (!candidate) return null
  const name = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || candidate.email
  const suggestedRequirement = candidate.matching_requirements?.[0]

  return (
    <Modal open={!!candidate} onClose={onClose} title="Candidate actions" size="sm">
      <div className="workspace-stack">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={name} size={40} />
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: 'block', color: 'var(--fg-primary)', fontSize: 14 }}>{name}</strong>
            <span style={{ display: 'block', color: 'var(--fg-muted)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{candidate.email}</span>
          </div>
        </div>
        <div className="detail-facts">
          <div className="detail-fact"><div className="detail-fact__label">Role</div><div className="detail-fact__value">{candidate.current_position || candidate.job_title || 'Not set'}</div></div>
          <div className="detail-fact"><div className="detail-fact__label">Match</div><div className="detail-fact__value">{candidate.match_score || 0}</div></div>
        </div>
        {suggestedRequirement && (
          <span className="tag" style={{ alignSelf: 'flex-start' }}>
            Suggested: {suggestedRequirement.profile_name}{requirementMeta(suggestedRequirement) ? ` | ${requirementMeta(suggestedRequirement)}` : ''}
          </span>
        )}
        {requirements && requirements.length > 0 && (
          <Field label="Assign to requirement profile" help="Required - tracks which profile each prospect is for.">
            <select className="form-input" value={requirementId} onChange={e => setRequirementId(e.target.value)}>
              <option value="">Select a profile...</option>
              {requirements.map(r => <option key={r.id} value={r.id}>{r.profile_name}</option>)}
            </select>
          </Field>
        )}
        {error && <ErrorMessage message={error} />}
        <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onViewProfile} disabled={!candidate.team_member_id && !candidate.role && candidate.employee_id === undefined}>View profile</Button>
          <Button onClick={() => onAdd(requirementId)} loading={adding} disabled={requirements && requirements.length > 0 && !requirementId}>
            <UserCheck size={14} />Add candidate
          </Button>
        </div>
        {!candidate.team_member_id && !candidate.role && candidate.employee_id === undefined && (
          <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: 0 }}>Profile page is only available for organization users or team members.</p>
        )}
      </div>
    </Modal>
  )
}

export default CandidateActionModal
