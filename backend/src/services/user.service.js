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
  if (valid.length !== ids.length) throw new Error('One or more roles are invalid for this company')

  // A user's roles must all belong to the same portal - access.service.js resolves
  // portal from the first role that has one, so mixing portals would silently pick
  // one and lock the user out of the other rather than erroring loudly here.
  const portals = new Set(valid.map(role => role.portal).filter(Boolean))
  if (portals.size > 1) throw new Error('Selected roles belong to different portals - a user can only hold roles from one portal')

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

// Admin-only bootstrap for a BDE-portal user: temp password (never surfaced - the
// invite email is the only way in), a role from the company's existing BDE-portal
// role(s), and a password-reset email. Moved here from admin.routes.js so the
// route stays HTTP-only. See docs/rbac-multi-tenant-plan.md.
async function createBdeUser(companyId, { email, firstName, lastName }) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!cleanEmail) throw new Error('email is required')

  const company = await companyRepository.getById(companyId)
  if (!company) throw new Error('Company not found')

  const existing = await userRepository.getByEmailForCompany(cleanEmail, companyId)
  if (existing) throw new Error('A user with this email already exists in that company')

  // Portal is assigned via a role (see roles.portal), not a users.role column -
  // this company needs at least one BDE-portal role already set up in the Roles module.
  const bdeRoles = await roleRepository.getByPortal(companyId, 'bde')
  if (bdeRoles.length === 0) {
    throw new Error('This company has no BDE-portal role yet - create one in the Roles module first')
  }

  const tempPasswordHash = await bcrypt.hash('TEMP_' + crypto.randomBytes(8).toString('hex'), BCRYPT_SALT_ROUNDS)
  const created = await userRepository.createMinimal(companyId, {
    firstName, lastName, email: cleanEmail, passwordHash: tempPasswordHash,
  })
  if (!created) throw new Error('Could not create user - email may already be in use')

  await userRoleRepository.replaceForUser(created.id, [bdeRoles[0].id])
  await authService.requestPasswordReset(cleanEmail)

  return { id: created.id, email: cleanEmail }
}

module.exports = {
  listUsers, getUser, getUserAccess, getUserInterviews,
  createUser, updateUser, deleteUser, createBdeUser,
}
