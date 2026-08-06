-- Track meaningful mandate changes so recently edited mandates can be shown first.

ALTER TABLE client_templates
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE client_templates
SET updated_at = COALESCE(updated_at, created, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL;

ALTER TABLE client_templates
ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_client_templates_manager_updated
ON client_templates(manager_id, updated_at DESC);
