// backend/src/services/user.service.js
// Business logic for the Users module - validation and orchestration only, no SQL here.
// See docs/rbac-multi-tenant-plan.md.

const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const userRepository = require('../repositories/user.repository')
const userRoleRepository = require('../repositories/user-role.repository')
const roleRepository = require('../repositories/role.repository')
const roleAclPermissionRepository = require('../repositories/role-acl-permission.repository')
const companyRepository = require('../repositories/company.repository')
const interviewRepository = require('../repositories/interview.repository')
const emailOutboxRepository = require('../repositories/email-outbox.repository')
const storageService = require('./storage.service')
const authService = require('./auth.service')
const { resolvePagination, buildPaginationMeta } = require('../utils/pagination')
const { toSearchPattern } = require('../utils/sql-search')
const { parseCSV, normalizeHeader } = require('../utils/csv')

const BCRYPT_SALT_ROUNDS = 10
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateBasicInfo({ firstName, lastName, email }) {
  const trimmedFirstName = typeof firstName === 'string' ? firstName.trim() : ''
  const trimmedLastName = typeof lastName === 'string' ? lastName.trim() : ''
  const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

  if (!trimmedFirstName) throw new Error('First name is required')
  if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) throw new Error('A valid email is required')

  return { firstName: trimmedFirstName, lastName: trimmedLastName, email: trimmedEmail }
}

async function resolveRoleIds(companyId, roleIds) {
  const ids = Array.isArray(roleIds) ? [...new Set(roleIds.map(Number).filter(Boolean))] : []
  if (ids.length === 0) return []
  const valid = await roleRepository.getByIds(ids, companyId)
  if (valid.length !== ids.length) throw new Error('One or more roles are invalid for this organization')

  return ids
}

async function listUsers(companyId, { page, pageSize, search } = {}) {
  let users
  let pagination = null

  if (!page) {
    users = await userRepository.getByCompany(companyId)
  } else {
    const resolved = resolvePagination({ page, pageSize })
    const searchPattern = toSearchPattern(search)
    const { rows, total } = await userRepository.getByCompanyPage(companyId, { limit: resolved.pageSize, offset: resolved.offset, searchPattern })
    users = rows
    pagination = buildPaginationMeta({ ...resolved, total })
  }

  const roleLinks = await userRoleRepository.getRolesForCompanyUsers(companyId)
  const rolesByUser = new Map()
  for (const link of roleLinks) {
    const list = rolesByUser.get(link.user_id) || []
    list.push({ id: link.role_id, name: link.role_name })
    rolesByUser.set(link.user_id, list)
  }

  const data = users.map(user => ({ ...user, roles: rolesByUser.get(user.id) || [] }))
  return { data, pagination }
}

async function getUser(companyId, id) {
  const user = await userRepository.getOrganizationMemberProfile(id, companyId)
  if (!user) throw new Error('User not found')
  const roles = await userRoleRepository.getRolesForUser(id)
  return { ...user, roles }
}

// What this user can actually do, derived from their roles - grouped by ACL so
// the detail page can show "Module / ACL -> [permissions]" instead of a flat list.
async function getUserAccess(companyId, id) {
  const [user, organization] = await Promise.all([
    getUser(companyId, id),
    companyRepository.getById(companyId),
  ])
  user.organizationName = organization?.name || null
  const roleIds = user.roles.map(r => r.id)
  const grants = await roleAclPermissionRepository.getGrantsForRoles(roleIds)

  const aclsById = new Map()
  for (const grant of grants) {
    if (!aclsById.has(grant.acl_id)) {
      aclsById.set(grant.acl_id, {
        aclId: grant.acl_id, aclName: grant.acl_name, moduleName: grant.module_name, permissionsById: new Map(),
      })
    }
    aclsById.get(grant.acl_id).permissionsById.set(grant.permission_id, grant.permission_name)
  }

  const access = [...aclsById.values()].map(({ aclId, aclName, moduleName, permissionsById }) => ({
    aclId, aclName, moduleName,
    permissions: [...permissionsById.entries()].map(([id, name]) => ({ id, name })),
  }))

  return { user, access }
}

