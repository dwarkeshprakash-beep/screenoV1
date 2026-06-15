// backend/src/repositories/user.repository.js
const db = require('../db/connection')

async function getByEmail(email) {
  const rows = await db.query(
    `SELECT id, company_id, first_name, last_name, email, password, role, resume_url, tags, availability
     FROM users
     WHERE email = @email`,
    { email }
  )
  return rows[0] || null
}

async function getById(id) {
  const rows = await db.query(
    `SELECT id, company_id, first_name, last_name, email, role, resume_url, tags, availability
     FROM users
     WHERE id = @id`,
    { id }
  )
  return rows[0] || null
}

async function updateProfile(id, { firstName, lastName, resumeUrl, tags, availability }) {
  const rows = await db.query(
    `UPDATE users
     SET
       first_name   = COALESCE(@first_name,   first_name),
       last_name    = COALESCE(@last_name,    last_name),
       resume_url   = COALESCE(@resume_url,   resume_url),
       tags         = COALESCE(@tags,         tags),
       availability = COALESCE(@availability, availability)
     WHERE id = @id
     RETURNING *`,
    {
      id,
      first_name:   firstName    || null,
      last_name:    lastName     || null,
      resume_url:   resumeUrl    || null,
      tags:         tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : null,
      availability: availability || null,
    }
  )
  return rows[0]
}

async function getByIdWithPassword(id) {
  const rows = await db.query(
    `SELECT * FROM users WHERE id = @id`,
    { id }
  )
  return rows[0] || null
}

async function updatePassword(id, passwordHash) {
  await db.query(
    `UPDATE users SET password = @password WHERE id = @id`,
    { id, password: passwordHash }
  )
}

