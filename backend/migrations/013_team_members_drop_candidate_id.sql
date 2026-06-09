-- 013_team_members_drop_candidate_id.sql
--
-- candidate_id on team_members is redundant — candidates.user_id already
-- provides the mapping (UNIQUE on company_id, user_id).
-- Queries that need the candidate record now JOIN via user_id instead.
--
-- Before: team_members JOIN candidates c ON c.id = tm.candidate_id
-- After:  team_members JOIN candidates c ON c.user_id = tm.user_id
--                                        AND c.company_id = tm.company_id

ALTER TABLE team_members DROP COLUMN IF EXISTS candidate_id;
