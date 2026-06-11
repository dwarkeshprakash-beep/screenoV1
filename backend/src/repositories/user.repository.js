// backend/src/repositories/user.repository.js
const db = require('../db/connection')

async function getByEmail(email) {
  const rows = await db.query(
    `SELECT id, company_id, first_name, last_name, email, password, role, resume_url, tags
     FROM users
     WHERE email = @email`,
    { email }
  )
  return rows[0] || null
}

async function getById(id) {
  const rows = await db.query(
    `SELECT id, company_id, first_name, last_name, email, role, resume_url, tags
     FROM users
     WHERE id = @id`,
    { id }
  )
  return rows[0] || null
}

async function updateProfile(id, { firstName, lastName, resumeUrl, tags }) {
  const rows = await db.query(
    `UPDATE users
     SET
       first_name = COALESCE(@first_name, first_name),
       last_name  = COALESCE(@last_name,  last_name),
       resume_url = COALESCE(@resume_url, resume_url),
       tags       = COALESCE(@tags,       tags)
     WHERE id = @id
     RETURNING *`,
    { id, first_name: firstName || null, last_name: lastName || null, resume_url: resumeUrl || null, tags: tags ? JSON.stringify(tags) : null }
  )
  return rows[0]
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

async function bulkUpsert(rows, companyId, tempPasswordHash) {
  let inserted = 0
  let updated = 0
  const errors = []

  for (const row of rows) {
    try {
      let existing = null
      const byEmail = await db.query(
        `SELECT id FROM users WHERE company_id = @company_id AND email = @email LIMIT 1`,
        { company_id: companyId, email: row.email }
      )
      if (byEmail.length > 0) existing = byEmail[0]

      if (!existing && row.empNumber) {
        const byEmp = await db.query(
          `SELECT id FROM users WHERE company_id = @company_id AND emp_number = @emp_number LIMIT 1`,
          { company_id: companyId, emp_number: row.empNumber }
        )
        if (byEmp.length > 0) existing = byEmp[0]
      }

      if (existing) {
        await db.query(
          `UPDATE users SET
             first_name    = COALESCE(@first_name,    first_name),
             last_name     = COALESCE(@last_name,     last_name),
             email         = COALESCE(@email,         email),
             emp_number    = COALESCE(@emp_number,    emp_number),
             department_id = COALESCE(@department_id, department_id),
             job_title     = COALESCE(@job_title,     job_title),
             location      = COALESCE(@location,      location)
           WHERE id = @id`,
          {
            id:            existing.id,
            first_name:    row.firstName    || null,
            last_name:     row.lastName     || null,
            email:         row.email        || null,
            emp_number:    row.empNumber    || null,
            department_id: row.departmentId ? parseInt(row.departmentId, 10) : null,
            job_title:     row.jobTitle     || null,
            location:      row.location     || null,
          }
        )
        updated++
      } else {
        await db.query(
          `INSERT INTO users
             (company_id, first_name, last_name, email, emp_number, department_id, job_title, location, password, role)
           VALUES
             (@company_id, @first_name, @last_name, @email, @emp_number, @department_id, @job_title, @location, @password, 'employee')
           ON CONFLICT (email) DO NOTHING`,
          {
            company_id:    companyId,
            first_name:    row.firstName,
            last_name:     row.lastName     || '',
            email:         row.email,
            emp_number:    row.empNumber    || null,
            department_id: row.departmentId ? parseInt(row.departmentId, 10) : null,
            job_title:     row.jobTitle     || null,
            location:      row.location     || null,
            password:      tempPasswordHash,
          }
        )
        inserted++
      }
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

async function updateOrgProfile(userId, { empNumber, jobTitle, location } = {}) {
  await db.query(
    `UPDATE users SET
       emp_number = COALESCE(@emp_number, emp_number),
       job_title  = COALESCE(@job_title,  job_title),
       location   = COALESCE(@location,   location)
     WHERE id = @id`,
    { id: userId, emp_number: empNumber || null, job_title: jobTitle || null, location: location || null }
  )
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
  getByEmail, getByEmailForCompany, getById, getNotInTeam,
  getByRole, getByCompany, updateProfile, updatePassword, updateOrgProfile,
  bulkUpsert, createMinimal,
}
