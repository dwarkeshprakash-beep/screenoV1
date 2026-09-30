-- Every module's "can see this at all" gate now checks View/View All instead of Read
-- (View All satisfies a plain View check too) - one consistent name across all modules
-- instead of Read on some and View/View All on others. Seed the two permissions
-- defensively (most environments already have them, added via the Permissions admin UI).
INSERT INTO permissions (name) VALUES ('View'), ('View All')
ON CONFLICT (name) DO NOTHING;

-- Backfill: every role_acl_permissions row that already grants 'Read' gets an equivalent
-- 'View' grant, so no role loses access when the gate switches from Read to View.
-- client_mandates/monthly_assessments are excluded - those two never used Read to gate
-- viewing (they were built straight onto View/View All), so any Read grant sitting on
-- one of their ACLs was already a no-op and copying it forward would silently hand out
-- view access nobody actually intended.
INSERT INTO role_acl_permissions (company_id, role_id, acl_id, permission_id)
SELECT rap.company_id, rap.role_id, rap.acl_id, view_perm.id
FROM role_acl_permissions rap
JOIN permissions read_perm ON read_perm.id = rap.permission_id AND read_perm.name = 'Read'
JOIN permissions view_perm ON view_perm.name = 'View'
JOIN acls a ON a.id = rap.acl_id
LEFT JOIN modules m ON m.id = a.module_id
WHERE m.key IS NULL OR m.key NOT IN ('client_mandates', 'monthly_assessments')
ON CONFLICT (role_id, acl_id, permission_id) DO NOTHING;
