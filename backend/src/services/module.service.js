// backend/src/services/module.service.js
// Business logic for the Modules catalog - modules are global/fixed (seeded once) and
// their key never changes, but the display name can be renamed by an admin. This is
// also where an ACL now gets linked to the module it gates - an ACL is created bare
// (see acl.service.js#createAcl) and assigned to a module from here, one ACL per
// module per company, strict 1:1 either direction.
// See docs/rbac-multi-tenant-plan.md.

const moduleRepository = require('../repositories/module.repository')
const aclRepository = require('../repositories/acl.repository')

const NAME_MAX_LENGTH = 50

// Company-agnostic listing (no company picked yet) - just the bare catalog, no ACL info.
async function listModules(companyId) {
  const modules = await moduleRepository.getAll()
  if (!companyId) return modules.map(m => ({ ...m, acl: null }))

  const acls = await aclRepository.getByCompany(companyId)
  const aclByModuleId = new Map(acls.filter(a => a.module_id).map(a => [a.module_id, a]))
  return modules.map(m => {
    const acl = aclByModuleId.get(m.id)
    return { ...m, acl: acl ? { id: acl.id, name: acl.name } : null }
  })
}

async function listUnassignedAcls(companyId) {
  return aclRepository.getUnassigned(companyId)
}

async function updateModule(id, { name }) {
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (!trimmedName) throw new Error('Module name is required')
  if (trimmedName.length > NAME_MAX_LENGTH) throw new Error('Module name is too long')

  const updated = await moduleRepository.updateName(id, trimmedName)
  if (!updated) throw new Error('Module not found')
  return updated
}

async function assignAcl(moduleId, companyId, aclId) {
  const module = await moduleRepository.getById(moduleId)
  if (!module) throw new Error('Module not found')

  const existingForModule = await aclRepository.getByModule(companyId, moduleId)
  if (existingForModule) throw new Error('This module already has an ACL assigned')

  const acl = await aclRepository.getById(aclId, companyId)
  if (!acl) throw new Error('Selected ACL is invalid')
  if (acl.module_id) throw new Error('This ACL is already associated with a module')

  return aclRepository.assignModule(aclId, companyId, moduleId)
}

module.exports = { listModules, listUnassignedAcls, updateModule, assignAcl }
