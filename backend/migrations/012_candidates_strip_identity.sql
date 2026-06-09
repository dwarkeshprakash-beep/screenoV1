-- 012_candidates_strip_identity.sql
--
-- Remove all identity/profile columns from candidates.
-- first_name, last_name, email, phone are already in users — no reason to
-- duplicate them.  All queries that need a candidate's name or email now
-- JOIN users via candidate.user_id.
--
-- After this migration candidates holds ONLY:
--   id, company_id, user_id (NOT NULL), last_assessed,
--   resume_url, resume_text, resume_updated, source, created, deleted
--
-- Unique constraint changes from (company_id, email) → (company_id, user_id).

-- 1. Verify no candidate lacks a user_id before we make it NOT NULL
--    (should be 0 rows; will fail the migration if any exist)
DO $$
DECLARE missing INT;
BEGIN
  SELECT COUNT(*) INTO missing FROM candidates WHERE user_id IS NULL AND deleted IS NULL;
  IF missing > 0 THEN
    RAISE EXCEPTION 'Cannot proceed: % active candidate(s) have no user_id', missing;
  END IF;
END $$;

-- 2. Drop the old unique constraint on (company_id, email)
ALTER TABLE candidates
  DROP CONSTRAINT IF EXISTS candidates_company_id_email_key;

-- In case it was created as a named index instead of a table constraint:
DROP INDEX IF EXISTS candidates_company_id_email_key;

-- 3. Remove duplicated identity columns
ALTER TABLE candidates
  DROP COLUMN IF EXISTS first_name,
  DROP COLUMN IF EXISTS last_name,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS phone;

-- 4. Add unique constraint on (company_id, user_id) — one candidate record per
--    user per company
ALTER TABLE candidates
  ADD CONSTRAINT candidates_company_id_user_id_key UNIQUE (company_id, user_id);

-- 5. Enforce user_id NOT NULL (every interview subject must be a known user)
ALTER TABLE candidates
  ALTER COLUMN user_id SET NOT NULL;
