-- Migration 007: Client teams, requirement profiles, client interview records, extended interviews

-- Multiple requirement profiles per mandate (junior vs senior, different year bands, etc.)
CREATE TABLE IF NOT EXISTS client_mandate_requirements (
  id            SERIAL PRIMARY KEY,
  mandate_id    INTEGER NOT NULL,
  profile_name  VARCHAR(255) NOT NULL,
  years_min     INTEGER,
  years_max     INTEGER,
  headcount     INTEGER DEFAULT 1,
  notes         TEXT,
  created       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_mandate_req_mandate ON client_mandate_requirements(mandate_id);

-- Candidates added to a client mandate as prospects
CREATE TABLE IF NOT EXISTS client_teams (
  id                SERIAL PRIMARY KEY,
  mandate_id        INTEGER NOT NULL,
  user_id           INTEGER NOT NULL,
  requirement_id    INTEGER,
  jd_sent           BOOLEAN DEFAULT FALSE,
  jd_sent_at        TIMESTAMPTZ,
  client_resume_url VARCHAR(500),
  resume_updated_at TIMESTAMPTZ,
  status            VARCHAR(50) DEFAULT 'prospect',
  notes             TEXT,
  created           TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_teams_mandate_user ON client_teams(mandate_id, user_id);
CREATE INDEX IF NOT EXISTS idx_client_teams_mandate ON client_teams(mandate_id);
CREATE INDEX IF NOT EXISTS idx_client_teams_user ON client_teams(user_id);

-- Real client interview records (manager logs outcome of the actual client-side interview)
CREATE TABLE IF NOT EXISTS client_interview_records (
  id              SERIAL PRIMARY KEY,
  mandate_id      INTEGER NOT NULL,
  client_team_id  INTEGER NOT NULL,
  interview_date  DATE,
  outcome         VARCHAR(30) DEFAULT 'pending',
  feedback        TEXT,
  notes           TEXT,
  created         TIMESTAMPTZ DEFAULT NOW(),
  updated         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_interview_records_mandate ON client_interview_records(mandate_id);
CREATE INDEX IF NOT EXISTS idx_client_interview_records_team ON client_interview_records(client_team_id);

-- Extend interviews table: scheduled date/time, location (offline), and client team link
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS location VARCHAR(500);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS client_team_id INTEGER;
