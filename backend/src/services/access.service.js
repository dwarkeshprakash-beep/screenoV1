// backend/src/services/access.service.js
// The single source of truth for "what can this user do" - resolved fresh from the
// RBAC tables on every call (never cached in a JWT claim) so a permission change or
// revocation takes effect on the user's very next request. There is no portal concept -
// every non-admin user sees exactly the modules/permissions their roles' ACL grants
// give them. See docs/rbac-multi-tenant-plan.md.

const userRepository = require('../repositories/user.repository')
const userRoleRepository = require('../repositories/user-role.repository')
const roleAclPermissionRepository = require('../repositories/role-acl-permission.repository')

function buildModuleAccess(grants) {
  const moduleAccess = {}
  for (const grant of grants) {
    if (!moduleAccess[grant.module_key]) moduleAccess[grant.module_key] = new Set()
    moduleAccess[grant.module_key].add(grant.permission_name)
  }
  return moduleAccess
}

// { isPlatformAdmin, companyId, roleIds, moduleAccess: { [moduleKey]: Set<permissionName> } }
// preloadedUser: pass an already-fetched user row (must include id, company_id,
// is_platform_admin) to skip the redundant lookup - auth.service.js's login/refresh
// already has the user loaded for password verification, so resolving access for
// that same user shouldn't re-query it a second time.
async function getUserAccessContext(userId, preloadedUser) {
  const user = preloadedUser && preloadedUser.id === userId
    ? preloadedUser
    : await userRepository.getAuthProfile(userId)
  if (!user) throw new Error('User not found')

  const roles = await userRoleRepository.getRolesForUser(userId)
  const roleIds = roles.map(role => role.id)
  const grants = roleIds.length > 0 ? await roleAclPermissionRepository.getGrantsForRoles(roleIds) : []

  return {
    isPlatformAdmin: Boolean(user.is_platform_admin),
    companyId: user.company_id,
    roleIds,
    roleNames: roles.map(role => role.name),
    moduleAccess: buildModuleAccess(grants),
  }
}

function hasModulePermission(access, moduleKey, permissionName) {
  return Boolean(access?.moduleAccess?.[moduleKey]?.has(permissionName))
}

// "Can see this module's data at all" - View (self-scoped) or View All (company-wide)
// satisfy it equally. The single source of truth for that OR, used by requireModule()'s
// default GET gate and by every route that needs the same check to pick a query scope.
function hasAnyViewPermission(access, moduleKey) {
  return hasModulePermission(access, moduleKey, 'View') || hasModulePermission(access, moduleKey, 'View All')
}

function hasAnyModulePermission(access, moduleKey) {
  return Boolean(access?.moduleAccess?.[moduleKey]?.size)
}

// JSON-safe shape for the frontend (Sets -> arrays) - powers sidebar visibility and
// client-side route guards. The frontend hiding a nav item is a UX nicety only; the
// actual enforcement is requireModule() on the backend routes.
async function getClientAccess(userId) {
  const access = await getUserAccessContext(userId)
  return {
    isPlatformAdmin: access.isPlatformAdmin,
    roleNames: access.roleNames,
    modules: Object.fromEntries(
      Object.entries(access.moduleAccess).map(([key, permissions]) => [key, [...permissions]])
    ),
  }
}

module.exports = {
  getUserAccessContext, hasModulePermission, hasAnyViewPermission, hasAnyModulePermission, getClientAccess,
}
