-- ACLs — per-company permission bucket, each gating exactly one module (strict 1:1).
-- See docs/rbac-multi-tenant-plan.md.
CREATE TABLE IF NOT EXISTS acls (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  module_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, module_id),
  UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_acls_company ON acls(company_id);
