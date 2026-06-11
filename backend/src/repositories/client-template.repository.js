// backend/src/repositories/client-template.repository.js
const db = require('../db/connection')

async function create(data) {
  const rows = await db.query(
    `INSERT INTO client_templates 
      (manager_id, client_name, client_email, headcount, requirements, jd_text, custom_info, tags)
     VALUES 
      (@manager_id, @client_name, @client_email, @headcount, @requirements, @jd_text, @custom_info, @tags)
     RETURNING *`,
    {
      manager_id: data.manager_id,
      client_name: data.client_name,
      client_email: data.client_email || null,
      headcount: data.headcount || 1,
      requirements: data.requirements || '',
      jd_text: data.jd_text || '',
      custom_info: data.custom_info || '',
      tags: JSON.stringify(data.tags || [])
    }
  )
  return rows[0]
}

async function getByManager(managerId) {
  return db.query(
    `SELECT * FROM client_templates WHERE manager_id = @managerId ORDER BY created DESC`,
    { managerId }
  )
}

async function getById(id, managerId) {
  const rows = await db.query(
    `SELECT * FROM client_templates WHERE id = @id AND manager_id = @managerId`,
    { id, managerId }
  )
  return rows[0] || null
}

async function update(id, managerId, data) {
  const rows = await db.query(
    `UPDATE client_templates 
     SET client_name = COALESCE(@client_name, client_name),
         client_email = COALESCE(@client_email, client_email),
         headcount = COALESCE(@headcount, headcount),
         requirements = COALESCE(@requirements, requirements),
         jd_text = COALESCE(@jd_text, jd_text),
         custom_info = COALESCE(@custom_info, custom_info),
         tags = COALESCE(@tags, tags)
     WHERE id = @id AND manager_id = @managerId
     RETURNING *`,
    {
      id,
      managerId,
      client_name: data.client_name,
      client_email: data.client_email,
      headcount: data.headcount,
      requirements: data.requirements,
      jd_text: data.jd_text,
      custom_info: data.custom_info,
      tags: data.tags ? JSON.stringify(data.tags) : null
    }
  )
  return rows[0]
}

module.exports = { create, getByManager, getById, update }