// Every interview this user has been the candidate for, with a usable link to
// its report where one exists. report_pdf_url comes back as an internal storage
// path (see storage.service.js) - sign it into a temporary download URL here so
// the frontend can render it directly, same as report.routes.js does for the
// manager-facing report views.
async function getUserInterviews(companyId, id) {
  const user = await userRepository.getByIdForCompany(id, companyId)
  if (!user) throw new Error('User not found')

  const interviews = await interviewRepository.getByInternalUserForCompany(id, companyId)
  return Promise.all(interviews.map(async interview => {
    if (!interview.report_pdf_url || /^https?:\/\//i.test(interview.report_pdf_url)) return interview
    try {
      return { ...interview, report_pdf_url: await storageService.getSignedUrl(interview.report_pdf_url) }
    } catch {
      return { ...interview, report_pdf_url: null }
    }
  }))
}

async function createUser(companyId, input) {
  const { firstName, lastName, email } = validateBasicInfo(input)
  const roleIds = await resolveRoleIds(companyId, input.roleIds)

  // No password is collected from the admin. A random, never-shared value fills
  // the NOT NULL column so the account exists but can't be logged into - the
  // user sets their real password from the emailed one-time link below.
  const placeholderPassword = crypto.randomBytes(32).toString('hex')
  const passwordHash = await bcrypt.hash(placeholderPassword, BCRYPT_SALT_ROUNDS)
  const created = await userRepository.createMinimal(companyId, {
    firstName, lastName, email, passwordHash,
  })
  if (!created) throw new Error('A user with this email already exists')

  if (roleIds.length > 0) await userRoleRepository.replaceForUser(created.id, roleIds)

  await emailOutboxRepository.enqueueWelcomeSetPassword({
    eventKey: `welcome_set_password_${created.id}_${crypto.randomUUID()}`,
    userId: created.id,
    recipient: email,
    name: `${firstName} ${lastName}`.trim(),
  })

  return getUser(companyId, created.id)
}

async function updateUser(companyId, id, input) {
  const { firstName, lastName, email } = validateBasicInfo(input)
  // Only touch role assignments when the caller actually sent roleIds - an omitted
  // key (e.g. a future partial-update caller) must leave existing roles alone, not
  // resolve to [] and wipe them via replaceForUser below.
  const roleIdsProvided = input.roleIds !== undefined
  const roleIds = roleIdsProvided ? await resolveRoleIds(companyId, input.roleIds) : null

  let updated
  try {
    updated = await userRepository.updateBasicInfo(id, companyId, { firstName, lastName, email })
  } catch (err) {
    if (err.code === '23505') throw new Error('Email is already in use')
    throw err
  }
  if (!updated) throw new Error('User not found')

  if (roleIdsProvided) await userRoleRepository.replaceForUser(id, roleIds)
  return getUser(companyId, id)
}

async function deleteUser(companyId, id) {
  const blocked = await userRepository.hasBlockingReferences(id)
  if (blocked) throw new Error('Cannot delete this user - they are associated with a mandate or interview')

  const deleted = await userRepository.remove(id, companyId)
  if (!deleted) throw new Error('User not found')
}

// Admin-only bootstrap for a user in another company: temp password (never surfaced -
// the invite email is the only way in), an admin-chosen role, and a password-reset
// email. Moved here from admin.routes.js so the route stays HTTP-only.
async function createUserWithRole(companyId, { email, firstName, lastName, roleId }) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!cleanEmail) throw new Error('email is required')

  const company = await companyRepository.getById(companyId)
  if (!company) throw new Error('Organization not found')

  const role = await roleRepository.getById(roleId, companyId)
  if (!role) throw new Error('Select a valid role for this user')

  const existing = await userRepository.getByEmailForCompany(cleanEmail, companyId)
  if (existing) throw new Error('A user with this email already exists in that organization')

  const tempPasswordHash = await bcrypt.hash('TEMP_' + crypto.randomBytes(8).toString('hex'), BCRYPT_SALT_ROUNDS)
  const created = await userRepository.createMinimal(companyId, {
    firstName, lastName, email: cleanEmail, passwordHash: tempPasswordHash,
  })
  if (!created) throw new Error('Could not create user - email may already be in use')

  await userRoleRepository.replaceForUser(created.id, [role.id])
  await authService.requestPasswordReset(cleanEmail)

  return { id: created.id, email: cleanEmail }
}

