// Shared CSV parsing - a small hand-rolled parser (handles quoted values, embedded
// commas/newlines) so no CSV library dependency is needed, matching the project's
// "no SDK packages unless necessary" convention.

/**
 * @param {string} csvText
 * @returns {string[][]} rows of trimmed cell values, blank rows skipped
 */
function parseCSV(csvText) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i]
    const next = csvText[i + 1]

    if (char === '"' && quoted && next === '"') {
      value += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(value.trim())
      value = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1
      row.push(value.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      value = ''
    } else {
      value += char
    }
  }

  row.push(value.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

/** @param {string} header @returns {string} lowercased, non-alphanumeric characters stripped */
function normalizeHeader(header) {
  return String(header || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

module.exports = { parseCSV, normalizeHeader }
