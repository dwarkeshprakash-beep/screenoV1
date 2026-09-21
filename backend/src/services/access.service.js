// backend/src/services/access.service.js
// The single source of truth for "what can this user do" - resolved fresh from the
// RBAC tables on every call (never cached in a JWT claim) so a permission change or
// revocation takes effect on the user's very next request. Replaces the old
// users.role column for both portal routing (manager/bde/candidate) and Manager-vs-BDE
// visibility scoping - see docs/rbac-multi-tenant-plan.md.

const userRepository = require('../repositories/user.repository')
const userRoleRepository = require('../repositories/user-role.repository')
const roleAclPermissionRepository = require('../repositories/role-acl-permission.repository')

// A user's roles should all belong to the same portal in practice (a role is
// created for one portal by an admin) - if they don't, the first one wins rather
// than failing the request outright.
function resolvePortal(roles) {
  const withPortal = roles.find(role => role.portal)
  return withPortal ? withPortal.portal : null
}

function buildModuleAccess(grants) {
  const moduleAccess = {}
  for (const grant of grants) {
    if (!moduleAccess[grant.module_key]) moduleAccess[grant.module_key] = new Set()
    moduleAccess[grant.module_key].add(grant.permission_name)
  }
  return moduleAccess
}

// { isPlatformAdmin, companyId, portal, roleIds, moduleAccess: { [moduleKey]: Set<permissionName> } }
async function getUserAccessContext(userId) {
  const user = await userRepository.getAuthProfile(userId)
  if (!user) throw new Error('User not found')

  const roles = await userRoleRepository.getRolesForUser(userId)
  const roleIds = roles.map(role => role.id)
  const grants = roleIds.length > 0 ? await roleAclPermissionRepository.getGrantsForRoles(roleIds) : []

  return {
    isPlatformAdmin: Boolean(user.is_platform_admin),
    companyId: user.company_id,
    portal: user.is_platform_admin ? 'admin' : resolvePortal(roles),
    roleIds,
    moduleAccess: buildModuleAccess(grants),
  }
}

function hasModulePermission(access, moduleKey, permissionName) {
  return Boolean(access?.moduleAccess?.[moduleKey]?.has(permissionName))
}

function hasAnyModulePermission(access, moduleKey) {
  return Boolean(access?.moduleAccess?.[moduleKey]?.size)
}

// Convenience for the few places (e.g. an email notification's deep link) that only
// need to know which portal a user other than the caller belongs to.
async function getPortalForUser(userId) {
  const access = await getUserAccessContext(userId)
  return access.portal
}

// JSON-safe shape for the frontend (Sets -> arrays) - powers sidebar visibility and
// client-side route guards. The frontend hiding a nav item is a UX nicety only; the
// actual enforcement is requireModule()/requirePortal() on the backend routes.
async function getClientAccess(userId) {
  const access = await getUserAccessContext(userId)
  return {
    portal: access.portal,
    isPlatformAdmin: access.isPlatformAdmin,
    modules: Object.fromEntries(
      Object.entries(access.moduleAccess).map(([key, permissions]) => [key, [...permissions]])
    ),
  }
}

module.exports = {
  getUserAccessContext, hasModulePermission, hasAnyModulePermission, getPortalForUser, getClientAccess,
}
