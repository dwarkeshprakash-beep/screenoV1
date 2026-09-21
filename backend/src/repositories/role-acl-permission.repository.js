// backend/src/repositories/role-acl-permission.repository.js
// SQL only - role_acl_permissions table (role <-> acl grants, one row per granted
// permission_id). See docs/rbac-multi-tenant-plan.md.

const db = require('../db/connection')

async function getGrantsForAcl(aclId) {
  return db.query(
    `SELECT role_id, permission_id FROM role_acl_permissions WHERE acl_id = @aclId`,
    { aclId }
  )
}

// grants: [{ roleId, permissionIds: [1, 2, ...] }] - replaces the ACL's entire
// grant set in one transaction (same delete-then-reinsert pattern as
// user-role.repository.js's replaceForUser).
async function replaceGrantsForAcl(companyId, aclId, grants) {
  await db.transaction(async (tx) => {
    await tx.query(`DELETE FROM role_acl_permissions WHERE acl_id = @aclId`, { aclId })
    for (const { roleId, permissionIds } of grants) {
      for (const permissionId of permissionIds) {
        await tx.query(
          `INSERT INTO role_acl_permissions (company_id, role_id, acl_id, permission_id)
           VALUES (@companyId, @roleId, @aclId, @permissionId)`,
          { companyId, roleId, aclId, permissionId }
        )
      }
    }
  })
}

// How many distinct roles each permission is currently granted to, across every
// company - feeds the "granted to N roles" count on the global Permissions catalog.
async function countRolesByPermission() {
  return db.query(
    `SELECT permission_id, COUNT(DISTINCT role_id) AS role_count
     FROM role_acl_permissions
     GROUP BY permission_id`
  )
}

// Every role (with its organization) this permission is currently granted to,
// across every company - feeds the Permission detail page. DISTINCT because a
// permission can be granted to the same role on more than one ACL.
async function getRoleGrantsForPermission(permissionId) {
  return db.query(
    `SELECT DISTINCT r.id AS role_id, r.name AS role_name, c.id AS company_id, c.name AS company_name
     FROM role_acl_permissions rap
     JOIN roles r ON r.id = rap.role_id
     JOIN companies c ON c.id = r.company_id
     WHERE rap.permission_id = @permissionId
     ORDER BY c.name, r.name`,
    { permissionId }
  )
}

async function existsForPermission(permissionId) {
  const rows = await db.query(
    `SELECT id FROM role_acl_permissions WHERE permission_id = @permissionId LIMIT 1`,
    { permissionId }
  )
  return rows.length > 0
}

// Effective grants for a set of roles, joined out to the ACL/module/permission
// names a user detail page needs to display "what can this user do." Grouping
// by ACL is left to the caller.
async function getGrantsForRoles(roleIds) {
  if (!Array.isArray(roleIds) || roleIds.length === 0) return []
  return db.query(
    `SELECT rap.role_id, a.id AS acl_id, a.name AS acl_name, m.name AS module_name,
            p.id AS permission_id, p.name AS permission_name
     FROM role_acl_permissions rap
     JOIN acls a ON a.id = rap.acl_id
     JOIN modules m ON m.id = a.module_id
     JOIN permissions p ON p.id = rap.permission_id
     WHERE rap.role_id = ANY(@roleIds)
     ORDER BY m.sort_order, a.name, p.name`,
    { roleIds }
  )
}

async function existsForRole(roleId) {
  const rows = await db.query(
    `SELECT id FROM role_acl_permissions WHERE role_id = @roleId LIMIT 1`,
    { roleId }
  )
  return rows.length > 0
}

module.exports = {
  getGrantsForAcl, replaceGrantsForAcl, existsForPermission, existsForRole,
  getGrantsForRoles, countRolesByPermission, getRoleGrantsForPermission,
}
