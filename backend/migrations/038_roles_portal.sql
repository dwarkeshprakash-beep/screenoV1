-- Roles gain a "portal" - which app shell (manager/bde/candidate) a user holding
-- this role lands in. This replaces users.role as the single source for portal
-- routing and Manager-vs-BDE scoping (see migration 039, which drops that column).
-- 'admin' is not a valid portal here - platform admin stays a separate concept on
-- users.is_platform_admin, since it isn't a per-company RBAC role (see 032_modules.sql).
ALTER TABLE roles ADD COLUMN IF NOT EXISTS portal VARCHAR(20)
  CHECK (portal IN ('manager', 'bde', 'candidate'));

-- Backfill using the exact same name-matching migration 031 used to link legacy
-- users.role values to their equivalent backfilled role rows.
UPDATE roles SET portal = 'bde' WHERE LOWER(name) = 'bde' AND portal IS NULL;
UPDATE roles SET portal = 'manager' WHERE LOWER(name) = 'technical project manager' AND portal IS NULL;
UPDATE roles SET portal = 'candidate' WHERE LOWER(name) = 'employee' AND portal IS NULL;
