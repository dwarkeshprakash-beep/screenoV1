// backend/src/repositories/acl.repository.js
// SQL only - acls table, scoped by company_id, each row 1:1 with a module.
// See docs/rbac-multi-tenant-plan.md.

const db = require('../db/connection')
const { extractPage } = require('../utils/pagination')

async function getByCompany(companyId) {
  return db.query(
    `SELECT a.id, a.company_id, a.module_id, a.name, a.description, a.created,
            m.name AS module_name, m.key AS module_key
     FROM acls a
     JOIN modules m ON m.id = a.module_id
     WHERE a.company_id = @companyId
     ORDER BY m.sort_order`,
    { companyId }
  )
}

async function getByCompanyPage(companyId, { limit, offset, searchPattern }) {
  const rows = await db.query(
    `SELECT a.id, a.company_id, a.module_id, a.name, a.description, a.created,
            m.name AS module_name, m.key AS module_key, COUNT(*) OVER() AS total_count
     FROM acls a
     JOIN modules m ON m.id = a.module_id
     WHERE a.company_id = @companyId
       AND (@searchPattern::text IS NULL OR a.name ILIKE @searchPattern OR a.description ILIKE @searchPattern OR m.name ILIKE @searchPattern)
     ORDER BY m.sort_order
     LIMIT @limit OFFSET @offset`,
    { companyId, limit, offset, searchPattern: searchPattern || null }
  )
  return extractPage(rows)
}

async function getById(id, companyId) {
  const rows = await db.query(
    `SELECT a.id, a.company_id, a.module_id, a.name, a.description, a.created,
            m.name AS module_name, m.key AS module_key
     FROM acls a
     JOIN modules m ON m.id = a.module_id
     WHERE a.id = @id AND a.company_id = @companyId`,
    { id, companyId }
  )
  return rows[0] || null
}

async function getByModule(companyId, moduleId) {
  const rows = await db.query(
    `SELECT id FROM acls WHERE company_id = @companyId AND module_id = @moduleId`,
    { companyId, moduleId }
  )
  return rows[0] || null
}

async function getByName(companyId, name) {
  const rows = await db.query(
    `SELECT id FROM acls WHERE company_id = @companyId AND LOWER(name) = LOWER(@name)`,
    { companyId, name }
  )
  return rows[0] || null
}

async function create(companyId, { moduleId, name, description }) {
  const rows = await db.query(
    `INSERT INTO acls (company_id, module_id, name, description)
     VALUES (@companyId, @moduleId, @name, @description)
     RETURNING id, company_id, module_id, name, description, created`,
    { companyId, moduleId, name, description: description || null }
  )
  return rows[0]
}

async function update(id, companyId, { name, description }) {
  const rows = await db.query(
    `UPDATE acls
     SET name = @name, description = @description
     WHERE id = @id AND company_id = @companyId
     RETURNING id, company_id, module_id, name, description, created`,
    { id, companyId, name, description: description || null }
  )
  return rows[0] || null
}

async function remove(id, companyId) {
  const rows = await db.query(
    `DELETE FROM acls WHERE id = @id AND company_id = @companyId RETURNING id`,
    { id, companyId }
  )
  return rows.length > 0
}

async function countByCompany(companyId) {
  const rows = await db.query(`SELECT COUNT(*) AS count FROM acls WHERE company_id = @companyId`, { companyId })
  return Number(rows[0].count)
}

module.exports = {
  getByCompany, getByCompanyPage, getById, getByModule, getByName, create, update, remove,
  countByCompany,
}
