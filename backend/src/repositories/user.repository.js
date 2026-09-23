// backend/src/repositories/user.repository.js
const db = require('../db/connection')
const { extractPage } = require('../utils/pagination')

async function getByEmail(email) {
  const rows = await db.query(
    `SELECT id, company_id, first_name, last_name, email, password, is_platform_admin,
            resume_url, resume_text, tags, availability
     FROM users
     WHERE email = @email`,
    { email }
  )
  return rows[0] || null
}

async function getById(id) {
  const rows = await db.query(
    `SELECT u.id, u.company_id, u.first_name, u.last_name, u.email, u.is_platform_admin,
            u.resume_url, u.resume_text, u.tags, u.availability, u.current_resume_asset_id,
            ra.original_filename as resume_filename, ra.size as resume_size, ra.mime_type as resume_mime_type, ra.created_at as resume_uploaded_at
     FROM users u
     LEFT JOIN resume_assets ra ON ra.id = u.current_resume_asset_id AND ra.deleted_at IS NULL
     WHERE u.id = @id`,
    { id }
  )
  return rows[0] || null
}

// Minimal fields the access resolver needs on every request - kept separate from
// getById() so authorization lookups don't drag in resume/profile fields.
async function getAuthProfile(id) {
  const rows = await db.query(
    `SELECT id, company_id, is_platform_admin FROM users WHERE id = @id`,
    { id }
  )
  return rows[0] || null
}

