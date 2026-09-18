// backend/src/services/user.service.js
// Business logic for the Users module - validation and orchestration only, no SQL here.
// See docs/rbac-multi-tenant-plan.md.

const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const userRepository = require('../repositories/user.repository')
const userRoleRepository = require('../repositories/user-role.repository')
const roleRepository = require('../repositories/role.repository')
const emailOutboxRepository = require('../repositories/email-outbox.repository')
const { resolvePagination, buildPaginationMeta } = require('../utils/pagination')
const { toSearchPattern } = require('../utils/sql-search')

// The users.role column still exists and is still what every requireRole() guard reads -
// see the note on updateUser/createUser below. It's just no longer exposed in the Users
// module UI: new users get this inert default, and edits never touch an existing value.
const DEFAULT_LEGACY_ROLE = 'employee'
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
  const user = await userRepository.getByIdForCompany(id, companyId)
  if (!user) throw new Error('User not found')
  const roles = await userRoleRepository.getRolesForUser(id)
  return { ...user, roles }
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
    firstName, lastName, email, passwordHash, role: DEFAULT_LEGACY_ROLE,
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
  const roleIds = await resolveRoleIds(companyId, input.roleIds)

  // Deliberately does not touch users.role - see the module-level note above.
  let updated
  try {
    updated = await userRepository.updateBasicInfo(id, companyId, { firstName, lastName, email })
  } catch (err) {
    if (err.code === '23505') throw new Error('Email is already in use')
    throw err
  }
  if (!updated) throw new Error('User not found')

  await userRoleRepository.replaceForUser(id, roleIds)
  return getUser(companyId, id)
}

async function deleteUser(companyId, id) {
  const blocked = await userRepository.hasBlockingReferences(id)
  if (blocked) throw new Error('Cannot delete this user - they are associated with a mandate or interview')

  const deleted = await userRepository.remove(id, companyId)
  if (!deleted) throw new Error('User not found')
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser }
