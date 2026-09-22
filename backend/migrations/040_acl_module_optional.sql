-- ACLs no longer pick their module at creation time - an admin now creates an ACL
-- with just a name/description, then associates it with a module from the Modules
-- screen instead (see docs/rbac-multi-tenant-plan.md). module_id becomes optional
-- so an ACL can exist unassigned until it's linked to a module.
ALTER TABLE acls ALTER COLUMN module_id DROP NOT NULL;
