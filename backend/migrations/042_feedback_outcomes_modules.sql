-- Feedback and Client Outcomes become their own modules - always self-scoped to the
-- caller (no company-wide view for anyone, regardless of role) once the portal split
-- is removed. See docs/rbac-multi-tenant-plan.md.
INSERT INTO modules (key, name, sort_order) VALUES
  ('feedback', 'Feedback', 9),
  ('outcomes', 'Client Outcomes', 10)
ON CONFLICT (key) DO NOTHING;