// Admin-only bulk import for one organization - e.g. backfilling users from another
// environment. Each row accepts the same shape the migration tooling exports
// (empNumber, firstName, lastName, email, jobTitle, location, departmentName,
// roleNames, tags, skillCompetencies, availability, experienceYears/Months,
// joiningDate, resumeUrl, resumeText, isPlatformAdmin). Any `password`/`passwordHash`
// field on a row is ignored - this never accepts a caller-supplied hash, since that
// would let a client set an arbitrary credential; every imported user gets a fresh
// random temp password and (optionally) the existing welcome-email flow, same as
// createUser() above.
//
// Idempotent per row: a row whose email already exists anywhere in the database is
// skipped and reported, never overwritten - re-posting the same batch after a
// partial failure is safe.
async function bulkImportUsers(companyId, users, { sendInviteEmails = false } = {}) {
  if (!Array.isArray(users) || users.length === 0) {
    throw Object.assign(new Error('users must be a non-empty array'), { httpStatus: 400 })
  }
  if (users.length > 1000) {
    throw Object.assign(new Error('Import is limited to 1000 users per request'), { httpStatus: 400 })
  }

  const company = await companyRepository.getById(companyId)
  if (!company) throw Object.assign(new Error('Organization not found'), { httpStatus: 404 })

  const roles = await roleRepository.getByCompany(companyId)
  const roleIdByName = new Map(roles.map(r => [r.name.toLowerCase(), r.id]))

  const result = { inserted: [], skippedExisting: 0, conflicts: [], missingRoles: [], errors: [] }

  for (const row of users) {
    try {
      const email = String(row.email || '').trim().toLowerCase()
      const firstName = String(row.firstName || '').trim()
      if (!email || !EMAIL_PATTERN.test(email)) { result.errors.push(`(row with no valid email): invalid email`); continue }
      if (!firstName) { result.errors.push(`${email}: firstName is required`); continue }

      const existing = await userRepository.getByEmailAnyCompany(email)
      if (existing) {
        if (existing.company_id === companyId) result.skippedExisting += 1
        else result.conflicts.push(`${email} already exists under a different organization (company_id ${existing.company_id})`)
        continue
      }

      const roleNames = Array.isArray(row.roleNames) ? row.roleNames : []
      const resolvedRoleIds = roleNames.map(n => roleIdByName.get(String(n).toLowerCase())).filter(Boolean)
      const unmatched = roleNames.filter(n => !roleIdByName.has(String(n).toLowerCase()))
      if (unmatched.length > 0) result.missingRoles.push(`${email}: no match for role(s) ${unmatched.join(', ')}`)
      else if (resolvedRoleIds.length === 0 && !row.isPlatformAdmin) result.missingRoles.push(`${email}: no role provided`)

      const departmentId = await userRepository.findOrCreateDepartment(row.departmentName)
      const passwordHash = await bcrypt.hash('TEMP_' + crypto.randomBytes(8).toString('hex'), BCRYPT_SALT_ROUNDS)

      const created = await userRepository.createForImport(companyId, {
        empNumber: row.empNumber,
        firstName,
        lastName: row.lastName,
        email,
        departmentId,
        jobTitle: row.jobTitle,
        location: row.location,
        passwordHash,
        resumeUrl: row.resumeUrl,
        resumeText: row.resumeText,
        tags: row.tags,
        skillCompetencies: row.skillCompetencies,
        availability: row.availability,
        experienceYears: row.experienceYears,
        experienceMonths: row.experienceMonths,
        joiningDate: row.joiningDate,
        isPlatformAdmin: row.isPlatformAdmin,
      })

      if (resolvedRoleIds.length > 0) await userRoleRepository.replaceForUser(created.id, resolvedRoleIds)

      if (sendInviteEmails) {
        await emailOutboxRepository.enqueueWelcomeSetPassword({
          eventKey: `welcome_set_password_${created.id}_${crypto.randomUUID()}`,
          userId: created.id,
          recipient: email,
          name: `${firstName} ${row.lastName || ''}`.trim(),
        })
      }

      result.inserted.push({ id: created.id, email })
    } catch (err) {
      result.errors.push(`${row.email || '(unknown)'}: ${err.message}`)
    }
  }

  return result
}

