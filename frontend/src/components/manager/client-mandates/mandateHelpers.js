import { parseStoredArray } from '../../../utils/helpers'

export const parseTags = parseStoredArray

// Full mandate lifecycle, in order. Mirrors STATUS_ORDER/STATUS_LABELS in
// backend/src/services/mandate-status.service.js - each step is auto-recorded the
// first time its triggering event happens (created, candidate added, first mock or
// client interview scheduled). "Interview in progress" stays generic on purpose:
// with several candidates on a mandate, one can be mid-mock while another is already
// in a client round, so there's no single "which stage exactly" to show at the
// mandate level. "Completed" fires once every candidate has a final client outcome,
// or the manager marks it complete manually.
export const MANDATE_STATUS_STEPS = [
  { status: 'created', label: 'Created' },
  { status: 'assigned_to_manager', label: 'Assigned to manager' },
  { status: 'candidates_assigned', label: 'Candidates assigned' },
  { status: 'interview_in_progress', label: 'Interview in progress' },
  { status: 'completed', label: 'Completed' },
]

export function mandateStatusLabel(status) {
  return MANDATE_STATUS_STEPS.find(step => step.status === status)?.label || null
}

export function mandateStatusPillClass(status) {
  if (status === 'completed') return 'status-pill--success'
  if (status === 'interview_in_progress') return 'status-pill--warning'
  return 'status-pill--brand'
}

export function requirementMeta(item) {
  if (!item) return ''
  const yearsMin = item.requirement_years_min ?? item.years_min
  const yearsMax = item.requirement_years_max ?? item.years_max
  const headcount = item.requirement_headcount ?? item.headcount
  const parts = []
  if (yearsMin != null) parts.push(`${yearsMin}-${yearsMax ?? '+'} yrs`)
  if (headcount) parts.push(`${headcount} role${Number(headcount) === 1 ? '' : 's'}`)
  return parts.join(' | ')
}

export function newRequirementProfile(seed = {}) {
  return {
    key: seed.key || seed.id || `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    id: seed.id || null,
    profile_name: seed.profile_name || '',
    years_min: seed.years_min ?? '',
    years_max: seed.years_max ?? '',
    headcount: seed.headcount || 1,
    notes: seed.notes || '',
    jd_text: seed.jd_text || '',
    jd_file_path: seed.jd_file_path || null,
    jd_original_filename: seed.jd_original_filename || '',
  }
}

export function normalizeRequirementProfilesForSave(profiles) {
  return profiles
    .map(profile => ({
      id: profile.id || undefined,
      profile_name: String(profile.profile_name || '').trim(),
      years_min: profile.years_min === '' ? null : Number(profile.years_min),
      years_max: profile.years_max === '' ? null : Number(profile.years_max),
      headcount: Number(profile.headcount) || 1,
      notes: String(profile.notes || '').trim() || null,
      jd_text: String(profile.jd_text || '').trim() || null,
      jd_file_path: profile.jd_file_path || null,
      jd_original_filename: String(profile.jd_original_filename || '').trim() || null,
    }))
    .filter(profile => profile.profile_name)
}

export const INTERVIEW_TYPES = [
  { value: 'ai_voice', label: 'AI Voice Interview', desc: 'Automated voice interview with AI-generated questions' },
  { value: 'exam', label: 'Coding Exam', desc: 'Coding or multiple-choice assessment' },
  { value: 'human', label: 'Human Video Interview', desc: 'Live video interview with a managed meeting link' },
  { value: 'offline', label: 'Offline Interview', desc: 'In-person interview - sends email with date and location' },
]
