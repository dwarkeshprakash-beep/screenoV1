-- Ordered mandate interview flows and internal interviewer feedback.
-- Relationships are validated in the service layer; only primary keys are used.

CREATE TABLE IF NOT EXISTS interview_flows (
  id SERIAL PRIMARY KEY,
  mandate_id INT NOT NULL,
  name VARCHAR(160) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_by_manager_id INT NOT NULL,
  created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interview_flow_stages (
  id SERIAL PRIMARY KEY,
  flow_id INT NOT NULL,
  stage_order INT NOT NULL,
  name VARCHAR(160) NOT NULL,
  type VARCHAR(30) NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  schedule_timezone VARCHAR(100),
  duration_minutes INT,
  interview_mode VARCHAR(20) DEFAULT 'simple',
  difficulty VARCHAR(20) DEFAULT 'medium',
  question_count INT DEFAULT 10,
  require_pass BOOLEAN NOT NULL DEFAULT FALSE,
  minimum_score NUMERIC(5,2),
  interviewer_user_id INT,
  location TEXT,
  meeting_url TEXT,
  notes TEXT,
  created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_interview_flow_stage_order UNIQUE (flow_id, stage_order)
);

CREATE TABLE IF NOT EXISTS candidate_flow_runs (
  id SERIAL PRIMARY KEY,
  flow_id INT NOT NULL,
  client_team_id INT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  current_stage_order INT NOT NULL DEFAULT 1,
  created_by_manager_id INT NOT NULL,
  completed_at TIMESTAMPTZ,
  created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS candidate_flow_stage_runs (
  id SERIAL PRIMARY KEY,
  run_id INT NOT NULL,
  stage_id INT NOT NULL,
  stage_order INT NOT NULL,
  interview_id INT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  outcome VARCHAR(30),
  attempt_number INT NOT NULL DEFAULT 1,
  completed_at TIMESTAMPTZ,
  created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_candidate_flow_stage_attempt UNIQUE (run_id, stage_order, attempt_number)
);

CREATE TABLE IF NOT EXISTS interview_assignments (
  id SERIAL PRIMARY KEY,
  stage_run_id INT,
  interview_id INT NOT NULL,
  interviewer_user_id INT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'assigned',
  outcome VARCHAR(30),
  feedback TEXT,
  completed_at TIMESTAMPTZ,
  created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interview_assignment_files (
  id SERIAL PRIMARY KEY,
  assignment_id INT NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(150),
  size INT,
  storage_path TEXT NOT NULL,
  created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS flow_stage_run_id INT;

CREATE INDEX IF NOT EXISTS idx_interview_flows_mandate ON interview_flows(mandate_id);
CREATE INDEX IF NOT EXISTS idx_interview_flow_stages_flow ON interview_flow_stages(flow_id, stage_order);
CREATE INDEX IF NOT EXISTS idx_candidate_flow_runs_team ON candidate_flow_runs(client_team_id);
CREATE INDEX IF NOT EXISTS idx_candidate_flow_stage_runs_run ON candidate_flow_stage_runs(run_id, stage_order);
CREATE INDEX IF NOT EXISTS idx_interview_assignments_user ON interview_assignments(interviewer_user_id, status);
CREATE INDEX IF NOT EXISTS idx_interviews_flow_stage_run ON interviews(flow_stage_run_id);