// CSV column headers this accepts (order doesn't matter, case/punctuation-insensitive
// via normalizeHeader): firstName*, lastName, email*, empNumber, jobTitle, location,
// departmentName, roleNames (semicolon-separated, e.g. "Manager;Interviewer"),
// availability, experienceYears, experienceMonths, joiningDate, tags, skillCompetencies.
// (* required). Resume fields and the platform-admin flag are intentionally not
// CSV-importable - bulk-setting admin access from a spreadsheet is too risky, and
// resume text doesn't fit a single CSV cell sensibly.
function parseUsersCSV(csvText) {
  if (typeof csvText !== 'string' || !csvText.trim()) {
    throw Object.assign(new Error('CSV content is required'), { httpStatus: 400 })
  }
  const parsed = parseCSV(csvText)
  if (parsed.length < 2) {
    throw Object.assign(new Error('CSV must include a header and at least one row'), { httpStatus: 400 })
  }

  const headers = parsed[0].map(normalizeHeader)
  const indexOf = (...names) => headers.findIndex(h => names.includes(h))
  const col = {
    firstName: indexOf('firstname', 'first'),
    lastName: indexOf('lastname', 'last', 'surname'),
    email: indexOf('email', 'emailaddress'),
    empNumber: indexOf('empnumber', 'employeenumber', 'employeeid', 'empid'),
    jobTitle: indexOf('jobtitle', 'position', 'currentposition'),
    location: indexOf('location', 'office'),
    departmentName: indexOf('departmentname', 'department'),
    roleNames: indexOf('rolenames', 'roles', 'role'),
    availability: indexOf('availability'),
    experienceYears: indexOf('experienceyears'),
    experienceMonths: indexOf('experiencemonths'),
    joiningDate: indexOf('joiningdate'),
    tags: indexOf('tags'),
    skillCompetencies: indexOf('skillcompetencies'),
  }
  if (col.email < 0 || col.firstName < 0) {
    throw Object.assign(new Error('CSV headers must include firstName and email'), { httpStatus: 400 })
  }

  const cell = (columns, index) => (index >= 0 ? String(columns[index] || '').trim() : '')
  const numberCell = (columns, index) => {
    const value = cell(columns, index)
    return value === '' ? undefined : Number(value)
  }

  return parsed.slice(1).map(columns => ({
    firstName: cell(columns, col.firstName),
    lastName: cell(columns, col.lastName),
    email: cell(columns, col.email),
    empNumber: cell(columns, col.empNumber),
    jobTitle: cell(columns, col.jobTitle),
    location: cell(columns, col.location),
    departmentName: cell(columns, col.departmentName),
    roleNames: cell(columns, col.roleNames).split(';').map(s => s.trim()).filter(Boolean),
    availability: cell(columns, col.availability),
    experienceYears: numberCell(columns, col.experienceYears),
    experienceMonths: numberCell(columns, col.experienceMonths),
    joiningDate: cell(columns, col.joiningDate),
    tags: cell(columns, col.tags),
    skillCompetencies: cell(columns, col.skillCompetencies),
  }))
}

async function importUsersFromCSV(companyId, csvText, opts) {
  const rows = parseUsersCSV(csvText)
  return bulkImportUsers(companyId, rows, opts)
}

module.exports = {
  listUsers, getUser, getUserAccess, getUserInterviews,
  createUser, updateUser, deleteUser, createUserWithRole, bulkImportUsers, importUsersFromCSV,
}
