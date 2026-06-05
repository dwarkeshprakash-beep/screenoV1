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
