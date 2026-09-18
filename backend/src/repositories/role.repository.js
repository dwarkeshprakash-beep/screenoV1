// backend/src/repositories/role.repository.js
// SQL only — roles table, scoped by company_id. See docs/rbac-multi-tenant-plan.md.

const db = require('../db/connection')

async function getByCompany(companyId) {
  return db.query(
    `SELECT id, company_id, name, description, created
     FROM roles
     WHERE company_id = @companyId
     ORDER BY name`,
    { companyId }
  )
}

async function getById(id, companyId) {
  const rows = await db.query(
    `SELECT id, company_id, name, description, created
     FROM roles
     WHERE id = @id AND company_id = @companyId`,
    { id, companyId }
  )
  return rows[0] || null
}

async function getByName(companyId, name) {
  const rows = await db.query(
    `SELECT id, company_id, name, description, created
     FROM roles
     WHERE company_id = @companyId AND LOWER(name) = LOWER(@name)`,
    { companyId, name }
  )
  return rows[0] || null
}

async function create(companyId, { name, description }) {
  const rows = await db.query(
    `INSERT INTO roles (company_id, name, description)
     VALUES (@companyId, @name, @description)
     RETURNING id, company_id, name, description, created`,
    { companyId, name, description: description || null }
  )
  return rows[0]
}

async function update(id, companyId, { name, description }) {
  const rows = await db.query(
    `UPDATE roles
     SET name = @name, description = @description
     WHERE id = @id AND company_id = @companyId
     RETURNING id, company_id, name, description, created`,
    { id, companyId, name, description: description || null }
  )
  return rows[0] || null
}

async function getByCompanyPage(companyId, { limit, offset, searchPattern }) {
  const rows = await db.query(
    `SELECT id, company_id, name, description, created, COUNT(*) OVER() AS total_count
     FROM roles
     WHERE company_id = @companyId
       AND (@searchPattern::text IS NULL OR name ILIKE @searchPattern OR description ILIKE @searchPattern)
     ORDER BY name
     LIMIT @limit OFFSET @offset`,
    { companyId, limit, offset, searchPattern: searchPattern || null }
  )
  const total = rows[0] ? Number(rows[0].total_count) : 0
  return { rows: rows.map(({ total_count, ...rest }) => rest), total }
}

async function getByIds(ids, companyId) {
  if (!Array.isArray(ids) || ids.length === 0) return []
  return db.query(
    `SELECT id FROM roles WHERE company_id = @companyId AND id = ANY(@ids)`,
    { companyId, ids }
  )
}

async function remove(id, companyId) {
  const rows = await db.query(
    `DELETE FROM roles WHERE id = @id AND company_id = @companyId RETURNING id`,
    { id, companyId }
  )
  return rows.length > 0
}

module.exports = { getByCompany, getByCompanyPage, getById, getByName, getByIds, create, update, remove }
