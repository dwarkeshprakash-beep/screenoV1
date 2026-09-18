// backend/src/services/module.service.js
// Business logic for the Modules catalog - currently a thin pass-through, since modules
// are global/fixed (seeded once, not admin-editable). See docs/rbac-multi-tenant-plan.md.

const moduleRepository = require('../repositories/module.repository')

async function listModules() {
  return moduleRepository.getAll()
}

module.exports = { listModules }
