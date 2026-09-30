-- Switch role_acl_permissions from a fixed CHECK-constrained action string to a
-- reference to the new dynamic permissions catalog (see 035_permissions.sql).
-- This table was introduced in migration 034 moments before this change with no
-- real usage yet — any grants saved under the old fixed action set (view/create/
-- edit/delete/export) don't map cleanly onto the new admin-defined catalog, so it's
-- recreated cleanly rather than migrated in place.
DROP TABLE IF EXISTS role_acl_permissions;

CREATE TABLE role_acl_permissions (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  acl_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (role_id, acl_id, permission_id)
);

CREATE INDEX idx_rap_company ON role_acl_permissions(company_id);
CREATE INDEX idx_rap_role ON role_acl_permissions(role_id);
CREATE INDEX idx_rap_acl ON role_acl_permissions(acl_id);
CREATE INDEX idx_rap_permission ON role_acl_permissions(permission_id);
