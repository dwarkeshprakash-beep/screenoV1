-- Read is fully retired - View/View All now gate every module's visibility everywhere
-- (see 045_view_permission_replaces_read.sql, which already copied every Read grant
-- forward to an equivalent View grant). Remove every remaining grant referencing Read,
-- then remove the permission itself so it no longer appears as a column in the ACL grid.
DELETE FROM role_acl_permissions
WHERE permission_id = (SELECT id FROM permissions WHERE name = 'Read');

DELETE FROM permissions WHERE name = 'Read';
