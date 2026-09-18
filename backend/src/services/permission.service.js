// backend/src/services/permission.service.js
// Business logic for the Permissions module - validation only, no SQL here.
// Permissions are global (not per-company) - see docs/rbac-multi-tenant-plan.md.

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
  return permissionRepository.getAll()
}

async function createPermission(input) {
  const { name, description } = validatePermissionInput(input)

  const existing = await permissionRepository.getByName(name)
  if (existing) throw new Error('A permission with this name already exists')

  return permissionRepository.create({ name, description })
}

async function updatePermission(id, input) {
  const { name, description } = validatePermissionInput(input)

  const existing = await permissionRepository.getByName(name)
  if (existing && existing.id !== id) throw new Error('A permission with this name already exists')

  const updated = await permissionRepository.update(id, { name, description })
  if (!updated) throw new Error('Permission not found')
  return updated
}

async function deletePermission(id) {
  const inUse = await roleAclPermissionRepository.existsForPermission(id)
  if (inUse) throw new Error('Cannot delete this permission - it is granted to one or more roles')

  const deleted = await permissionRepository.remove(id)
  if (!deleted) throw new Error('Permission not found')
}

module.exports = { listPermissions, createPermission, updatePermission, deletePermission }
