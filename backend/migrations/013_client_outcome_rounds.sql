-- Migration: 013_client_outcome_rounds
-- Replaces the single client_interview_records row per candidate
-- with a multi-round history table. Old table becomes read-only during rollout.

CREATE TABLE IF NOT EXISTS client_interview_rounds (
  id SERIAL PRIMARY KEY,
  client_team_id INT NOT NULL REFERENCES client_teams(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  interview_at TIMESTAMPTZ,
  outcome VARCHAR(50) NOT NULL DEFAULT 'pending',
  feedback TEXT,
  manager_notes TEXT,          -- Never exposed to candidate
  candidate_visible BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_by_manager_id INT REFERENCES users(id) ON DELETE SET NULL,
  created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_client_round UNIQUE (client_team_id, round_number),
  CONSTRAINT chk_client_round_outcome CHECK (
    outcome IN ('pending', 'passed', 'failed', 'on_hold', 'offer_made', 'hired', 'withdrawn')
  ),
  CONSTRAINT chk_round_number_positive CHECK (round_number > 0)
);

CREATE INDEX IF NOT EXISTS idx_client_round_team ON client_interview_rounds(client_team_id);

-- Backfill: migrate existing client_interview_records into round 1 (unpublished by default).
-- This protects historical manager-only feedback from being exposed to candidates.
INSERT INTO client_interview_rounds (
  client_team_id,
  round_number,
  interview_at,
  outcome,
  feedback,
  manager_notes,
  candidate_visible,
  created,
  updated
)
SELECT
  r.client_team_id,
  1,
  r.interview_date,
  COALESCE(r.outcome, 'pending'),
  r.feedback,
  NULL,
  FALSE,  -- Strictly unpublished for all migrated rows
  COALESCE(r.created, CURRENT_TIMESTAMP),
  COALESCE(r.created, CURRENT_TIMESTAMP)
FROM client_interview_records r
WHERE NOT EXISTS (
  SELECT 1 FROM client_interview_rounds cr WHERE cr.client_team_id = r.client_team_id
);
