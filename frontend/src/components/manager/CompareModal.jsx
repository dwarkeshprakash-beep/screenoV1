// CompareModal — side-by-side comparison of two team members.
// Shows skills match/gap, assessment status, scores, and basic info.

import Modal from '../shared/Modal'
import Avatar from '../shared/Avatar'

function assessLabel(lastAssessed) {
  if (!lastAssessed) return { label: 'Never assessed', bg: 'var(--danger-50)', fg: 'var(--danger-500)' }
  const days = (Date.now() - new Date(lastAssessed).getTime()) / 86400000
  if (days > 90) return { label: 'Overdue', bg: 'var(--warning-50)', fg: 'var(--warning-500)' }
  return { label: 'Up to date', bg: 'var(--success-50)', fg: 'var(--success-500)' }
}

function SkillChip({ label, present }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 9999,
      fontSize: 11, fontWeight: 600,
      background: present ? 'var(--success-50)' : '#FEF2F2',
      color: present ? 'var(--success-600)' : 'var(--danger-700)',
    }}>
      {present ? '✓' : '✗'} {label}
    </span>
  )
}

function Row({ label, left, right }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--slate-100)', alignItems: 'center' }}>
      <div style={{ fontSize: 13, color: 'var(--slate-700)' }}>{left}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--slate-700)', textAlign: 'right' }}>{right}</div>
    </div>
  )
}

function CompareModal({ open, onClose, members = [] }) {
  const a = members[0]
  const b = members[1]

  if (!a || !b) return null

  const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email
  const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim() || b.email

  const assessA = assessLabel(a.last_assessed)
  const assessB = assessLabel(b.last_assessed)

  // Tags are stored as JSON string in the DB
  function parseTags(raw) {
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    try { return JSON.parse(raw) } catch { return [] }
  }
  const skillsA = parseTags(a.tags)
  const skillsB = parseTags(b.tags)
  const allSkills = [...new Set([...skillsA, ...skillsB])]

  return (
    <Modal open={open} onClose={onClose} title="Compare Members" size="lg">
      {/* Header avatars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 1fr', gap: 8, marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 12px', background: 'var(--brand-50)', borderRadius: 10, border: '1px solid var(--border-default)' }}>
          <Avatar name={nameA} size={52} />
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--fg-primary)', textAlign: 'center' }}>{nameA}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', textAlign: 'center' }}>{a.email}</div>
          <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: assessA.bg, color: assessA.fg }}>{assessA.label}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: 9999, background: 'var(--bg-surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-subtle)' }}>VS</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 12px', background: 'var(--brand-50)', borderRadius: 10, border: '1px solid var(--border-default)' }}>
          <Avatar name={nameB} size={52} />
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--fg-primary)', textAlign: 'center' }}>{nameB}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', textAlign: 'center' }}>{b.email}</div>
          <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: assessB.bg, color: assessB.fg }}>{assessB.label}</span>
        </div>
      </div>


      {/* Basic info comparison */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--slate-400)', marginBottom: 6 }}>Profile</div>
        <Row
          label="ROLE"
          left={a.current_position || '—'}
          right={b.current_position || '—'}
        />
        <Row
          label="LOCATION"
          left={a.location || '—'}
          right={b.location || '—'}
        />
        <Row
          label="LAST"
          left={a.last_assessed ? new Date(a.last_assessed).toLocaleDateString() : 'Never'}
          right={b.last_assessed ? new Date(b.last_assessed).toLocaleDateString() : 'Never'}
        />
      </div>

      {/* Skills comparison */}
      {allSkills.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--slate-400)', marginBottom: 10 }}>Skills</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand-500)', marginBottom: 8 }}>{nameA}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {allSkills.map(sk => (
                  <SkillChip key={sk} label={sk} present={skillsA.includes(sk)} />
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand-500)', marginBottom: 8 }}>{nameB}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {allSkills.map(sk => (
                  <SkillChip key={sk} label={sk} present={skillsB.includes(sk)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {allSkills.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--slate-400)', fontSize: 13 }}>
          No skills data yet. Add skills to member profiles to compare.
        </div>
      )}
    </Modal>
  )
}

export default CompareModal
