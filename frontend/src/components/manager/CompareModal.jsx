// CompareModal — side-by-side comparison of two team members.
// Shows skills match/gap, assessment status, scores, and basic info.

import Modal from '../shared/Modal'

const AV_COLORS = [
  { bg: '#EDE9FE', fg: '#5B21B6' }, { bg: '#FED7AA', fg: '#9A3412' },
  { bg: '#A7F3D0', fg: 'var(--success-700)' }, { bg: '#BFDBFE', fg: '#1E40AF' },
  { bg: '#FBCFE8', fg: '#9D174D' }, { bg: '#FDE68A', fg: '#854D0E' },
  { bg: '#C7D2FE', fg: '#3730A3' }, { bg: '#FCA5A5', fg: '#7F1D1D' },
]

function avHash(s) {
  let h = 0
  for (let i = 0; i < (s || '').length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function Avatar({ name = '?', size = 52 }) {
  const c = AV_COLORS[avHash(name) % AV_COLORS.length]
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: 9999, flexShrink: 0,
      background: c.bg, color: c.fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: Math.round(size * 0.38), letterSpacing: '-0.01em',
    }}>
      {initials}
    </div>
  )
}

function assessLabel(lastAssessed) {
  if (!lastAssessed) return { label: 'Never assessed', bg: '#FEF2F2', fg: '#EF4444' }
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

function ScoreBar({ value, max = 5, color = 'var(--brand-500)' }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ height: 6, background: 'var(--slate-100)', borderRadius: 9999, overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 9999, transition: 'width 500ms cubic-bezier(0.2,0,0,1)' }} />
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

  // Union of all skills from both members
  const skillsA = a.skills || []
  const skillsB = b.skills || []
  const allSkills = [...new Set([...skillsA, ...skillsB])]

  // Scores from latest report (may be null)
  const scoreA = a.latest_score || null
  const scoreB = b.latest_score || null

  const cols = { display: 'grid', gridTemplateColumns: '1fr 100px 1fr', gap: 8 }

  return (
    <Modal open={open} onClose={onClose} title="Compare Members" size="lg">
      {/* Header avatars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 1fr', gap: 8, marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 12px', background: '#FAFAFE', borderRadius: 10, border: '1px solid var(--brand-50)' }}>
          <Avatar name={nameA} size={52} />
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--slate-900)', textAlign: 'center' }}>{nameA}</div>
          <div style={{ fontSize: 12, color: 'var(--slate-500)', textAlign: 'center' }}>{a.email}</div>
          <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: assessA.bg, color: assessA.fg }}>{assessA.label}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: 9999, background: 'var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--slate-400)' }}>VS</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 12px', background: '#FAFAFE', borderRadius: 10, border: '1px solid var(--brand-50)' }}>
          <Avatar name={nameB} size={52} />
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--slate-900)', textAlign: 'center' }}>{nameB}</div>
          <div style={{ fontSize: 12, color: 'var(--slate-500)', textAlign: 'center' }}>{b.email}</div>
          <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: assessB.bg, color: assessB.fg }}>{assessB.label}</span>
        </div>
      </div>

      {/* AI Score comparison */}
      {(scoreA !== null || scoreB !== null) && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--slate-400)', marginBottom: 10 }}>Latest AI Score</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 1fr', gap: 8, alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--slate-900)', marginBottom: 4 }}>{scoreA !== null ? `${scoreA}/5` : '—'}</div>
              <ScoreBar value={scoreA || 0} />
            </div>
            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--slate-400)', fontWeight: 600 }}>SCORE</div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--slate-900)', marginBottom: 4 }}>{scoreB !== null ? `${scoreB}/5` : '—'}</div>
              <ScoreBar value={scoreB || 0} />
            </div>
          </div>
        </div>
      )}

      {/* Basic info comparison */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--slate-400)', marginBottom: 6 }}>Profile</div>
        <Row
          label="ROLE"
          left={a.role || a.job_title || '—'}
          right={b.role || b.job_title || '—'}
        />
        <Row
          label="ASSESSMENTS"
          left={a.assessment_count ? `${a.assessment_count} done` : 'None yet'}
          right={b.assessment_count ? `${b.assessment_count} done` : 'None yet'}
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
