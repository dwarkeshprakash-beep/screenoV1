-- Migration 004: Align the database with the Screeno V2 product model.
-- The removed tables are legacy V1 structures with no retained rows.

DROP TABLE IF EXISTS candidate_notes;
DROP TABLE IF EXISTS interview_notes;
DROP TABLE IF EXISTS proctoring_events;
DROP TABLE IF EXISTS interview_questions;
DROP TABLE IF EXISTS schedule_records;
DROP TABLE IF EXISTS templates;

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS report_emails TEXT;

ALTER TABLE interviews DROP COLUMN IF EXISTS jd_text;
ALTER TABLE interviews DROP COLUMN IF EXISTS interviewer_id;
ALTER TABLE interviews DROP COLUMN IF EXISTS company_id;
ALTER TABLE interviews DROP COLUMN IF EXISTS mode;
ALTER TABLE interviews DROP COLUMN IF EXISTS jd_url;
ALTER TABLE interviews DROP COLUMN IF EXISTS focus_areas;
ALTER TABLE interviews DROP COLUMN IF EXISTS window_days;
ALTER TABLE interviews DROP COLUMN IF EXISTS report_every_n;
ALTER TABLE interviews DROP COLUMN IF EXISTS max_attempts;
ALTER TABLE interviews DROP COLUMN IF EXISTS cooldown_hours;
ALTER TABLE interviews DROP COLUMN IF EXISTS report_timing;
ALTER TABLE interviews DROP COLUMN IF EXISTS scheduled_start;
ALTER TABLE interviews DROP COLUMN IF EXISTS scheduled_end;
ALTER TABLE interviews DROP COLUMN IF EXISTS timezone;

ALTER TABLE reports DROP COLUMN IF EXISTS tips;
ALTER TABLE reports DROP COLUMN IF EXISTS attempt_id;

ALTER TABLE users DROP COLUMN IF EXISTS deleted;

ALTER TABLE team_members DROP COLUMN IF EXISTS tags;
ALTER TABLE team_members DROP COLUMN IF EXISTS availability;
ALTER TABLE team_members DROP COLUMN IF EXISTS deleted;

CREATE UNIQUE INDEX IF NOT EXISTS idx_external_candidates_company_email
  ON external_candidates(company_id, email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_manager_user
  ON team_members(manager_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_interview
  ON reports(interview_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scorecards_interview
  ON scorecards(interview_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_report_jobs_interview
  ON report_jobs(interview_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_interviews_token
  ON interviews(token)
  WHERE token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interviews_manager
  ON interviews(manager_id, created DESC);

CREATE INDEX IF NOT EXISTS idx_interviews_internal_user
  ON interviews(internal_user_id, created DESC);

CREATE INDEX IF NOT EXISTS idx_interviews_external_candidate
  ON interviews(external_candidate_id, created DESC);
