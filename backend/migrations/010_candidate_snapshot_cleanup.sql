-- 010_candidate_snapshot_cleanup.sql
--
-- Strip redundant HR profile columns from candidates.
-- employee_id, location, current_position, department were added in 008 to
-- avoid a JOIN, but now that team_members joins users directly these columns
-- are redundant duplication. Profile data comes from users via user_id JOIN.
--
-- Remaining candidates columns after this migration:
--   id, company_id, manager_id, user_id,
--   first_name, last_name, email, phone    ← identity snapshot for magic-link emails
--   resume_url, resume_updated,
--   last_assessed, source, created, deleted

ALTER TABLE candidates
  DROP COLUMN IF EXISTS employee_id,
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS current_position,
  DROP COLUMN IF EXISTS department;
