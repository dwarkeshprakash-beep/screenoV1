-- 011_strip_team_members.sql
--
-- Strip all duplicated profile columns from team_members.
-- After this migration team_members is a PURE mapping table:
--   id, company_id, manager_id, user_id, candidate_id, created, deleted
--
-- Profile data (name, email, location, etc.) stays exclusively in users.
-- Assessment status (last_assessed) moves back to candidates where it belongs.

-- 1. Restore last_assessed on candidates (removed by migration 010)
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS last_assessed TIMESTAMPTZ;

-- 2. Backfill last_assessed from team_members (which currently holds it)
UPDATE candidates c
SET last_assessed = tm.last_assessed
FROM team_members tm
WHERE tm.candidate_id = c.id
  AND tm.last_assessed IS NOT NULL
  AND c.last_assessed IS NULL;

-- 3. Remove all duplicated profile/state columns from team_members
ALTER TABLE team_members
  DROP COLUMN IF EXISTS first_name,
  DROP COLUMN IF EXISTS last_name,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS member_type,
  DROP COLUMN IF EXISTS employee_id,
  DROP COLUMN IF EXISTS department,
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS current_position,
  DROP COLUMN IF EXISTS resume_url,
  DROP COLUMN IF EXISTS resume_text,
  DROP COLUMN IF EXISTS resume_updated,
  DROP COLUMN IF EXISTS last_assessed,
  DROP COLUMN IF EXISTS source;
