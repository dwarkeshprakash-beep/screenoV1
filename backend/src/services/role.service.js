// backend/src/services/role.service.js
// Business logic for the Roles module - validation only, no SQL here.
// See docs/rbac-multi-tenant-plan.md for the full RBAC design this feeds into.

const roleRepository = require('../repositories/role.repository')
const userRoleRepository = require('../repositories/user-role.repository')
const roleAclPermissionRepository = require('../repositories/role-acl-permission.repository')
const { resolvePagination, buildPaginationMeta } = require('../utils/pagination')
const { toSearchPattern } = require('../utils/sql-search')

const ROLE_NAME_MAX_LENGTH = 100
const ROLE_DESCRIPTION_MAX_LENGTH = 255

function validateRoleInput({ name, description }) {
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (!trimmedName) throw new Error('Role name is required')
  if (trimmedName.length > ROLE_NAME_MAX_LENGTH) throw new Error('Role name is too long')

  const trimmedDescription = typeof description === 'string' ? description.trim() : ''
  if (trimmedDescription.length > ROLE_DESCRIPTION_MAX_LENGTH) throw new Error('Role description is too long')

  return { name: trimmedName, description: trimmedDescription || null }
}

async function listRoles(companyId, { page, pageSize, search } = {}) {
  // No page requested - full list (used internally, e.g. the role-assignment picker in the Users module).
  if (!page) return { data: await roleRepository.getByCompany(companyId), pagination: null }

  const resolved = resolvePagination({ page, pageSize })
  const searchPattern = toSearchPattern(search)
  const { rows, total } = await roleRepository.getByCompanyPage(companyId, { limit: resolved.pageSize, offset: resolved.offset, searchPattern })
  return { data: rows, pagination: buildPaginationMeta({ ...resolved, total }) }
}

async function getRole(companyId, id) {
  const role = await roleRepository.getById(id, companyId)
  if (!role) throw new Error('Role not found')
  return role
}

async function getRoleUsers(companyId, id, { page, pageSize } = {}) {
  await getRole(companyId, id) // confirms the role belongs to this company
  const resolved = resolvePagination({ page, pageSize })
  const { rows, total } = await userRoleRepository.getUsersForRole(id, { limit: resolved.pageSize, offset: resolved.offset })
  return { data: rows, pagination: buildPaginationMeta({ ...resolved, total }) }
}

async function createRole(companyId, input) {
  const { name, description } = validateRoleInput(input)

  const existing = await roleRepository.getByName(companyId, name)
  if (existing) throw new Error('A role with this name already exists')

  return roleRepository.create(companyId, { name, description })
}

async function updateRole(companyId, id, input) {
  const { name, description } = validateRoleInput(input)

  const existing = await roleRepository.getByName(companyId, name)
  if (existing && existing.id !== id) throw new Error('A role with this name already exists')

  const updated = await roleRepository.update(id, companyId, { name, description })
  if (!updated) throw new Error('Role not found')
  return updated
}

async function deleteRole(companyId, id) {
  const assignedToUsers = await userRoleRepository.existsForRole(id)
  if (assignedToUsers) throw new Error('Cannot delete this role - it is assigned to one or more users')

  const grantedOnAcls = await roleAclPermissionRepository.existsForRole(id)
  if (grantedOnAcls) throw new Error('Cannot delete this role - it has permissions granted on one or more ACLs')

  const deleted = await roleRepository.remove(id, companyId)
  if (!deleted) throw new Error('Role not found')
}

module.exports = { listRoles, getRole, getRoleUsers, createRole, updateRole, deleteRole }
