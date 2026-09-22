// backend/src/repositories/acl.repository.js
// SQL only - acls table, scoped by company_id. An ACL may or may not have a module
// yet - it's created bare and linked to a module afterward from the Modules screen
// (see module.service.js#assignAcl). The ACL list itself doesn't show module info
// (see AclsTable.jsx), so getByCompany/getByCompanyPage don't join modules - only
// getById does, for the ACL detail page.
// See docs/rbac-multi-tenant-plan.md.

const db = require('../db/connection')
const { extractPage } = require('../utils/pagination')

async function getByCompany(companyId) {
  return db.query(
    `SELECT id, company_id, module_id, name, description, created
     FROM acls
     WHERE company_id = @companyId
     ORDER BY name`,
    { companyId }
  )
}

async function getByCompanyPage(companyId, { limit, offset, searchPattern }) {
  const rows = await db.query(
    `SELECT id, company_id, module_id, name, description, created, COUNT(*) OVER() AS total_count
     FROM acls
     WHERE company_id = @companyId
       AND (@searchPattern::text IS NULL OR name ILIKE @searchPattern OR description ILIKE @searchPattern)
     ORDER BY name
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
     LEFT JOIN modules m ON m.id = a.module_id
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

async function getUnassigned(companyId) {
  return db.query(
    `SELECT id, company_id, name, description, created
     FROM acls
     WHERE company_id = @companyId AND module_id IS NULL
     ORDER BY name`,
    { companyId }
  )
}

async function create(companyId, { name, description }) {
  const rows = await db.query(
    `INSERT INTO acls (company_id, name, description)
     VALUES (@companyId, @name, @description)
     RETURNING id, company_id, module_id, name, description, created`,
    { companyId, name, description: description || null }
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

async function assignModule(id, companyId, moduleId) {
  const rows = await db.query(
    `UPDATE acls
     SET module_id = @moduleId
     WHERE id = @id AND company_id = @companyId
     RETURNING id, company_id, module_id, name, description, created`,
    { id, companyId, moduleId }
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
  getByCompany, getByCompanyPage, getById, getByModule, getByName, getUnassigned,
  create, update, assignModule, remove, countByCompany,
}
