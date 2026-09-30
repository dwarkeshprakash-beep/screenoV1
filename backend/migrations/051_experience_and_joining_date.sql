-- Migration 051: Work experience and joining date on users
-- Idempotent: uses ADD COLUMN IF NOT EXISTS - safe to re-run
--
-- experience_years   whole years of professional experience (candidate/manager self-reported,
--                    also editable by their manager from the team edit form).
-- experience_months  the remaining 0-11 months on top of experience_years (e.g. 4 years
--                    9 months = experience_years 4, experience_months 9). Kept as a
--                    separate column rather than a decimal so the two inputs on the
--                    profile form map straight to columns.
-- joining_date       the date this person joined the organization.
--
-- All three are plain profile fields, same pattern as job_title/location - no FK, range
-- validated in backend services (utils/parse.js), not DB constraints.

ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_years INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_months INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS joining_date DATE;
