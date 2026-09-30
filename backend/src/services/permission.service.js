// backend/src/services/permission.service.js
// Business logic for the Permissions module - validation only, no SQL here.
// Permissions are global (not per-company) and add-only - no update/delete.
// See docs/rbac-multi-tenant-plan.md.

const permissionRepository = require('../repositories/permission.repository')
const roleAclPermissionRepository = require('../repositories/role-acl-permission.repository')

const NAME_MAX_LENGTH = 50
const DESCRIPTION_MAX_LENGTH = 255

function validatePermissionInput({ name, description }) {
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (!trimmedName) throw new Error('Permission name is required')
  if (trimmedName.length > NAME_MAX_LENGTH) throw new Error('Permission name is too long')

  const trimmedDescription = typeof description === 'string' ? description.trim() : ''
  if (trimmedDescription.length > DESCRIPTION_MAX_LENGTH) throw new Error('Permission description is too long')

  return { name: trimmedName, description: trimmedDescription || null }
}

async function listPermissions() {
  const [permissions, counts] = await Promise.all([
    permissionRepository.getAll(),
    roleAclPermissionRepository.countRolesByPermission(),
  ])
  const roleCountByPermission = new Map(counts.map(c => [c.permission_id, Number(c.role_count)]))
  return permissions.map(p => ({ ...p, roleCount: roleCountByPermission.get(p.id) || 0 }))
}

async function getPermission(id) {
  const permission = await permissionRepository.getById(id)
  if (!permission) throw new Error('Permission not found')
  return permission
}

async function getPermissionGrants(id) {
  await getPermission(id) // throws 'Permission not found' if it doesn't exist
  return roleAclPermissionRepository.getRoleGrantsForPermission(id)
}

async function createPermission(input) {
  const { name, description } = validatePermissionInput(input)

  const existing = await permissionRepository.getByName(name)
  if (existing) throw new Error('A permission with this name already exists')

  return permissionRepository.create({ name, description })
}

module.exports = {
  listPermissions, getPermission, getPermissionGrants, createPermission,
}
