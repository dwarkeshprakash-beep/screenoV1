-- 047_index_cleanup.sql
-- Index hygiene only - no tables or columns change, no data is touched.
--
-- 1. Drop indexes that duplicate a UNIQUE index, or are a leading-column prefix of
--    one. Postgres serves the same lookups from the remaining index, so every query
--    keeps an index path; writes get cheaper and the planner has fewer choices.
-- 2. Drop sp_get_candidate_report(): not created by any migration, never called,
--    and it reads a "candidates" table that no longer exists (it would error if run).
-- 3. Add indexes for foreign-key-style columns that are joined/filtered on but had
--    none (interview flows / interviewer assignments).
--
-- Every statement is IF [NOT] EXISTS, so the file is safe to re-run.

-- 1. Redundant indexes -------------------------------------------------------------

-- Exact duplicates of a UNIQUE index on the same column(s)
DROP INDEX IF EXISTS idx_password_reset_tokens_hash;     -- = password_reset_tokens_token_hash_key (token_hash)
DROP INDEX IF EXISTS idx_monthly_occurrence_interview;   -- = monthly_assessment_occurrences_interview_id_key (interview_id)
DROP INDEX IF EXISTS idx_interview_flow_stages_flow;     -- = uq_interview_flow_stage_order (flow_id, stage_order)

-- Leading-column prefix of a UNIQUE index
DROP INDEX IF EXISTS idx_client_round_team;              -- prefix of uq_client_round (client_team_id, round_number)
DROP INDEX IF EXISTS idx_client_teams_mandate;           -- prefix of idx_client_teams_mandate_user (mandate_id, user_id)
DROP INDEX IF EXISTS idx_candidate_flow_stage_runs_run;  -- prefix of uq_candidate_flow_stage_attempt (run_id, stage_order, attempt_number)
DROP INDEX IF EXISTS idx_roles_company;                  -- prefix of roles_company_id_name_key (company_id, name)
DROP INDEX IF EXISTS idx_user_roles_user;                -- prefix of user_roles_user_id_role_id_key (user_id, role_id)
DROP INDEX IF EXISTS idx_acls_company;                   -- prefix of acls_company_id_module_id_key (company_id, module_id)
DROP INDEX IF EXISTS idx_rap_role;                       -- prefix of role_acl_permissions_role_id_acl_id_permission_id_key

-- (mandate_id, id) adds nothing over idx_client_mandate_req_mandate (mandate_id) plus the
-- primary key on id; it only existed to back a composite foreign key that was later dropped.
DROP INDEX IF EXISTS idx_client_mandate_requirements_mandate_id_id;

-- role_acl_permissions.company_id is stored but never filtered or joined on.
DROP INDEX IF EXISTS idx_rap_company;

-- 2. Orphan function ---------------------------------------------------------------
DROP FUNCTION IF EXISTS sp_get_candidate_report(integer);

-- 3. Missing indexes ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_interview_assignments_interview
  ON interview_assignments (interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_assignments_stage_run
  ON interview_assignments (stage_run_id);
CREATE INDEX IF NOT EXISTS idx_interview_assignment_files_assignment
  ON interview_assignment_files (assignment_id);
CREATE INDEX IF NOT EXISTS idx_candidate_flow_stage_runs_stage
  ON candidate_flow_stage_runs (stage_id);
