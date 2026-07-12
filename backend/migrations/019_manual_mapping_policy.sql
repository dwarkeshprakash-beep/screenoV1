-- Migration: 019_manual_mapping_policy
-- Enforce Screeno's current DB policy: backend/manual mapping owns relationships
-- and business validation; the database keeps identity, useful uniqueness, and indexes.

DO $$
DECLARE
  constraint_row RECORD;
BEGIN
  FOR constraint_row IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      con.conname AS constraint_name
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND con.contype = 'f'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I',
      constraint_row.schema_name,
      constraint_row.table_name,
      constraint_row.constraint_name
    );
  END LOOP;
END $$;

ALTER TABLE interviews
  DROP CONSTRAINT IF EXISTS chk_interviews_window;

ALTER TABLE monthly_assessment_occurrences
  DROP CONSTRAINT IF EXISTS chk_monthly_occurrence_status;

ALTER TABLE email_outbox_jobs
  DROP CONSTRAINT IF EXISTS chk_outbox_status;

ALTER TABLE client_interview_rounds
  DROP CONSTRAINT IF EXISTS chk_client_round_outcome,
  DROP CONSTRAINT IF EXISTS chk_round_number_positive;

ALTER TABLE client_mandate_requirements
  DROP CONSTRAINT IF EXISTS client_mandate_requirements_mandate_id_id_key;

CREATE INDEX IF NOT EXISTS idx_client_mandate_requirements_mandate_id_id
  ON client_mandate_requirements(mandate_id, id);

