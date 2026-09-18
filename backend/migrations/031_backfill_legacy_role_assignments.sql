-- Backfill RBAC role assignments from the legacy users.role column, matched by role
-- name within each user's own company (roles are per-company, so a mapping only
-- applies where that company has already created a role with the matching name).
-- Idempotent: safe to re-run, matches the UNIQUE (user_id, role_id) constraint on user_roles.
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.company_id = u.company_id
WHERE (
  (u.role = 'bde' AND LOWER(r.name) = 'bde')
  OR (u.role = 'manager' AND LOWER(r.name) = 'technical project manager')
  OR (u.role = 'employee' AND LOWER(r.name) = 'employee')
)
ON CONFLICT (user_id, role_id) DO NOTHING;
