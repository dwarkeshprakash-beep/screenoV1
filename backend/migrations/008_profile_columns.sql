-- 008_profile_columns.sql
--
-- Purpose:
--   1. Add profile columns directly to candidates so the frontend never needs
--      a JOIN to users+departments just to show employee_id / location / etc.
--   2. Add last_assessed TIMESTAMPTZ so assesment status is a simple column read
--      instead of a nested MAX subquery on attempts/reports every request.
--   3. Remove columns that were never actually used.
--
-- Postgres (Supabase) — use ADD COLUMN IF NOT EXISTS / DROP COLUMN IF EXISTS
-- for idempotency so this is safe to re-run.

-- ── 1. Add profile + assessment columns ──────────────────────────────────────
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS employee_id      VARCHAR,
  ADD COLUMN IF NOT EXISTS location         VARCHAR,
  ADD COLUMN IF NOT EXISTS current_position VARCHAR,
  ADD COLUMN IF NOT EXISTS department       VARCHAR,
  ADD COLUMN IF NOT EXISTS last_assessed    TIMESTAMPTZ;

-- ── 2. Backfill profile data from users (via email match within company) ─────
-- COALESCE keeps existing values if already set (idempotent re-run).
UPDATE candidates c
SET
  employee_id      = COALESCE(c.employee_id,      u.emp_number),
  location         = COALESCE(c.location,         u.location),
  current_position = COALESCE(c.current_position, u.job_title),
  department       = COALESCE(c.department,        d.name),
  user_id          = COALESCE(c.user_id,           u.id)
FROM users u
LEFT JOIN departments d ON d.id = u.department_id
WHERE u.email      = c.email
  AND u.company_id = c.company_id
  AND u.deleted    IS NULL;

-- ── 3. Backfill last_assessed from completed attempts / ready reports ─────────
UPDATE candidates c
SET last_assessed = sub.assessed_at
FROM (
  SELECT
    i.candidate_id,
    GREATEST(
      MAX(a.ended)   FILTER (WHERE a.status = 'completed'),
      MAX(r.created) FILTER (WHERE r.status = 'ready')
    ) AS assessed_at
  FROM interviews i
  LEFT JOIN attempts a ON a.interview_id = i.id
  LEFT JOIN reports  r ON r.interview_id = i.id
  GROUP BY i.candidate_id
) sub
WHERE c.id              = sub.candidate_id
  AND sub.assessed_at   IS NOT NULL
  AND c.last_assessed   IS NULL;   -- only fill where not already set

-- ── 4. Remove columns that were never used in candidates ─────────────────────
--  resume_text  — never populated (0 / 10 rows)
--  status       — always 'active'; deleted column handles soft-delete
--  type         — always 'internal'; if external candidates are ever needed
--                 this can be re-added via migration
ALTER TABLE candidates
  DROP COLUMN IF EXISTS resume_text,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS type;

-- ── 5. Remove always-'api' column from interviews ────────────────────────────
--  transcription_mode — every row is 'api', never varies, never read in logic
ALTER TABLE interviews
  DROP COLUMN IF EXISTS transcription_mode;
