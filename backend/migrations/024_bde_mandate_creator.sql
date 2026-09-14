-- Track who originally created a mandate (e.g. a BDE), separate from who currently owns/runs it
-- (manager_id). Lets a creator keep a read-only view of mandates they've handed off to a manager.

ALTER TABLE client_templates
ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER;

UPDATE client_templates
SET created_by_user_id = manager_id
WHERE created_by_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_client_templates_created_by
ON client_templates(created_by_user_id, updated_at DESC);
