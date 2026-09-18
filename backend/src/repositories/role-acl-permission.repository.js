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

async function existsForPermission(permissionId) {
  const rows = await db.query(
    `SELECT id FROM role_acl_permissions WHERE permission_id = @permissionId LIMIT 1`,
    { permissionId }
  )
  return rows.length > 0
}

module.exports = { getGrantsForAcl, replaceGrantsForAcl, existsForPermission }
