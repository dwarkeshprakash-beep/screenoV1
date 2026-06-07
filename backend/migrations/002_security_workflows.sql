ALTER TABLE interviews ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS timezone VARCHAR(100);

CREATE TABLE IF NOT EXISTS scorecards (
  id SERIAL PRIMARY KEY,
  interview_id INT NOT NULL,
  candidate_id INT NOT NULL,
  interviewer_id INT NOT NULL,
  overall NUMERIC(4,2),
  confidence NUMERIC(4,2),
  tech_knowledge NUMERIC(4,2),
  communication NUMERIC(4,2),
  problem_solving NUMERIC(4,2),
  evidence TEXT,
  decision VARCHAR(20) NOT NULL,
  reason TEXT NOT NULL,
  created TIMESTAMPTZ DEFAULT NOW(),
  updated TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scorecards_interview_interviewer
  ON scorecards(interview_id, interviewer_id);

CREATE TABLE IF NOT EXISTS report_jobs (
  id SERIAL PRIMARY KEY,
  interview_id INT NOT NULL,
  attempt_id INT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  attempts INT DEFAULT 0,
  last_error TEXT,
  available_at TIMESTAMPTZ DEFAULT NOW(),
  started TIMESTAMPTZ,
  completed TIMESTAMPTZ,
  created TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_jobs_attempt ON report_jobs(attempt_id);
CREATE INDEX IF NOT EXISTS idx_report_jobs_pending ON report_jobs(status, available_at);

CREATE TABLE IF NOT EXISTS interview_notes (
  id SERIAL PRIMARY KEY,
  interview_id INT NOT NULL,
  interviewer_id INT NOT NULL,
  notes TEXT,
  asked_questions TEXT,
  created TIMESTAMPTZ DEFAULT NOW(),
  updated TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_notes_owner
  ON interview_notes(interview_id, interviewer_id);

CREATE TABLE IF NOT EXISTS schedule_records (
  id SERIAL PRIMARY KEY,
  idempotency_key VARCHAR(120) NOT NULL,
  company_id INT NOT NULL,
  candidate_id INT NOT NULL,
  interview_id INT,
  status VARCHAR(20) DEFAULT 'pending',
  expires TIMESTAMPTZ,
  completed TIMESTAMPTZ,
  created TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_records_key_company
  ON schedule_records(company_id, idempotency_key);

CREATE TABLE IF NOT EXISTS email_deliveries (
  id SERIAL PRIMARY KEY,
  kind VARCHAR(40) NOT NULL,
  interview_id INT,
  candidate_id INT,
  intended_to TEXT NOT NULL,
  delivered_to TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  error TEXT,
  attempts INT DEFAULT 1,
  last_attempt TIMESTAMPTZ DEFAULT NOW(),
  created TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_interview
  ON email_deliveries(interview_id, kind, status);
