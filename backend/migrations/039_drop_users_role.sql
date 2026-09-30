-- users.role is retired. Portal (manager/bde/candidate) is now resolved from the
-- user's assigned roles (roles.portal, see migration 038); platform-admin access
-- is resolved from users.is_platform_admin (see 032_modules.sql). Two sources of
-- truth (this column + the RBAC tables) collapse into one - the RBAC tables.
ALTER TABLE users DROP COLUMN IF EXISTS role;
