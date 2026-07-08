// utils/helpers.js
// Small pure utility functions shared across the app.

/**
 * Format a date string into a readable format.
 * @param {string|Date} date
 * @returns {string} e.g. "Jun 3, 2026"
 */
export function formatDate(date) {
  if (!date) return '—'
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
  if (!date) return '—'
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
       + ' · '
       + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

/**
 * Truncate a string to maxLen characters, adding ellipsis if cut.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(str, maxLen = 80) {
  if (!str || str.length <= maxLen) return str
  return str.slice(0, maxLen).trim() + '…'
}

/**
 * Map interview status strings to Badge variant names.
 * @param {string} status
 * @returns {'success'|'warning'|'danger'|'neutral'}
 */
/**
 * Parse a JSON-stringified array or pass through a real array.
 * Returns [] on any failure — safe for tags, topics, and other stored arrays.
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
  const scheduledAt = item.scheduled_at || item.scheduledAt
  if (!scheduledAt) {
    return { state: 'open', canStart: true, label: null }
  }
  const start = new Date(scheduledAt)
  if (Number.isNaN(start.getTime())) {
    return { state: 'open', canStart: true, label: null }
  }
  const duration = interviewDurationMinutes(item)
  const end = new Date(start.getTime() + duration * 60 * 1000)
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