async function updateProfile(id, {
  firstName,
  lastName,
  resumeUrl,
  resumeText,
  tags,
  availability,
  currentResumeAssetId,
}) {
  const rows = await db.query(
    `UPDATE users
     SET
       first_name   = COALESCE(@first_name,   first_name),
       last_name    = COALESCE(@last_name,    last_name),
       resume_url   = COALESCE(@resume_url,   resume_url),
       resume_text  = COALESCE(@resume_text,  resume_text),
       tags         = COALESCE(@tags,         tags),
       availability = COALESCE(@availability, availability),
       current_resume_asset_id = COALESCE(@current_resume_asset_id, current_resume_asset_id)
     WHERE id = @id
     RETURNING *`,
    {
      id,
      first_name:   firstName    || null,
      last_name:    lastName     || null,
      resume_url:   resumeUrl    || null,
      resume_text:  resumeText ? String(resumeText).slice(0, 12000) : null,
      tags:         tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : null,
      availability: availability || null,
      current_resume_asset_id: currentResumeAssetId || null,
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
    `SELECT u.id, u.first_name, u.last_name, u.email,
            u.emp_number AS employee_id, u.job_title AS current_position,
            u.location, d.name AS department
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.company_id = @companyId
       AND NOT EXISTS (
         -- "Manager-like" now means the user's role can manage the team module,
         -- not a fixed portal - see docs/rbac-multi-tenant-plan.md.
         SELECT 1 FROM user_roles ur
         JOIN role_acl_permissions rap ON rap.role_id = ur.role_id
         JOIN acls a ON a.id = rap.acl_id
         JOIN modules m ON m.id = a.module_id AND m.key = 'team'
         JOIN permissions p ON p.id = rap.permission_id AND p.name = 'Save'
         WHERE ur.user_id = u.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM team_members tm
         WHERE tm.manager_id = @managerId
           AND tm.user_id = u.id
       )
     ORDER BY u.first_name`,
    { companyId, managerId }
  )
}

// Company members holding at least one of the given permissions on a module -
// replaces the old getByPortal(companyId, 'manager'|'bde') now that "manager"/"bde"
// aren't fixed portals, just whatever permission a role's ACL grants on a module. Same
// user_roles -> role_acl_permissions -> acls -> modules/permissions join pattern as
// getNotInTeam() above, generalized to any module/permission set. Pass a single name
// or an array (e.g. ['View', 'View All'] so a View-All-only holder isn't missed).
async function getByModulePermission(companyId, moduleKey, permissionNames) {
  const names = Array.isArray(permissionNames) ? permissionNames : [permissionNames]
  return db.query(
    `SELECT DISTINCT u.id, u.first_name, u.last_name, u.email
     FROM users u
     WHERE u.company_id = @companyId
       AND EXISTS (
         SELECT 1 FROM user_roles ur
         JOIN role_acl_permissions rap ON rap.role_id = ur.role_id
         JOIN acls a ON a.id = rap.acl_id
         JOIN modules m ON m.id = a.module_id AND m.key = @moduleKey
         JOIN permissions p ON p.id = rap.permission_id AND p.name = ANY(@names)
         WHERE ur.user_id = u.id
       )
     ORDER BY u.first_name, u.last_name`,
    { companyId, moduleKey, names }
  )
}

async function getByCompany(companyId) {
  return db.query(
    `SELECT u.id, u.company_id, u.first_name, u.last_name, u.email, u.created,
            u.emp_number AS employee_id, u.job_title AS current_position,
            u.location, u.availability, u.tags, u.resume_url, u.resume_text, u.resume_updated,
            d.name AS department
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.company_id = @companyId
     ORDER BY u.first_name, u.last_name`,
    { companyId }
  )
}

async function getByCompanyPage(companyId, { limit, offset, searchPattern }) {
  const rows = await db.query(
    `SELECT u.id, u.company_id, u.first_name, u.last_name, u.email, u.created,
            u.emp_number AS employee_id, u.job_title AS current_position,
            u.location, u.availability, u.tags, u.resume_url, u.resume_text, u.resume_updated,
            d.name AS department,
            COUNT(*) OVER() AS total_count
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.company_id = @companyId
       AND (
         @searchPattern::text IS NULL
         OR u.first_name ILIKE @searchPattern
         OR u.last_name ILIKE @searchPattern
         OR u.email ILIKE @searchPattern
       )
     ORDER BY u.first_name, u.last_name
     LIMIT @limit OFFSET @offset`,
    { companyId, limit, offset, searchPattern: searchPattern || null }
  )
  return extractPage(rows)
}

async function updateBasicInfo(id, companyId, { firstName, lastName, email }) {
  const rows = await db.query(
    `UPDATE users
     SET first_name = @first_name, last_name = @last_name, email = @email
     WHERE id = @id AND company_id = @company_id
     RETURNING id, company_id, first_name, last_name, email, created`,
    { id, company_id: companyId, first_name: firstName, last_name: lastName, email }
  )
  return rows[0] || null
}

async function remove(id, companyId) {
  const rows = await db.query(
    `DELETE FROM users WHERE id = @id AND company_id = @companyId RETURNING id`,
    { id, companyId }
  )
  return rows.length > 0
}

async function hasBlockingReferences(id) {
  const rows = await db.query(
    `SELECT
       EXISTS(SELECT 1 FROM interviews WHERE manager_id = @id OR internal_user_id = @id) AS has_interview,
       EXISTS(SELECT 1 FROM client_templates WHERE manager_id = @id OR created_by_user_id = @id OR assigned_bde_id = @id) AS has_mandate,
       EXISTS(SELECT 1 FROM client_teams WHERE user_id = @id) AS has_mandate_candidate`,
    { id }
  )
  const row = rows[0] || {}
  return Boolean(row.has_interview || row.has_mandate || row.has_mandate_candidate)
}

async function getByIdForCompany(id, companyId) {
  const rows = await db.query(
    `SELECT id, company_id, first_name, last_name, email
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
    `SELECT u.id, u.company_id, u.first_name, u.last_name, u.email,
            u.emp_number AS employee_id, u.job_title AS current_position,
            u.location, u.availability, u.tags, u.resume_url, u.resume_text, u.resume_updated,
            d.name AS department
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.company_id = @companyId
       AND u.id = ANY(@ids)
     ORDER BY u.first_name, u.last_name`,
    { ids, companyId }
  )
}

async function bulkUpsert(rows, companyId, managerId, tempPasswordHash, candidateRoleId) {
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
               (company_id, first_name, last_name, email, emp_number, job_title, location, password)
             VALUES
               (@companyId, @firstName, @lastName, @email, @empNumber, @jobTitle, @location, @password)
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

          // New user has no role yet - without one, access.service.js resolves no
          // portal and they can never log in (see team.service.js#importFromCSV).
          await tx.query(
            `INSERT INTO user_roles (user_id, role_id) VALUES (@userId, @roleId)`,
            { userId, roleId: candidateRoleId }
          )
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
    `SELECT id, company_id, first_name, last_name, email
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
    `INSERT INTO users (company_id, first_name, last_name, email, password)
     VALUES (@company_id, @first_name, @last_name, @email, @password)
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

async function countByCompany(companyId) {
  const rows = await db.query(`SELECT COUNT(*) AS count FROM users WHERE company_id = @companyId`, { companyId })
  return Number(rows[0].count)
}

async function getOrganizationMemberProfile(userId, companyId) {
  const rows = await db.query(
    `SELECT u.id, u.company_id, u.first_name, u.last_name, u.email, u.created,
            u.emp_number AS employee_id, u.job_title AS current_position,
            u.location, u.availability, u.tags, u.resume_url, u.resume_text, u.resume_updated,
            u.current_resume_asset_id, d.name AS department
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.id = @userId AND u.company_id = @companyId
     LIMIT 1`,
    { userId, companyId }
  )
  return rows[0] || null
}

module.exports = {
  getByEmail, getByEmailForCompany, getById, getAuthProfile, getByIdWithPassword, getNotInTeam,
  getByCompany, getByCompanyPage, getByIdForCompany, getByIdsForCompany, getByModulePermission,
  updateProfile, updatePassword, updateOrgProfile, updateBasicInfo, remove, hasBlockingReferences,
  bulkUpsert, createMinimal, getOrganizationMemberProfile, countByCompany
}
