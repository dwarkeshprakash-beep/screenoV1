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

/**
 * Concatenate tag lists, trimming and dropping blanks and case-insensitive duplicates.
 * The first spelling seen wins.
 * @param {...any[]} lists
 * @returns {string[]}
 */
function mergeTags(...lists) {
  const seen = new Set()
  const merged = []
  for (const tag of lists.flat()) {
    const clean = String(tag ?? '').trim()
    const key = clean.toLowerCase()
    if (!clean || seen.has(key)) continue
    seen.add(key)
    merged.push(clean)
  }
  return merged
}

const MAX_SKILLS = 30
const MAX_SKILL_LENGTH = 40

/**
 * Validate a user-edited skill list (stored in users.tags) and clean it with mergeTags.
 * @param {any} input
 * @returns {{ skills?: string[], error?: string }}
 */
function normalizeSkillList(input) {
  if (!Array.isArray(input)) return { error: 'skills must be an array' }
  if (input.some(s => typeof s !== 'string')) return { error: 'Each skill must be text' }
  const skills = mergeTags(input)
  if (skills.some(s => s.length > MAX_SKILL_LENGTH)) {
    return { error: `Each skill must be at most ${MAX_SKILL_LENGTH} characters` }
  }
  if (skills.length > MAX_SKILLS) return { error: `A profile can have at most ${MAX_SKILLS} skills` }
  return { skills }
}

const MAX_EXPERIENCE_YEARS = 60

/**
 * Validate a user-edited whole-number "years of experience" value (users.experience_years).
 * undefined/null/'' means "leave unchanged".
 * @param {any} input
 * @returns {{ value?: number|null, error?: string }}
 */
function normalizeExperienceYears(input) {
  if (input === undefined || input === null || input === '') return { value: null }
  const years = Number(input)
  if (!Number.isInteger(years) || years < 0 || years > MAX_EXPERIENCE_YEARS) {
    return { error: `Experience years must be a whole number between 0 and ${MAX_EXPERIENCE_YEARS}` }
  }
  return { value: years }
}

/**
 * Validate a user-edited "extra months of experience" value (users.experience_months),
 * the 0-11 remainder on top of experience_years - e.g. 4 years 9 months is
 * experience_years 4, experience_months 9. undefined/null/'' means "leave unchanged".
 * @param {any} input
 * @returns {{ value?: number|null, error?: string }}
 */
function normalizeExperienceMonths(input) {
  if (input === undefined || input === null || input === '') return { value: null }
  const months = Number(input)
  if (!Number.isInteger(months) || months < 0 || months > 11) {
    return { error: 'Experience months must be a whole number between 0 and 11' }
  }
  return { value: months }
}

/**
 * Validate a user-edited joining date (users.joining_date). undefined/null/'' means
 * "leave unchanged". Stored as a plain YYYY-MM-DD string - see the DATE type-parser
 * note in db/supabase.connection.js for why dates are kept as raw strings.
 * @param {any} input
 * @returns {{ value?: string|null, error?: string }}
 */
function normalizeJoiningDate(input) {
  if (input === undefined || input === null || input === '') return { value: null }
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return { error: 'Joining date is not a valid date' }
  return { value: String(input).slice(0, 10) }
}

module.exports = {
  parseStoredArray, parsePositiveInt, mergeTags, normalizeSkillList,
  normalizeExperienceYears, normalizeExperienceMonths, normalizeJoiningDate,
}
