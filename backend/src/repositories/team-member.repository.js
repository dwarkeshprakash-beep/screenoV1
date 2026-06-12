// backend/src/repositories/team-member.repository.js
const db = require('../db/connection')

const SELECT_COLS = `
  tm.id, tm.manager_id, tm.user_id, tm.created,
  u.company_id,
  u.first_name, u.last_name, u.email,
  u.emp_number     AS employee_id,
  u.job_title      AS current_position,
  u.location,
  u.availability,
  u.tags,
  d.name           AS department,
  u.resume_url,
  u.resume_updated,
  (SELECT MAX(ended_at) FROM interviews i WHERE i.internal_user_id = u.id) AS last_assessed`

const JOIN_PROFILE = `
  JOIN users u ON u.id = tm.user_id
  LEFT JOIN departments d ON d.id = u.department_id`

async function getByManager(managerId, filter = 'all') {
  let filterSql = ''
  if (filter === 'never')   filterSql = 'AND (SELECT MAX(ended_at) FROM interviews i WHERE i.internal_user_id = u.id) IS NULL'
  if (filter === 'overdue') filterSql = "AND (SELECT MAX(ended_at) FROM interviews i WHERE i.internal_user_id = u.id) < NOW() - INTERVAL '30 days'"

  return db.query(
    `SELECT ${SELECT_COLS}
     FROM team_members tm ${JOIN_PROFILE}
     WHERE tm.manager_id = @managerId
       ${filterSql}
     ORDER BY u.first_name, u.last_name`,
    { managerId }
  )
}

async function getByIdForManager(id, managerId) {
  const rows = await db.query(
    `SELECT ${SELECT_COLS}
     FROM team_members tm ${JOIN_PROFILE}
     WHERE tm.id = @id AND tm.manager_id = @managerId`,
    { id, managerId }
  )
  return rows[0] || null
}

async function create(data) {
  const rows = await db.query(
    `INSERT INTO team_members (manager_id, user_id)
     VALUES (@manager_id, @user_id)
     ON CONFLICT (manager_id, user_id) DO NOTHING
     RETURNING *`,
    {
      manager_id: data.managerId,
      user_id:    data.userId,
    }
  )
  if (rows.length > 0) return rows[0]
  const existing = await db.query(
    `SELECT * FROM team_members
     WHERE manager_id = @manager_id AND user_id = @user_id`,
    { manager_id: data.managerId, user_id: data.userId }
  )
  return existing[0] || null
}

async function removeMember(id, managerId) {
  await db.query(
    `DELETE FROM team_members
     WHERE id = @id AND manager_id = @managerId`,
    { id, managerId }
  )
}

module.exports = { getByManager, getByIdForManager, create, removeMember }
