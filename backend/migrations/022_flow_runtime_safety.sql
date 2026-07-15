-- Isolate reusable flow templates from candidate runs and enforce idempotent scheduling.

ALTER TABLE candidate_flow_runs
  ADD COLUMN IF NOT EXISTS template_flow_id INT;

UPDATE candidate_flow_runs
SET template_flow_id = flow_id
WHERE template_flow_id IS NULL;

ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;

ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS calendar_sync_error TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_candidate_template_flow
  ON candidate_flow_runs ((COALESCE(template_flow_id, flow_id)), client_team_id)
  WHERE status NOT IN ('completed', 'cancelled');

CREATE UNIQUE INDEX IF NOT EXISTS uq_interviews_flow_stage_run
  ON interviews(flow_stage_run_id)
  WHERE flow_stage_run_id IS NOT NULL;
