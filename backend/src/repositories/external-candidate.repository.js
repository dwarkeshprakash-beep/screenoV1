const db = require('../db/connection')

async function create(data) {
  const rows = await db.query(
    `INSERT INTO external_candidates (company_id, first_name, last_name, email, resume_url)
     VALUES (@company_id, @first_name, @last_name, @email, @resume_url)
     RETURNING *`,
    {
      company_id: data.company_id,
      first_name: data.first_name,
      last_name:  data.last_name  || '',
      email:      data.email,
      resume_url: data.resume_url || null,
    }
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

async function getByIdForCompany(id, companyId) {
  const rows = await db.query(
    `SELECT *
     FROM external_candidates
     WHERE id = @id
       AND company_id = @companyId`,
    { id, companyId }
  )
  return rows[0] || null
}

async function getByCompany(companyId) {
  return db.query(
    `SELECT ec.*,
            MAX(i.created) AS last_interview,
            COUNT(i.id)    AS interview_count
     FROM external_candidates ec
     LEFT JOIN interviews i ON i.external_candidate_id = ec.id
     WHERE ec.company_id = @companyId
     GROUP BY ec.id
     ORDER BY ec.first_name, ec.last_name`,
    { companyId }
  )
}

module.exports = { create, getById, getByIdForCompany, getByCompany }
