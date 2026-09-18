-- Permissions — global, admin-managed catalog of grantable actions (Read/Save/Delete
-- by default, but admin can add/rename/remove more). Global like modules, not
-- per-company — an action means the same thing everywhere. See docs/rbac-multi-tenant-plan.md.
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO permissions (name) VALUES ('Read'), ('Save'), ('Delete')
ON CONFLICT (name) DO NOTHING;
