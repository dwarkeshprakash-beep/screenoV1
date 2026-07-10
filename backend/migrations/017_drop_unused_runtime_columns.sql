-- Migration: 017_drop_unused_runtime_columns
-- Remove columns that are no longer read or written by the current V2 app.

ALTER TABLE companies
  DROP COLUMN IF EXISTS logo_url;

ALTER TABLE interviews
  DROP COLUMN IF EXISTS schedule_version,
  DROP COLUMN IF EXISTS meeting_provider,
  DROP COLUMN IF EXISTS meeting_provider_event_id,
  DROP COLUMN IF EXISTS expired_notification_version;
