-- Migration: 016_monthly_and_mandate_cleanup
-- Align recurring monthly assessments and client mandate outcomes with the
-- occurrence/round-based model used by the current application.

ALTER TABLE monthly_assessments
  ADD COLUMN IF NOT EXISTS interview_type VARCHAR(20) DEFAULT 'exam',
  ADD COLUMN IF NOT EXISTS interview_mode VARCHAR(20) DEFAULT 'simple';

UPDATE monthly_assessments
SET interview_type = COALESCE(interview_type, 'exam'),
    interview_mode = COALESCE(interview_mode, 'simple');

-- Occurrences now own the interview relation and per-period status.
ALTER TABLE monthly_assessment_enrollments
  DROP COLUMN IF EXISTS interview_id,
  DROP COLUMN IF EXISTS month_progress;

-- Client outcome rounds replaced the legacy one-row client interview record.
-- Migration 013 backfilled existing rows into client_interview_rounds.
DROP TABLE IF EXISTS client_interview_records;
