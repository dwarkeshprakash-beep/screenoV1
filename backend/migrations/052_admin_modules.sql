-- Makes Organizations/Roles/Users/ACLs delegable: they join the same gate-able
-- module catalog as Team/Reports/etc, so a company can grant a "sub-admin" role
-- View/Save/Delete on just these via the existing ACL/permission grid instead of
-- needing the platform-wide users.is_platform_admin flag. See docs/database-schema.md.
INSERT INTO modules (key, name, sort_order) VALUES
  ('organizations', 'Organizations', 10),
  ('roles', 'Roles', 11),
  ('users', 'Users', 12),
  ('acls', 'ACLs', 13)
ON CONFLICT (key) DO NOTHING;
