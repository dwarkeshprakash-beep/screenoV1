const db = require('../db/connection')

async function getById(id) {
  const rows = await db.query(`SELECT * FROM companies WHERE id = @id`, { id })
  return rows[0] || null
}

module.exports = { getById }
