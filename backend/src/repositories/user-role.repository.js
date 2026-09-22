// backend/src/repositories/user-role.repository.js
// SQL only - user_roles join table (user <-> role, many-to-many). See docs/rbac-multi-tenant-plan.md.

const db = require('../db/connection')
const { extractPage } = require('../utils/pagination')

async function getRolesForUser(userId) {
  return db.query(
    `SELECT r.id, r.name, r.portal
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
    if (!roleIds || roleIds.length === 0) return
    await tx.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT @userId, role_id FROM unnest(@roleIds::int[]) AS role_id`,
      { userId, roleIds }
    )
  })
}

async function getUsersForRole(roleId, { limit, offset }) {
  const rows = await db.query(
    `SELECT u.id, u.first_name, u.last_name, u.email,
            COUNT(*) OVER() AS total_count
     FROM user_roles ur
     JOIN users u ON u.id = ur.user_id
     WHERE ur.role_id = @roleId
     ORDER BY u.first_name, u.last_name
     LIMIT @limit OFFSET @offset`,
    { roleId, limit, offset }
  )
  return extractPage(rows)
}

async function existsForRole(roleId) {
  const rows = await db.query(
    `SELECT user_id FROM user_roles WHERE role_id = @roleId LIMIT 1`,
    { roleId }
  )
  return rows.length > 0
}

module.exports = { getRolesForUser, getRolesForCompanyUsers, replaceForUser, getUsersForRole, existsForRole }
