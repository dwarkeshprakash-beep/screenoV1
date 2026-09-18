// backend/src/repositories/permission.repository.js
// SQL only - permissions table. Global, admin-managed catalog of grantable actions.
// See docs/rbac-multi-tenant-plan.md.

const db = require('../db/connection')

async function getAll() {
  return db.query(`SELECT id, name, description, created FROM permissions ORDER BY id`)
}

async function getById(id) {
  const rows = await db.query(`SELECT id, name, description, created FROM permissions WHERE id = @id`, { id })
  return rows[0] || null
}

async function getByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return []
  return db.query(`SELECT id FROM permissions WHERE id = ANY(@ids)`, { ids })
}

async function getByName(name) {
  const rows = await db.query(`SELECT id FROM permissions WHERE LOWER(name) = LOWER(@name)`, { name })
  return rows[0] || null
}

async function create({ name, description }) {
  const rows = await db.query(
    `INSERT INTO permissions (name, description) VALUES (@name, @description) RETURNING id, name, description, created`,
    { name, description: description || null }
  )
  return rows[0]
}

async function update(id, { name, description }) {
  const rows = await db.query(
    `UPDATE permissions SET name = @name, description = @description WHERE id = @id RETURNING id, name, description, created`,
    { id, name, description: description || null }
  )
  return rows[0] || null
}

async function remove(id) {
  const rows = await db.query(`DELETE FROM permissions WHERE id = @id RETURNING id`, { id })
  return rows.length > 0
}

module.exports = { getAll, getById, getByIds, getByName, create, update, remove }
