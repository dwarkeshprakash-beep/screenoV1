// backend/src/services/acl.service.js
// Business logic for the ACL module - validation only. An ACL is created without a
// module and linked to one afterward from the Modules screen (see
// module.service.js#assignAcl) - not picked here. No SQL here.
// See docs/rbac-multi-tenant-plan.md.

const aclRepository = require('../repositories/acl.repository')
const roleRepository = require('../repositories/role.repository')
const permissionRepository = require('../repositories/permission.repository')
const roleAclPermissionRepository = require('../repositories/role-acl-permission.repository')
const { resolvePagination, buildPaginationMeta } = require('../utils/pagination')
const { toSearchPattern } = require('../utils/sql-search')

const ACL_NAME_MAX_LENGTH = 100
const ACL_DESCRIPTION_MAX_LENGTH = 255

function validateNameAndDescription({ name, description }) {
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (!trimmedName) throw new Error('ACL name is required')
  if (trimmedName.length > ACL_NAME_MAX_LENGTH) throw new Error('ACL name is too long')

  const trimmedDescription = typeof description === 'string' ? description.trim() : ''
  if (trimmedDescription.length > ACL_DESCRIPTION_MAX_LENGTH) throw new Error('ACL description is too long')

  return { name: trimmedName, description: trimmedDescription || null }
}

async function listAcls(companyId, { page, pageSize, search } = {}) {
  // No page requested - full list (for future use, e.g. an ACL picker elsewhere).
  if (!page) return { data: await aclRepository.getByCompany(companyId), pagination: null }

  const resolved = resolvePagination({ page, pageSize })
  const searchPattern = toSearchPattern(search)
  const { rows, total } = await aclRepository.getByCompanyPage(companyId, { limit: resolved.pageSize, offset: resolved.offset, searchPattern })
  return { data: rows, pagination: buildPaginationMeta({ ...resolved, total }) }
}

async function getAcl(companyId, id) {
  const acl = await aclRepository.getById(id, companyId)
  if (!acl) throw new Error('ACL not found')
  return acl
}

async function createAcl(companyId, input) {
  const { name, description } = validateNameAndDescription(input)

  const existingForName = await aclRepository.getByName(companyId, name)
  if (existingForName) throw new Error('An ACL with this name already exists')

  return aclRepository.create(companyId, { name, description })
}

async function updateAcl(companyId, id, input) {
  const { name, description } = validateNameAndDescription(input)

  const existingForName = await aclRepository.getByName(companyId, name)
  if (existingForName && existingForName.id !== id) throw new Error('An ACL with this name already exists')

  const updated = await aclRepository.update(id, companyId, { name, description })
  if (!updated) throw new Error('ACL not found')
  return updated
}

async function deleteAcl(companyId, id) {
  // No FK constraints in this DB (project convention) - clear the ACL's grant rows
  // ourselves before removing it so no orphaned role_acl_permissions rows are left behind.
  await roleAclPermissionRepository.replaceGrantsForAcl(companyId, id, [])
  const deleted = await aclRepository.remove(id, companyId)
  if (!deleted) throw new Error('ACL not found')
}

// Every permission in the catalog, plus roles + their current grants on one ACL -
// feeds the "assign role to this ACL with these permissions" screen. Only
// permissions that actually exist in the permissions table are ever returned, so
// the grid's columns are exactly the admin-defined catalog (see permission.service.js).
async function getAclPermissions(companyId, aclId) {
  await getAcl(companyId, aclId) // throws 'ACL not found' if it isn't this company's

  const [roles, permissions, grants] = await Promise.all([
    roleRepository.getByCompany(companyId),
    permissionRepository.getAll(),
    roleAclPermissionRepository.getGrantsForAcl(aclId),
  ])

  const permissionIdsByRole = new Map()
  for (const grant of grants) {
    const list = permissionIdsByRole.get(grant.role_id) || []
    list.push(grant.permission_id)
    permissionIdsByRole.set(grant.role_id, list)
  }

  return {
    permissions: permissions.map(p => ({ id: p.id, name: p.name })),
    roles: roles.map(role => ({
      roleId: role.id,
      roleName: role.name,
      permissionIds: permissionIdsByRole.get(role.id) || [],
    })),
  }
}

async function updateAclPermissions(companyId, aclId, grants) {
  await getAcl(companyId, aclId) // throws 'ACL not found' if it isn't this company's

  const roleIds = Array.isArray(grants) ? [...new Set(grants.map(g => Number(g.roleId)).filter(Boolean))] : []
  if (roleIds.length > 0) {
    const validRoles = await roleRepository.getByIds(roleIds, companyId)
    if (validRoles.length !== roleIds.length) throw new Error('One or more roles are invalid for this company')
  }

  const allPermissionIds = [...new Set(
    (Array.isArray(grants) ? grants : []).flatMap(g => (Array.isArray(g.permissionIds) ? g.permissionIds.map(Number).filter(Boolean) : []))
  )]
  if (allPermissionIds.length > 0) {
    const validPermissions = await permissionRepository.getByIds(allPermissionIds)
    if (validPermissions.length !== allPermissionIds.length) throw new Error('One or more permissions are invalid')
  }

  const normalized = (Array.isArray(grants) ? grants : [])
    .map(g => ({
      roleId: Number(g.roleId),
      permissionIds: [...new Set((Array.isArray(g.permissionIds) ? g.permissionIds : []).map(Number).filter(Boolean))],
    }))
    .filter(g => g.roleId && g.permissionIds.length > 0)

  await roleAclPermissionRepository.replaceGrantsForAcl(companyId, aclId, normalized)
  return getAclPermissions(companyId, aclId)
}

module.exports = {
  listAcls, getAcl, createAcl, updateAcl, deleteAcl,
  getAclPermissions, updateAclPermissions,
}
