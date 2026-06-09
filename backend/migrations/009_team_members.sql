-- 009_team_members.sql
--
-- Create team_members as a PURE mapping table.
-- Profile data (name, email, location, etc.) stays exclusively in users.
-- candidates table remains the FK target for interviews/reports/attempts.
--
-- team_members: which users does this manager manage?
-- candidates:   which users have been scheduled for interviews?
-- Both link to users.id — no profile data duplication.

CREATE TABLE IF NOT EXISTS team_members (
  id          SERIAL PRIMARY KEY,
  company_id  INT NOT NULL,
  manager_id  INT NOT NULL,   -- users.id of the managing manager
  user_id     INT NOT NULL,   -- users.id of the team member
  created     TIMESTAMPTZ DEFAULT NOW(),
  deleted     TIMESTAMPTZ
);

-- One manager can have each user in their team only once (while active)
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_manager_user
  ON team_members(manager_id, user_id)
  WHERE deleted IS NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_company
  ON team_members(company_id)
  WHERE deleted IS NULL;

-- Backfill from existing candidates — every active candidate that has both
-- manager_id and user_id filled becomes a team_members row.
INSERT INTO team_members (company_id, manager_id, user_id, created)
SELECT c.company_id, c.manager_id, c.user_id, c.created
FROM candidates c
WHERE c.deleted IS NULL
  AND c.manager_id IS NOT NULL
  AND c.user_id IS NOT NULL
ON CONFLICT DO NOTHING;