async function getNotInTeam(companyId, managerId) {
  return db.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.role,
            u.emp_number AS employee_id, u.job_title AS current_position,
            u.location, d.name AS department
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.company_id = @companyId
       AND u.role != 'manager'
       AND NOT EXISTS (
         SELECT 1 FROM team_members tm
         WHERE tm.manager_id = @managerId
           AND tm.user_id = u.id
       )
     ORDER BY u.first_name`,
    { companyId, managerId }
  )
}

async function getByRole(companyId, role) {
  return db.query(
    `SELECT id, first_name, last_name, email, role
     FROM users
     WHERE company_id = @companyId
       AND role = @role
     ORDER BY first_name`,
    { companyId, role }
  )
}

async function getByCompany(companyId) {
  return db.query(
    `SELECT id, first_name, last_name, email, role
     FROM users
     WHERE company_id = @companyId
     ORDER BY first_name`,
    { companyId }
  )
}

async function getByIdForCompany(id, companyId) {
  const rows = await db.query(
    `SELECT id, company_id, first_name, last_name, email, role
     FROM users
     WHERE id = @id AND company_id = @companyId
     LIMIT 1`,
    { id, companyId }
  )
  return rows[0] || null
}

async function getByIdsForCompany(ids, companyId) {
  if (!Array.isArray(ids) || ids.length === 0) return []
  return db.query(
    `SELECT id, company_id, first_name, last_name, email, role
     FROM users
     WHERE company_id = @companyId
       AND id = ANY(@ids)
     ORDER BY first_name, last_name`,
    { ids, companyId }
  )
}

async function bulkUpsert(rows, companyId, managerId, tempPasswordHash) {
  let inserted = 0
  let updated = 0
  const errors = []

  for (const row of rows) {
    try {
      await db.transaction(async (tx) => {
        const matches = await tx.query(
          `SELECT id
           FROM users
           WHERE company_id = @companyId
             AND (
               LOWER(email) = LOWER(@email)
               OR (CAST(@empNumber AS text) IS NOT NULL AND emp_number = @empNumber)
             )
           ORDER BY CASE WHEN LOWER(email) = LOWER(@email) THEN 0 ELSE 1 END
           LIMIT 1`,
          { companyId, email: row.email, empNumber: row.empNumber || null }
        )

        let userId
        if (matches[0]) {
          userId = matches[0].id
          await tx.query(
            `UPDATE users SET
               first_name = @firstName,
               last_name = @lastName,
               email = @email,
               emp_number = COALESCE(@empNumber, emp_number),
               job_title = COALESCE(@jobTitle, job_title),
               location = COALESCE(@location, location)
             WHERE id = @userId`,
            {
              userId,
              firstName: row.firstName,
              lastName: row.lastName || '',
              email: row.email,
              empNumber: row.empNumber || null,
              jobTitle: row.jobTitle || null,
              location: row.location || null,
            }
          )
          updated += 1
        } else {
          const created = await tx.query(
            `INSERT INTO users
               (company_id, first_name, last_name, email, emp_number, job_title, location, password, role)
             VALUES
               (@companyId, @firstName, @lastName, @email, @empNumber, @jobTitle, @location, @password, 'employee')
             RETURNING id`,
            {
              companyId,
              firstName: row.firstName,
              lastName: row.lastName || '',
              email: row.email,
              empNumber: row.empNumber || null,
              jobTitle: row.jobTitle || null,
              location: row.location || null,
              password: tempPasswordHash,
            }
          )
          userId = created[0].id
          inserted += 1
        }

        await tx.query(
          `INSERT INTO team_members (manager_id, user_id)
           VALUES (@managerId, @userId)
           ON CONFLICT (manager_id, user_id) DO NOTHING`,
          { managerId, userId }
        )
      })
    } catch (err) {
      errors.push(`${row.email}: ${err.message}`)
    }
  }
  return { inserted, updated, errors }
}

async function getByEmailForCompany(email, companyId) {
  const rows = await db.query(
    `SELECT id, company_id, first_name, last_name, email, role
     FROM users
     WHERE email = @email AND company_id = @companyId
     LIMIT 1`,
    { email, companyId }
  )
  return rows[0] || null
}

async function updateOrgProfile(
  userId,
  { email, empNumber, jobTitle, location, department, companyId } = {}
) {
  if (!companyId) throw new Error('Company ID is required')
  return db.transaction(async (tx) => {
    let departmentId = null
    const departmentName = String(department || '').trim()
    if (departmentName) {
      const existing = await tx.query(
        `SELECT id FROM departments WHERE LOWER(name) = LOWER(@name) LIMIT 1`,
        { name: departmentName }
      )
      if (existing[0]) {
        departmentId = existing[0].id
      } else {
        const created = await tx.query(
          `INSERT INTO departments (name) VALUES (@name) RETURNING id`,
          { name: departmentName }
        )
        departmentId = created[0].id
      }
    }

    const rows = await tx.query(
      `UPDATE users SET
         email         = COALESCE(@email,         email),
         emp_number    = COALESCE(@emp_number,    emp_number),
         job_title     = COALESCE(@job_title,     job_title),
         location      = COALESCE(@location,      location),
         department_id = COALESCE(@department_id, department_id)
       WHERE id = @id
         AND company_id = @company_id
       RETURNING *`,
      {
        id: userId,
        email: email || null,
        emp_number: empNumber || null,
        job_title: jobTitle || null,
        location: location || null,
        department_id: departmentId,
        company_id: companyId,
      }
    )
    return rows[0] || null
  })
}

async function createMinimal(companyId, { firstName, lastName, email, passwordHash }) {
  const rows = await db.query(
    `INSERT INTO users (company_id, first_name, last_name, email, password, role)
     VALUES (@company_id, @first_name, @last_name, @email, @password, 'employee')
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    {
      company_id: companyId,
      first_name: firstName || email.split('@')[0],
      last_name:  lastName  || '',
      email,
      password:   passwordHash,
    }
  )
  return rows[0] || null
}

module.exports = {
  getByEmail, getByEmailForCompany, getById, getByIdWithPassword, getNotInTeam,
  getByRole, getByCompany, getByIdForCompany, getByIdsForCompany,
  updateProfile, updatePassword, updateOrgProfile,
  bulkUpsert, createMinimal,
}
