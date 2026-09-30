import { useEffect, useMemo, useState } from 'react'
import { Search, UserCheck, Users } from 'lucide-react'
import Avatar from '../../shared/Avatar'
import Button from '../../shared/Button'
import EmptyState from '../../shared/EmptyState'
import ErrorMessage from '../../shared/ErrorMessage'
import Modal from '../../shared/Modal'
import Spinner from '../../shared/Spinner'
import * as api from '../../../services/api'
import Field from './Field'
import { requirementMeta } from './mandateHelpers'

function AddProspectsModal({ open, onClose, onAdded, mandateId, requirements }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [requirementId, setRequirementId] = useState('')
  const [query, setQuery] = useState('')
  const [memberSection, setMemberSection] = useState('team')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) { setSelectedIds([]); setQuery(''); setError(null); return }
    async function loadMatches() {
      setLoading(true)
      try {
        const r = await api.getTemplateMatches(mandateId)
        setMembers(r.data || [])
      } catch {
        setMembers([])
      } finally {
        setLoading(false)
      }
    }
    loadMatches()
  }, [open, mandateId])

  const teamMembers = useMemo(() => members.filter(m => m.in_team), [members])
  const otherMembers = useMemo(() => members.filter(m => !m.in_team), [members])
  const activeList = memberSection === 'team' ? teamMembers : otherMembers

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return activeList
    return activeList.filter(m =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q)
      || String(m.email || '').toLowerCase().includes(q)
      || String(m.current_position || '').toLowerCase().includes(q)
    )
  }, [activeList, query])

  function toggleMember(id) {
    setSelectedIds(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id])
  }

  async function addProspects() {
    if (selectedIds.length === 0) return
    setAdding(true)
    setError(null)
    try {
      await api.addProspects(mandateId, {
        userIds: selectedIds.map(userId => ({
          userId,
          requirementId: requirementId ? Number(requirementId) : null,
        })),
      })
      await onAdded()
      onClose()
    } catch (err) { setError(err.message || 'Could not add prospects.') }
    finally { setAdding(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add prospects to client team" size="lg">
      <div className="workspace-stack">
        <div className="workspace-tabs" style={{ alignSelf: 'flex-start' }}>
          <button type="button" className={`workspace-tabs__button${memberSection === 'team' ? ' is-active' : ''}`} onClick={() => setMemberSection('team')}>
            <Users size={13} /> My team ({teamMembers.length})
          </button>
          <button type="button" className={`workspace-tabs__button${memberSection === 'other' ? ' is-active' : ''}`} onClick={() => setMemberSection('other')}>
            Other org members ({otherMembers.length})
          </button>
        </div>

        {requirements.length > 0 && (
          <Field label="Assign to requirement profile" help="Required - tracks which profile each prospect is for.">
            <select className="form-input" value={requirementId} onChange={e => setRequirementId(e.target.value)}>
              <option value="">Select a profile...</option>
              {requirements.map(r => <option key={r.id} value={r.id}>{r.profile_name}{r.years_min != null ? ` (${r.years_min}–${r.years_max ?? '+'} yrs)` : ''}</option>)}
            </select>
          </Field>
        )}

        <div className="workspace-search" style={{ width: '100%' }}>
          <Search size={15} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, email, or role..." />
        </div>

        {loading ? <Spinner center /> : filtered.length === 0 ? (
          <EmptyState message={query ? 'No members match this search.' : memberSection === 'team' ? 'All team members have already been added as prospects.' : 'No other org members available.'} />
        ) : (
          <div className="workspace-grid">
            {filtered.map(m => {
              const name = `${m.first_name || ''} ${m.last_name || ''}`.trim()
              const selected = selectedIds.includes(m.id)
              return (
                <button type="button" className="workspace-card" key={m.id} onClick={() => toggleMember(m.id)}
                  style={{ borderColor: selected ? 'var(--brand-400)' : undefined, background: selected ? 'var(--brand-50)' : undefined }}>
                  <div className="workspace-card__body" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input type="checkbox" checked={selected} readOnly style={{ accentColor: 'var(--brand-500)' }} />
                      <Avatar name={name} size={32} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <strong style={{ display: 'block', overflow: 'hidden', fontSize: 13, textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--fg-primary)' }}>{name}</strong>
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.current_position || m.email}</span>
                      </div>
                      {m.recommended && <span className="status-pill status-pill--success">{m.match_score} match</span>}
                    </div>
                    {(m.matched_tags || []).length > 0 && (
                      <div className="tag-list" style={{ marginTop: 10 }}>
                        {m.matched_tags.slice(0, 3).map(tag => <span className="tag" key={tag}>{tag}</span>)}
                      </div>
                    )}
                    {(m.matching_requirements || []).length > 0 && (
                      <div className="tag-list" style={{ marginTop: 8 }}>
                        {m.matching_requirements.slice(0, 2).map(req => (
                          <span className="tag" key={req.id}>
                            {req.profile_name}{requirementMeta(req) ? ` | ${requirementMeta(req)}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {error && <ErrorMessage message={error} />}
        <div className="form-actions">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={addProspects} loading={adding} disabled={selectedIds.length === 0 || (requirements.length > 0 && !requirementId)}>
            <UserCheck size={14} />Add {selectedIds.length > 0 ? selectedIds.length : ''} to client team
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default AddProspectsModal
