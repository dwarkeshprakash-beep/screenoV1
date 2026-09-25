// backend/src/utils/parse.js
// Shared parsing helpers used across services and routes.

/**
 * Parse a JSON-stringified array or pass through a real array.
 * Returns [] on any failure - safe for tags, topics, and other stored arrays.
 * @param {any} value
 * @returns {any[]}
 */
function parseStoredArray(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Parse a positive integer id from a query/body/path value.
 * @param {any} rawValue
 * @returns {number|null} the id, or null when missing or not a positive integer
 */
function parsePositiveInt(rawValue) {
  const value = Number(rawValue)
  return Number.isInteger(value) && value > 0 ? value : null
}

module.exports = { parseStoredArray, parsePositiveInt }
