// backend/src/services/team.service.js
// Business logic for team management. No SQL, no HTTP.

const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const teamMemberRepository = require('../repositories/team-member.repository')
const userRepository = require('../repositories/user.repository')
const candidateRepository = require('../repositories/candidate.repository')
const interviewRepository = require('../repositories/interview.repository')
const notesRepository = require('../repositories/notes.repository')

/**
 * Get all team members for a company with optional filter.
 * Returns team_members rows with profile data joined from users.
 * @param {number} companyId
 * @param {string} filter - 'all' | 'overdue' | 'never'
 * @returns {Promise<Array>}
 */
async function getTeam(companyId, filter = 'all') {
  return teamMemberRepository.getByCompany(companyId, filter)
}

/**
 * Get a single team member by team_members.id.
 * @param {number} id - team_members.id
 * @param {number} companyId
 * @returns {Promise<Object>}
 */
async function getMember(id, companyId) {
  const member = await teamMemberRepository.getByIdForCompany(id, companyId)
  if (!member) throw new Error('Member not found')
  return member
}

/**
 * Add a user to a manager's roster.
 * If userId is provided, links them directly.
 * If not (manual entry), looks up by email within the company first; if not
 * found, creates a minimal users row so the team_members row has a valid user_id.
 * @param {Object} data - { firstName, lastName, email, phone, userId? }
 * @param {number} companyId
 * @param {number} managerId
 * @returns {Promise<Object>}
 */
async function addMember(data, companyId, managerId) {
  if (!data.email) throw new Error('Email is required')

  let userId = data.userId || null

  if (!userId) {
    const existing = await userRepository.getByEmailForCompany(data.email, companyId)
    if (existing) {
      userId = existing.id
    } else {
      const tempPw = await bcrypt.hash('TEMP_' + crypto.randomBytes(8).toString('hex'), 10)
      const newUser = await userRepository.createMinimal(companyId, {
        firstName:    data.firstName,
        lastName:     data.lastName,
        email:        data.email,
        passwordHash: tempPw,
      })
      if (newUser) {
        userId = newUser.id
      } else {
        const found = await userRepository.getByEmailForCompany(data.email, companyId)
        userId = found?.id
      }
    }
  }

  if (!userId) throw new Error('Could not resolve user — email may not belong to this company')

  const tm = await teamMemberRepository.create({ companyId, managerId, userId })

  // Return the full profile view (JOIN to users)
  return teamMemberRepository.getByIdForCompany(tm.id, companyId)
}

/**
 * Update a team member's profile fields in the users table.
 * team_members itself has no profile columns to update.
 * @param {number} id - team_members.id
 * @param {Object} data
 * @param {number} companyId
 * @returns {Promise<Object>}
 */
async function updateMember(id, data, companyId) {
  const member = await teamMemberRepository.getByIdForCompany(id, companyId)
  if (!member) throw new Error('Member not found')

  // All profile data lives on users — update there
  if (data.firstName !== undefined || data.lastName !== undefined) {
    await userRepository.updateProfile(member.user_id, {
      firstName: data.firstName || null,
      lastName:  data.lastName  || null,
    })
  }
  if (data.employeeId !== undefined || data.position !== undefined || data.location !== undefined) {
    await userRepository.updateOrgProfile(member.user_id, {
      empNumber: data.employeeId || null,
      jobTitle:  data.position   || null,
      location:  data.location   || null,
    })
  }

  // Update resume fields on candidates if they have a candidate record
  if (member.candidate_id && (data.resumeUrl !== undefined || data.resumeText !== undefined)) {
    await candidateRepository.update(member.candidate_id, {
      resumeUrl:  data.resumeUrl  || null,
      resumeText: data.resumeText || null,
    })
  }

  // Re-fetch with fresh JOIN data
  return teamMemberRepository.getByIdForCompany(id, companyId)
}

/**
 * Soft-delete a team member.
 * @param {number} id - team_members.id
 * @param {number} companyId
 */
async function removeMember(id, companyId) {
  await teamMemberRepository.softDelete(id, companyId)
}

/**
 * Get team dashboard statistics for a company.
 * @param {number} companyId
 * @returns {Promise<Object>}
 */
async function getStats(companyId) {
  const [members, interviews] = await Promise.all([
    teamMemberRepository.getByCompany(companyId, 'all'),
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
    sub:  `${i.first_name} ${i.last_name}`,
    when: i.created,
  }))
}

/**
 * Get all notes for a team member.
 * @param {number} teamMemberId - team_members.id
 * @param {number} companyId
 * @returns {Promise<Array>}
 */
async function getNotes(teamMemberId, companyId) {
  await getMember(teamMemberId, companyId)
  return notesRepository.getNotes(teamMemberId)
}

/**
 * Add a note for a team member.
 * @param {number} teamMemberId - team_members.id
 * @param {number} managerId
 * @param {number} companyId
 * @param {string} note
 * @returns {Promise<Object>}
 */
async function addNote(teamMemberId, managerId, companyId, note) {
  if (!note || typeof note !== 'string' || !note.trim()) {
    throw new Error('Note must be a non-empty string')
  }
  const member = await getMember(teamMemberId, companyId)
  return notesRepository.createNote(teamMemberId, member.candidate_id || null, managerId, note)
}

/**
 * Import users from a CSV text string into the users table.
 * @param {string} csvText
 * @param {number} companyId
 * @returns {Promise<{ inserted: number, updated: number, errors: string[] }>}
 */
async function importFromCSV(csvText, companyId) {
  const lines = csvText.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const get = (cols, ...names) => {
    for (const n of names) {
      const i = headers.indexOf(n)
      if (i >= 0 && cols[i] && cols[i].trim()) return cols[i].trim()
    }
    return null
  }

  const rows = []
  const parseErrors = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const firstName = get(cols, 'first_name', 'firstname', 'name')
    const email     = get(cols, 'email')
    if (!firstName || !email) { parseErrors.push(`Row ${i + 1}: missing name or email`); continue }
    rows.push({
      firstName,
      lastName:     get(cols, 'last_name', 'lastname') || '',
      email,
      empNumber:    get(cols, 'employee_id', 'emp_number', 'emp_id') || null,
      departmentId: get(cols, 'department_id', 'dept_id') || null,
      jobTitle:     get(cols, 'job_title', 'position', 'title') || null,
      location:     get(cols, 'location') || null,
    })
  }

  const tempPasswordHash = await bcrypt.hash('TEMP_' + crypto.randomBytes(8).toString('hex'), 10)
  const result = await userRepository.bulkUpsert(rows, companyId, tempPasswordHash)
  return { inserted: result.inserted, updated: result.updated, errors: [...parseErrors, ...result.errors] }
}

/**
 * Get organisation users not yet in this manager's team.
 * @param {number} companyId
 * @param {number} managerId
 * @returns {Promise<Array>}
 */
async function getOrgUsersNotInTeam(companyId, managerId) {
  return userRepository.getNotInTeam(companyId, managerId)
}

module.exports = {
  getTeam, getMember, getOrgUsersNotInTeam, addMember, updateMember,
  removeMember, getStats, getActivity, getNotes, addNote, importFromCSV,
}
