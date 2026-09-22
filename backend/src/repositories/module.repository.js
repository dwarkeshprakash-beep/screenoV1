// backend/src/repositories/module.repository.js
// SQL only - modules table. Global and fixed (seeded by migration) - only the display
// name is admin-editable, the key is not. See docs/rbac-multi-tenant-plan.md.

const db = require('../db/connection')

async function getAll() {
  return db.query(`SELECT id, key, name, sort_order, created FROM modules ORDER BY sort_order`)
}

async function getById(id) {
  const rows = await db.query(`SELECT id, key, name, sort_order, created FROM modules WHERE id = @id`, { id })
  return rows[0] || null
}

async function updateName(id, name) {
  const rows = await db.query(
    `UPDATE modules SET name = @name WHERE id = @id RETURNING id, key, name, sort_order, created`,
    { id, name }
  )
  return rows[0] || null
}

module.exports = { getAll, getById, updateName }
