-- Role <-> ACL permission grants — what actions a role can perform on an ACL.
-- One row per granted action (a role with full CRUD on an ACL has 4 rows).
-- See docs/rbac-multi-tenant-plan.md.
CREATE TABLE IF NOT EXISTS role_acl_permissions (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  acl_id INTEGER NOT NULL,
  permission VARCHAR(20) NOT NULL CHECK (permission IN ('view', 'create', 'edit', 'delete', 'export')),
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (role_id, acl_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_rap_company ON role_acl_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_rap_role ON role_acl_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_rap_acl ON role_acl_permissions(acl_id);
