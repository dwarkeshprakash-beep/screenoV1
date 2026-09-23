-- candidate_portal module is dead weight now that the portal split is gone (see 043_drop_roles_portal.sql) -
-- nothing in code gates on it anymore. Clear module_id off any ACL that still points at it (no FK to do
-- this automatically) so it cleanly reverts to "unassigned" instead of dangling, then drop the row.
UPDATE acls SET module_id = NULL
WHERE module_id = (SELECT id FROM modules WHERE key = 'candidate_portal');

DELETE FROM modules WHERE key = 'candidate_portal';
