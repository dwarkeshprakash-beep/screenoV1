-- Migration: 018_integrity_cleanup_and_indexes
-- Keep clean database setup aligned with the current runtime and add safe operational cleanup.

ALTER TABLE client_mandate_requirements
  ADD COLUMN IF NOT EXISTS tags JSONB NULL;

-- V2 intentionally keeps relational integrity in backend services instead of DB foreign keys.
ALTER TABLE client_teams
  DROP CONSTRAINT IF EXISTS fk_client_teams_requirement;

ALTER TABLE monthly_assessment_occurrences
  DROP CONSTRAINT IF EXISTS monthly_assessment_occurrences_enrollment_id_fkey,
  DROP CONSTRAINT IF EXISTS monthly_assessment_occurrences_interview_id_fkey;

ALTER TABLE assignment_requests
  DROP CONSTRAINT IF EXISTS assignment_requests_assessment_id_fkey,
  DROP CONSTRAINT IF EXISTS assignment_requests_team_member_id_fkey,
  DROP CONSTRAINT IF EXISTS assignment_requests_enrollment_id_fkey;

ALTER TABLE email_outbox_jobs
  DROP CONSTRAINT IF EXISTS email_outbox_jobs_interview_id_fkey;

ALTER TABLE client_interview_rounds
  DROP CONSTRAINT IF EXISTS client_interview_rounds_client_team_id_fkey,
  DROP CONSTRAINT IF EXISTS client_interview_rounds_created_by_manager_id_fkey;

CREATE INDEX IF NOT EXISTS idx_client_templates_manager_active
  ON client_templates(manager_id, archived_at, created DESC);

CREATE INDEX IF NOT EXISTS idx_interviews_template_manager_created
  ON interviews(client_template_id, manager_id, created DESC);

CREATE INDEX IF NOT EXISTS idx_interviews_client_team_created
  ON interviews(client_team_id, created DESC);

CREATE INDEX IF NOT EXISTS idx_monthly_assessments_manager_created
  ON monthly_assessments(manager_id, created DESC);

CREATE INDEX IF NOT EXISTS idx_monthly_enrollments_assessment
  ON monthly_assessment_enrollments(assessment_id);

CREATE INDEX IF NOT EXISTS idx_monthly_enrollments_member_window
  ON monthly_assessment_enrollments(team_member_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_interview_created
  ON email_deliveries(interview_id, created DESC);

CREATE INDEX IF NOT EXISTS idx_report_jobs_retry
  ON report_jobs(status, available_at)
  WHERE attempts < 3;

CREATE INDEX IF NOT EXISTS idx_email_outbox_jobs_event_key_pattern
  ON email_outbox_jobs(event_key text_pattern_ops);

DELETE FROM password_reset_tokens
WHERE (used = TRUE OR expires < CURRENT_TIMESTAMP)
  AND created < CURRENT_TIMESTAMP - INTERVAL '7 days';

DELETE FROM assignment_requests
WHERE enrollment_id IS NULL
  AND created < CURRENT_TIMESTAMP - INTERVAL '1 day';

DELETE FROM refresh_tokens
WHERE (revoked IS NOT NULL OR expires < CURRENT_TIMESTAMP)
  AND created < CURRENT_TIMESTAMP - INTERVAL '30 days';
