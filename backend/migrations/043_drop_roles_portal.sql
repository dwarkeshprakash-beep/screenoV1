-- Portal is no longer a role-level concept - every user's visibility is driven
-- entirely by module/permission ACL grants (see docs/rbac-multi-tenant-plan.md).
-- Dropping the column also drops its CHECK constraint automatically.
ALTER TABLE roles DROP COLUMN IF EXISTS portal;
