// backend/src/utils/sql-search.js
// Builds a safe ILIKE pattern from free-text search input - escapes ILIKE's own
// wildcard characters so a search term containing % or _ is matched literally.

function toSearchPattern(search) {
  const trimmed = typeof search === 'string' ? search.trim() : ''
  if (!trimmed) return null
  const escaped = trimmed.replace(/[\\%_]/g, char => `\\${char}`)
  return `%${escaped}%`
}

module.exports = { toSearchPattern }
