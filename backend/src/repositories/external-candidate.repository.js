const db = require('../db/connection')

async function create(data) {
  const rows = await db.query(
    `INSERT INTO external_candidates (company_id, first_name, last_name, email, resume_url)
     VALUES (@company_id, @first_name, @last_name, @email, @resume_url)
     RETURNING *`,
    data
  )
  return rows[0]
}

async function getById(id) {
  const rows = await db.query(
    `SELECT * FROM external_candidates WHERE id = @id`,
    { id }
  )
  return rows[0] || null
}

module.exports = { create, getById }
