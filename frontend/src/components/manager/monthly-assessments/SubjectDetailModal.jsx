import { useState } from 'react'
import { Pencil, Trash2, UserPlus } from 'lucide-react'
import Avatar from '../../shared/Avatar'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import { parseStoredArray } from '../../../utils/helpers'
import { formatDate, formatDateTime } from './monthlyHelpers'

function SubjectDetailModal({ assessment, open, onClose, onAssign, onEdit, onDelete, canDelete }) {
  const [showHistory, setShowHistory] = useState(false)
  if (!assessment) return null

  const topics = parseStoredArray(assessment.sub_topics)
  const enrollments = assessment.enrollments || []
  const activeEnrollments = enrollments.filter(item => item.status !== 'cancelled')
  const visibleEnrollments = showHistory ? enrollments : activeEnrollments

  return (
    <Modal open={open} onClose={onClose} title={assessment.subject_name} size="lg">
      <div className="workspace-stack">
        <div className="detail-facts">
          {[
            ['Difficulty', assessment.difficulty || 'Not set'],
            ['Duration', `${assessment.duration_months || 1} month${Number(assessment.duration_months) === 1 ? '' : 's'}`],
            ['Active assignments', activeEnrollments.length],
            ['Total assignment history', enrollments.length],
            ['Sub-topics', topics.length],
            ['Created', formatDate(assessment.created)],
          ].map(([label, value]) => (
            <div className="detail-fact" key={label}>
              <div className="detail-fact__label">{label}</div>
              <div className="detail-fact__value" style={{ textTransform: label === 'Difficulty' ? 'capitalize' : 'none' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        <section>
          <div className="workspace-section-heading" style={{ marginBottom: 10 }}>
            <div>
              <h3 style={{ fontSize: 15 }}>Sub-topics</h3>
              <p>The syllabus used to generate questions and preparation material.</p>
            </div>
          </div>
          {topics.length > 0 ? (
            <div className="tag-list">
              {topics.map(topic => <span className="tag" key={topic}>{topic}</span>)}
            </div>
          ) : (
            <div style={{ color: 'var(--fg-muted)', fontSize: 13 }}>No sub-topics added.</div>
          )}
        </section>

        <section>
          <div className="workspace-section-heading" style={{ marginBottom: 10 }}>
            <div>
              <h3 style={{ fontSize: 15 }}>Study material</h3>
              <p>The preparation guidance sent to assigned candidates.</p>
            </div>
          </div>
          <div style={{
            maxHeight: 260,
            overflowY: 'auto',
            padding: 16,
            border: '1px solid var(--border-default)',
            borderRadius: 10,
            background: 'var(--slate-50)',
            color: 'var(--fg-body)',
            fontSize: 13,
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
          }}>
            {assessment.ai_generated_jd || 'No study material added.'}
          </div>
        </section>

        {enrollments.length > 0 && (
          <section>
            <div className="workspace-section-heading" style={{ marginBottom: 10 }}>
              <div>
                <h3 style={{ fontSize: 15 }}>Assignment history</h3>
                <p>{showHistory ? 'Every candidate previously assigned to this subject.' : 'Active candidate assignments for this subject.'}</p>
              </div>
              {enrollments.length !== activeEnrollments.length && (
                <Button size="sm" variant="secondary" onClick={() => setShowHistory(value => !value)}>
                  {showHistory ? 'Hide cancelled' : 'Show all'}
                </Button>
              )}
            </div>
            <div className="assignment-list">
              {visibleEnrollments.map(enrollment => {
                const name = `${enrollment.first_name || ''} ${enrollment.last_name || ''}`.trim()
                return (
                  <div className="assignment-row" key={enrollment.id}>
                    <Avatar name={name} size={30} />
                    <div className="assignment-row__content">
                      <strong>{name}</strong>
                      <span>
                        Opens {formatDateTime(enrollment.occurrence_available_from || enrollment.start_date)}
                        {' · '}Due {formatDateTime(enrollment.occurrence_due_at || enrollment.end_date)}
                      </span>
                      {Number(assessment.duration_months) > 1 && (
                        <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
                          Plan: {formatDate(enrollment.start_date)} – {formatDate(enrollment.end_date)}
                        </span>
                      )}
                    </div>
                    <span className={`status-pill${enrollment.status === 'cancelled' ? ' status-pill--danger' : ' status-pill--brand'}`}>
                      {enrollment.status || 'pending'}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <div className="form-actions" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="secondary" onClick={() => { onClose(); onEdit(); }}>
              <Pencil size={15} />
              Edit subject
            </Button>
            {canDelete && (
              <Button variant="danger" onClick={() => { onClose(); onDelete(); }}>
                <Trash2 size={15} />
                Delete subject
              </Button>
            )}
          </div>
          <Button onClick={() => onAssign(assessment)}>
            <UserPlus size={15} />
            Assign candidates
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default SubjectDetailModal
