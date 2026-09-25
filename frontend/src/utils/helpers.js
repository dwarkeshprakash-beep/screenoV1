// utils/helpers.js
// Small pure utility functions shared across the app.

/**
 * Format a date string into a readable format.
 * @param {string|Date} date
 * @returns {string} e.g. "Jun 3, 2026"
 */
export function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format a date+time string for display (e.g. "Jun 3, 2026 · 10:30 AM")
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDateTime(date) {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
       + ' · '
       + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

/**
 * Parse a JSON-stringified array or pass through a real array.
 * Returns [] on any failure - safe for tags, topics, and other stored arrays.
 * @param {any} value
 * @returns {any[]}
 */
export function parseStoredArray(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const INTERVIEW_TYPE_LABELS = {
  ai_voice: 'AI Voice',
  exam: 'Coding Exam',
  human: 'Video Interview',
  offline: 'Offline Interview',
  client: 'Client Interview',
}

/**
 * Human-readable label for an interview type.
 * @param {string} type - e.g. 'ai_voice'
 * @returns {string} e.g. 'AI Voice'; unknown types fall back to the raw value, de-underscored
 */
export function interviewTypeLabel(type) {
  return INTERVIEW_TYPE_LABELS[type] || (type ? type.replace(/_/g, ' ') : 'Interview')
}

/**
 * Case-insensitive people search: matches name, initials, email, or any stored tag.
 * @param {{first_name?: string, last_name?: string, email?: string, tags?: any}} user
 * @param {string} query
 * @returns {boolean} true for an empty query
 */
export function matchesUserQuery(user, query) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  const firstName = String(user.first_name || '')
  const lastName = String(user.last_name || '')
  const name = `${firstName} ${lastName}`.trim().toLowerCase()
  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toLowerCase()
  return name.includes(normalized)
    || String(user.email || '').toLowerCase().includes(normalized)
    || initials.includes(normalized)
    || parseStoredArray(user.tags).join(' ').toLowerCase().includes(normalized)
}

/**
 * Map interview status strings to Badge variant names.
 * @param {string} status
 * @returns {'success'|'warning'|'danger'|'info'|'neutral'}
 */
export function statusVariant(status) {
  const map = {
    completed: 'success',
    passed:    'success',
    pending:   'warning',
    scheduled: 'warning',
    failed:    'danger',
    rejected:  'danger',
    active:    'info',
  }
  return map[status?.toLowerCase()] || 'neutral'
}

export function interviewDurationMinutes(item = {}) {
  const explicit = Number(item.duration_minutes ?? item.durationMinutes)
  if (Number.isFinite(explicit) && explicit > 0) return explicit
  if (item.type === 'exam') {
    const count = Number(item.question_count ?? item.questionCount)
    return Math.min(90, Math.max(15, Number.isFinite(count) && count > 0 ? count * 4 : 30))
  }
  if (item.type === 'ai_voice') return 25
  if (item.type === 'human' || item.type === 'offline') return 60
  return 60
}

export function interviewAvailability(item = {}, now = new Date()) {
  if (item.status === 'in_progress') {
    return { state: 'open', canStart: true, label: 'Resume available' }
  }
  const scheduledAt = item.available_from || item.availableFrom || item.scheduled_at || item.scheduledAt
  const dueAt = item.due_at || item.dueAt
  if (!scheduledAt) {
    return { state: 'open', canStart: true, label: null }
  }
  const start = new Date(scheduledAt)
  const configuredEnd = dueAt ? new Date(dueAt) : null
  if (Number.isNaN(start.getTime()) || (configuredEnd && Number.isNaN(configuredEnd.getTime()))) {
    return { state: 'open', canStart: true, label: null }
  }
  const duration = interviewDurationMinutes(item)
  const end = configuredEnd || new Date(start.getTime() + duration * 60 * 1000)
  const current = now instanceof Date ? now : new Date(now)
  if (current < start) {
    return {
      state: 'not_yet',
      canStart: false,
      label: `Opens ${formatDateTime(start)}`,
      opensAt: start,
      closesAt: end,
      durationMinutes: duration,
    }
  }
  if (item.status === 'scheduled' && current > end) {
    return {
      state: 'expired',
      canStart: false,
      label: 'Expired. Ask your manager to reschedule.',
      opensAt: start,
      closesAt: end,
      durationMinutes: duration,
    }
  }
  return {
    state: 'open',
    canStart: true,
    label: `Available until ${formatDateTime(end)}`,
    opensAt: start,
    closesAt: end,
    durationMinutes: duration,
  }
}

/**
 * Parses a local datetime-local input string into a strict UTC ISO string.
 * @param {string} value e.g. "2026-07-09T10:30"
 * @returns {string|null} e.g. "2026-07-09T05:00:00.000Z"
 */
export function serializeDatetimeLocal(value) {
  if (!value) return null
  
  // Safely parse "YYYY-MM-DDTHH:mm" as local time across all browsers
  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) return null
  
  const [y, m, d] = datePart.split('-').map(Number)
  const [h, min] = timePart.split(':').map(Number)
  
  const date = new Date(y, m - 1, d, h, min)
  if (Number.isNaN(date.getTime())) return null
  
  return date.toISOString()
}
