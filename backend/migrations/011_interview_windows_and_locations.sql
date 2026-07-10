-- Migration: 011_interview_windows_and_locations

-- 1. Add new columns for lifecycle and scheduling
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS schedule_timezone TEXT,
  ADD COLUMN IF NOT EXISTS schedule_version INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS meeting_provider TEXT,
  ADD COLUMN IF NOT EXISTS meeting_provider_event_id TEXT,
  ADD COLUMN IF NOT EXISTS expired_notification_version INT DEFAULT 0;

-- 2. Backfill existing data
UPDATE interviews
SET
  available_from = COALESCE(scheduled_at, created),
  due_at = COALESCE(
    scheduled_at + (COALESCE(duration_minutes, 60) * interval '1 minute'),
    created + interval '7 days'
  ),
  schedule_timezone = 'UTC'
WHERE available_from IS NULL;

-- 3. Ensure due_at > available_from constraint
-- In rare cases where the backfill creates equal timestamps, push due_at forward slightly.
UPDATE interviews
SET due_at = available_from + interval '1 hour'
WHERE due_at <= available_from;

ALTER TABLE interviews DROP CONSTRAINT IF EXISTS chk_interviews_window;
ALTER TABLE interviews
  ADD CONSTRAINT chk_interviews_window
  CHECK (due_at > available_from);

-- 4. Add index for fast window lookups
CREATE INDEX IF NOT EXISTS idx_interviews_windows ON interviews(available_from, due_at);
