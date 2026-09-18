// backend/src/repositories/user-role.repository.js
// SQL only — user_roles join table (user <-> role, many-to-many). See docs/rbac-multi-tenant-plan.md.

const db = require('../db/connection')

async function getRolesForUser(userId) {
  return db.query(
    `SELECT r.id, r.name
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = @userId
     ORDER BY r.name`,
    { userId }
  )
}

async function getRolesForCompanyUsers(companyId) {
  return db.query(
    `SELECT ur.user_id, r.id AS role_id, r.name AS role_name
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE r.company_id = @companyId`,
    { companyId }
  )
}

async function replaceForUser(userId, roleIds) {
  await db.transaction(async (tx) => {
    await tx.query(`DELETE FROM user_roles WHERE user_id = @userId`, { userId })
    for (const roleId of roleIds) {
      await tx.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES (@userId, @roleId)`,
        { userId, roleId }
      )
    }
  })
}

module.exports = { getRolesForUser, getRolesForCompanyUsers, replaceForUser }
