-- Run in Supabase SQL Editor before testing notes feature

CREATE TABLE IF NOT EXISTS candidate_notes (
  id           SERIAL PRIMARY KEY,
  candidate_id INT NOT NULL,
  manager_id   INT NOT NULL,
  note         TEXT NOT NULL,
  created      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notes_candidate ON candidate_notes(candidate_id);
