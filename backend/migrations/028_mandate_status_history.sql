-- Tracks a mandate's lifecycle as an append-only log of milestones reached:
-- created -> assigned_to_manager -> candidates_assigned -> mock_interview_scheduled
-- -> mock_interview_complete -> client_interview_scheduled -> client_interview_complete.
-- Each milestone is recorded once (first time reached) with who triggered it and when,
-- so the mandate's current status and "completed" timestamp can be read straight off this table.

CREATE TABLE IF NOT EXISTS mandate_status_history (
  id SERIAL PRIMARY KEY,
  mandate_id INTEGER NOT NULL,
  status VARCHAR(40) NOT NULL,
  actor_user_id INTEGER,
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (mandate_id, status)
);

CREATE INDEX IF NOT EXISTS idx_mandate_status_history_mandate
ON mandate_status_history(mandate_id, created);
