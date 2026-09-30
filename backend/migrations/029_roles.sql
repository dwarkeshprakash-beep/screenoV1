-- Roles — per-company role catalog for the RBAC/ACL system.
-- See docs/rbac-multi-tenant-plan.md for the full design.
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_roles_company ON roles(company_id);
