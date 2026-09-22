// backend/src/repositories/role.repository.js
// SQL only - roles table, scoped by company_id. See docs/rbac-multi-tenant-plan.md.

const db = require('../db/connection')
const { extractPage } = require('../utils/pagination')

async function getByCompany(companyId) {
  return db.query(
    `SELECT id, company_id, name, description, portal, created
     FROM roles
     WHERE company_id = @companyId
     ORDER BY name`,
    { companyId }
  )
}

async function getById(id, companyId) {
  const rows = await db.query(
    `SELECT id, company_id, name, description, portal, created
     FROM roles
     WHERE id = @id AND company_id = @companyId`,
    { id, companyId }
  )
  return rows[0] || null
}

async function getByName(companyId, name) {
  const rows = await db.query(
    `SELECT id, company_id, name, description, portal, created
     FROM roles
     WHERE company_id = @companyId AND LOWER(name) = LOWER(@name)`,
    { companyId, name }
  )
  return rows[0] || null
}

async function create(companyId, { name, description, portal }) {
  const rows = await db.query(
    `INSERT INTO roles (company_id, name, description, portal)
     VALUES (@companyId, @name, @description, @portal)
     RETURNING id, company_id, name, description, portal, created`,
    { companyId, name, description: description || null, portal }
  )
  return rows[0]
}

async function update(id, companyId, { name, description, portal }) {
  const rows = await db.query(
    `UPDATE roles
     SET name = @name, description = @description, portal = @portal
     WHERE id = @id AND company_id = @companyId
     RETURNING id, company_id, name, description, portal, created`,
    { id, companyId, name, description: description || null, portal }
  )
  return rows[0] || null
}

async function getByCompanyPage(companyId, { limit, offset, searchPattern }) {
  const rows = await db.query(
    `SELECT id, company_id, name, description, portal, created, COUNT(*) OVER() AS total_count
     FROM roles
     WHERE company_id = @companyId
       AND (@searchPattern::text IS NULL OR name ILIKE @searchPattern OR description ILIKE @searchPattern)
     ORDER BY name
     LIMIT @limit OFFSET @offset`,
    { companyId, limit, offset, searchPattern: searchPattern || null }
  )
  return extractPage(rows)
}

async function getByPortal(companyId, portal) {
  return db.query(
    `SELECT id, company_id, name, description, portal, created
     FROM roles
     WHERE company_id = @companyId AND portal = @portal
     ORDER BY name`,
    { companyId, portal }
  )
}

async function getByIds(ids, companyId) {
  if (!Array.isArray(ids) || ids.length === 0) return []
  return db.query(
    `SELECT id, portal FROM roles WHERE company_id = @companyId AND id = ANY(@ids)`,
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

async function countByCompany(companyId) {
  const rows = await db.query(`SELECT COUNT(*) AS count FROM roles WHERE company_id = @companyId`, { companyId })
  return Number(rows[0].count)
}

module.exports = {
  getByCompany, getByCompanyPage, getById, getByName, getByPortal, getByIds, create, update, remove, countByCompany,
}
