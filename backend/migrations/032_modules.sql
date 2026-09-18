-- Modules — global, fixed catalog of sidebar-visible feature areas (Manager/BDE side).
-- Admin's own pages are gated separately by users.is_platform_admin, not by Module/ACL —
-- 'admin' is a platform-wide operator concept, not a per-company RBAC role.
-- See docs/rbac-multi-tenant-plan.md.
CREATE TABLE IF NOT EXISTS modules (
  id SERIAL PRIMARY KEY,
  key VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO modules (key, name, sort_order) VALUES
  ('team', 'Team', 1),
  ('client_mandates', 'Client Mandates', 2),
  ('monthly_assessments', 'Monthly Assessment', 3),
  ('schedule', 'Schedule', 4),
  ('reports', 'Reports', 5),
  ('resume_analyzer', 'Resume Analyzer', 6),
  ('interviewer_assignments', 'Interviewer Assignments', 7),
  ('candidate_portal', 'Candidate Portal', 8)
ON CONFLICT (key) DO NOTHING;

-- Platform-admin flag — will replace role = 'admin' as the auth check for admin.routes.js
-- once the cutover happens. Added now (additive, safe) and backfilled from the legacy
-- column so it's ready to use without a second backfill pass later.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;
UPDATE users SET is_platform_admin = true WHERE role = 'admin';
