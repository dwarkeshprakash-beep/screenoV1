// backend/src/services/team.service.js
// Business logic for team management. No SQL, no HTTP.

const candidateRepository = require('../repositories/candidate.repository')
const userRepository = require('../repositories/user.repository')
const interviewRepository = require('../repositories/interview.repository')
const reportRepository = require('../repositories/report.repository')
const notesRepository = require('../repositories/notes.repository')

/**
 * Get all candidates for a company with optional filter.
 * @param {number} companyId
 * @param {string} filter - 'all' | 'overdue' | 'never'
 * @returns {Promise<Array>}
 */
async function getTeam(companyId, filter = 'all') {
  return candidateRepository.getByCompany(companyId, filter)
}

/**
 * Get a single team member by ID.
 * @param {number} id
 * @returns {Promise<Object>}
 */
async function getMember(id, companyId) {
  const member = await candidateRepository.getByIdForCompany(id, companyId)
  if (!member) throw new Error('Member not found')
  return member
}

/**
 * Add a new team member.
 * @param {Object} data
 * @param {number} companyId
 * @param {number} managerId
 * @returns {Promise<Object>}
 */
async function addMember(data, companyId, managerId) {
  if (!data.firstName) throw new Error('First name is required')
  if (!data.email) throw new Error('Email is required')

  return candidateRepository.create({
    ...data,
    companyId,
    managerId,
  })
}

/**
 * Update a team member's fields.
 * @param {number} id
 * @param {Object} data
 * @returns {Promise<Object>}
 */
async function updateMember(id, data, companyId) {
  const member = await candidateRepository.update(id, data, companyId)
  if (!member) throw new Error('Member not found')
  return member
}

/**
 * Soft-delete a team member.
 * @param {number} id
 */
async function removeMember(id, companyId) {
  await candidateRepository.softDelete(id, companyId)
}

/**
 * Get team dashboard statistics for a company.
 * @param {number} companyId
 * @returns {Promise<Object>}
 */
async function getStats(companyId) {
  const [members, interviews] = await Promise.all([
    candidateRepository.getByCompany(companyId, 'all'),
    interviewRepository.getByCompany(companyId),
  ])

  const openInterviews = interviews.filter(i => i.status === 'scheduled').length
  const evaluated = interviews.filter(i => ['completed', 'in_progress'].includes(i.status)).length

  return {
    openRoles: openInterviews,
    candidatesEvaluated: evaluated,
    pendingScorecard: interviews.filter(i => i.type === 'human' && i.status === 'completed').length,
    totalMembers: members.length,
  }
}

/**
 * Get recent hiring activity for a company.
 * @param {number} companyId
 * @returns {Promise<Array>}
 */
async function getActivity(companyId) {
  const interviews = await interviewRepository.getByCompany(companyId)
  return interviews.slice(0, 10).map(i => ({
    what: `${i.type === 'ai_voice' ? 'AI Interview' : i.type === 'exam' ? 'Exam' : 'Live Interview'} scheduled`,
    sub: `${i.first_name} ${i.last_name}`,
    when: i.created,
  }))
}

/**
 * Get all notes for a candidate.
 * @param {number} candidateId
 * @returns {Promise<Array>}
 */
async function getNotes(candidateId, companyId) {
  await getMember(candidateId, companyId)
  return notesRepository.getNotes(candidateId)
}

/**
 * Add a note for a candidate.
 * @param {number} candidateId
 * @param {number} managerId
 * @param {string} note
 * @returns {Promise<Object>}
 */
async function addNote(candidateId, managerId, companyId, note) {
  if (!note || typeof note !== 'string' || !note.trim()) {
    throw new Error('Note must be a non-empty string')
  }
  await getMember(candidateId, companyId)
  return notesRepository.createNote(candidateId, managerId, note)
}

/**
 * Import candidates from a CSV text string.
 * @param {string} csvText
 * @param {number} companyId
 * @param {number} managerId
 * @returns {Promise<{ inserted: number, skipped: number, errors: string[] }>}
 */
async function importFromCSV(csvText, companyId, managerId) {
  const lines = csvText.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')

  // Detect header columns
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const get = (cols, row, ...names) => {
    for (const n of names) {
      const i = headers.indexOf(n)
      if (i >= 0 && cols[i]) return cols[i].trim()
    }
    return null
  }

  const rows = []
  const errors = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const firstName = get(cols, null, 'first_name', 'firstname', 'name')
    const email = get(cols, null, 'email')
    if (!firstName || !email) { errors.push(`Row ${i + 1}: missing name or email`); continue }
    rows.push({
      firstName,
      lastName: get(cols, null, 'last_name', 'lastname') || '',
      email,
      phone: get(cols, null, 'phone', 'mobile') || null,
      type: 'internal',
    })
  }

  const result = await candidateRepository.bulkCreate(rows, companyId, managerId)
  return { ...result, errors }
}

/**
 * Get organisation users not yet in this manager's team (candidates table).
 * @param {number} companyId
 * @returns {Promise<Array>}
 */
async function getOrgUsersNotInTeam(companyId) {
  return userRepository.getNotInTeam(companyId)
}

module.exports = { getTeam, getMember, getOrgUsersNotInTeam, addMember, updateMember, removeMember, getStats, getActivity, getNotes, addNote, importFromCSV }
