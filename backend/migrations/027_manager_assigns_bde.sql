-- Mirror of 024_bde_mandate_creator.sql: lets a manager optionally assign a BDE to a
-- mandate they own, so that BDE gets a read-only view of it too (in addition to the
-- mandates they created themselves).

ALTER TABLE client_templates
ADD COLUMN IF NOT EXISTS assigned_bde_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_client_templates_assigned_bde
ON client_templates(assigned_bde_id, updated_at DESC);
