// backend/src/services/team.service.js
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const teamMemberRepository = require('../repositories/team-member.repository')
const userRepository = require('../repositories/user.repository')
const interviewRepository = require('../repositories/interview.repository')
const externalCandidateRepository = require('../repositories/external-candidate.repository')

async function getTeam(managerId, filter = 'all') {
  return teamMemberRepository.getByManager(managerId, filter)
}

async function getMember(id, managerId) {
  const member = await teamMemberRepository.getByIdForManager(id, managerId)
  if (!member) throw new Error('Member not found')
  return member
}

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

  await userRepository.updateOrgProfile(userId, {
    email: data.email,
    empNumber: data.employeeId,
    jobTitle: data.position,
    location: data.location,
    department: data.department,
    companyId,
  })

  const tm = await teamMemberRepository.create({ managerId, userId })

  return teamMemberRepository.getByIdForManager(tm.id, managerId)
}

async function updateMember(id, data, managerId) {
  const member = await teamMemberRepository.getByIdForManager(id, managerId)
  if (!member) throw new Error('Member not found')

  const hasProfileUpdate = data.firstName !== undefined || data.lastName !== undefined
    || data.resumeUrl !== undefined || data.availability !== undefined
  if (hasProfileUpdate) {
    await userRepository.updateProfile(member.user_id, {
      firstName:    data.firstName    || null,
      lastName:     data.lastName     || null,
      resumeUrl:    data.resumeUrl    || null,
      availability: data.availability || null,
    })
  }

  const hasOrgUpdate = data.email !== undefined || data.employeeId !== undefined
    || data.position !== undefined || data.location !== undefined
    || data.department !== undefined
  if (hasOrgUpdate) {
    const email = String(data.email || member.email || '').trim().toLowerCase()
    if (!email || !email.includes('@')) throw new Error('A valid email is required')
    const existing = await userRepository.getByEmail(email)
    if (existing && Number(existing.id) !== Number(member.user_id)) {
      throw new Error('Email is already in use')
    }
    await userRepository.updateOrgProfile(member.user_id, {
      email,
      empNumber: data.employeeId,
      jobTitle: data.position,
      location: data.location,
      department: data.department,
      companyId: member.company_id,
    })
  }

  return teamMemberRepository.getByIdForManager(id, managerId)
}

async function removeMember(id, managerId) {
  await teamMemberRepository.removeMember(id, managerId)
}

async function getStats(managerId) {
  const [members, interviews] = await Promise.all([
    teamMemberRepository.getByManager(managerId, 'all'),
    interviewRepository.getByManager(managerId),
  ])

  const openInterviews = interviews.filter(i => i.status === 'scheduled' || i.status === 'pending').length
  const evaluated = interviews.filter(i => ['completed', 'in_progress'].includes(i.status)).length

  return {
    openRoles: openInterviews,
    candidatesEvaluated: evaluated,
    pendingScorecard: interviews.filter(i => i.status === 'completed' && !i.overall_score).length,
    totalMembers: members.length,
  }
}

async function getActivity(managerId) {
  const interviews = await interviewRepository.getByManager(managerId)
  return interviews.slice(0, 10).map(i => ({
    what: `${i.type === 'ai_voice' ? 'AI Interview' : 'Exam'} ${i.status}`,
    sub:  `${i.candidate_first} ${i.candidate_last}`,
    when: i.created,
  }))
}

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

function normalizeHeader(header) {
  return String(header || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

async function importFromCSV(csvText, companyId, managerId) {
  if (typeof csvText !== 'string' || !csvText.trim()) {
    throw new Error('CSV content is required')
  }

  const parsed = parseCSV(csvText)
  if (parsed.length < 2) throw new Error('CSV must include a header and at least one row')

  const headers = parsed[0].map(normalizeHeader)
  const indexOf = (...names) => headers.findIndex(header => names.includes(header))
  const firstNameIndex = indexOf('firstname', 'first')
  const lastNameIndex = indexOf('lastname', 'last', 'surname')
  const emailIndex = indexOf('email', 'emailaddress')
  const empNumberIndex = indexOf('empnumber', 'employeenumber', 'employeeid', 'empid')
  const jobTitleIndex = indexOf('jobtitle', 'position', 'currentposition')
  const locationIndex = indexOf('location', 'office')

  if (emailIndex < 0 || firstNameIndex < 0) {
    throw new Error('CSV headers must include firstName and email')
  }

  const errors = []
  const rows = parsed.slice(1).flatMap((columns, index) => {
    const email = String(columns[emailIndex] || '').trim().toLowerCase()
    const firstName = String(columns[firstNameIndex] || '').trim()
    if (!email || !firstName || !email.includes('@')) {
      errors.push(`Row ${index + 2}: valid firstName and email are required`)
      return []
    }
    return [{
      firstName,
      lastName: lastNameIndex >= 0 ? String(columns[lastNameIndex] || '').trim() : '',
      email,
      empNumber: empNumberIndex >= 0 ? String(columns[empNumberIndex] || '').trim() : '',
      jobTitle: jobTitleIndex >= 0 ? String(columns[jobTitleIndex] || '').trim() : '',
      location: locationIndex >= 0 ? String(columns[locationIndex] || '').trim() : '',
    }]
  })

  const tempPasswordHash = await bcrypt.hash(`TEMP_${crypto.randomBytes(16).toString('hex')}`, 10)
  const result = await userRepository.bulkUpsert(rows, companyId, managerId, tempPasswordHash)
  return { ...result, errors: [...errors, ...result.errors] }
}

async function getMemberInterviews(id, managerId) {
  const member = await getMember(id, managerId)
  return interviewRepository.getByInternalUserForManager(member.user_id, managerId)
}

async function getExternalCandidates(companyId) {
  return externalCandidateRepository.getByCompany(companyId)
}

async function addExternalCandidate(data, companyId) {
  const firstName = String(data.firstName || '').trim()
  const email = String(data.email || '').trim().toLowerCase()
  if (!firstName || !email) throw new Error('First name and email are required')
  if (!email.includes('@')) throw new Error('A valid email is required')

  return externalCandidateRepository.create({
    company_id: companyId,
    first_name: firstName,
    last_name: String(data.lastName || '').trim(),
    email,
    resume_url: data.resumeUrl || null,
    tags: Array.isArray(data.tags) || typeof data.tags === 'string' ? data.tags : [],
  })
}

async function getOrgUsersNotInTeam(companyId, managerId) {
  return userRepository.getNotInTeam(companyId, managerId)
}

module.exports = {
  getTeam, getMember, getOrgUsersNotInTeam, addMember, updateMember,
  removeMember, getStats, getActivity, importFromCSV, getMemberInterviews,
  parseCSV,
  getExternalCandidates, addExternalCandidate,
}
