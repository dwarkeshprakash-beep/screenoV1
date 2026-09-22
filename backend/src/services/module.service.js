// backend/src/services/module.service.js
// Business logic for the Modules catalog - modules are global/fixed (seeded once) and
// their key never changes, but the display name can be renamed by an admin.
// See docs/rbac-multi-tenant-plan.md.

const moduleRepository = require('../repositories/module.repository')

const NAME_MAX_LENGTH = 50

async function listModules() {
  return moduleRepository.getAll()
}

async function updateModule(id, { name }) {
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (!trimmedName) throw new Error('Module name is required')
  if (trimmedName.length > NAME_MAX_LENGTH) throw new Error('Module name is too long')

  const updated = await moduleRepository.updateName(id, trimmedName)
  if (!updated) throw new Error('Module not found')
  return updated
}

module.exports = { listModules, updateModule }
