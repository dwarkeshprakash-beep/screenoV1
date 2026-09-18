const db = require('../db/connection')

async function getById(id) {
  const rows = await db.query(`SELECT * FROM companies WHERE id = @id`, { id })
  return rows[0] || null
}

async function getAll() {
  return db.query(`SELECT id, name FROM companies ORDER BY name`)
}

async function getByPage({ limit, offset, searchPattern }) {
  const rows = await db.query(
    `SELECT id, name, logo_url, created, COUNT(*) OVER() AS total_count
     FROM companies
     WHERE (@searchPattern::text IS NULL OR name ILIKE @searchPattern)
     ORDER BY name
     LIMIT @limit OFFSET @offset`,
    { limit, offset, searchPattern: searchPattern || null }
  )
  const total = rows[0] ? Number(rows[0].total_count) : 0
  return { rows: rows.map(({ total_count, ...rest }) => rest), total }
}

async function getByName(name) {
  const rows = await db.query(`SELECT id FROM companies WHERE LOWER(name) = LOWER(@name)`, { name })
  return rows[0] || null
}

async function create({ name, logoUrl }) {
  const rows = await db.query(
    `INSERT INTO companies (name, logo_url) VALUES (@name, @logoUrl) RETURNING id, name, logo_url, created`,
    { name, logoUrl: logoUrl || null }
  )
  return rows[0]
}

async function update(id, { name, logoUrl }) {
  const rows = await db.query(
    `UPDATE companies SET name = @name, logo_url = @logoUrl WHERE id = @id RETURNING id, name, logo_url, created`,
    { id, name, logoUrl: logoUrl || null }
  )
  return rows[0] || null
}

async function remove(id) {
  const rows = await db.query(`DELETE FROM companies WHERE id = @id RETURNING id`, { id })
  return rows.length > 0
}

async function hasUsers(id) {
  const rows = await db.query(`SELECT id FROM users WHERE company_id = @id LIMIT 1`, { id })
  return rows.length > 0
}

module.exports = { getById, getAll, getByPage, getByName, create, update, remove, hasUsers }
