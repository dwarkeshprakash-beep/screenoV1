-- Migration: 012_monthly_occurrences

-- 1. Monthly Occurrences Table
CREATE TABLE IF NOT EXISTS monthly_assessment_occurrences (
  id SERIAL PRIMARY KEY,
  enrollment_id INT NOT NULL REFERENCES monthly_assessment_enrollments(id) ON DELETE CASCADE,
  period_month DATE NOT NULL, -- Stored as YYYY-MM-01
  available_from TIMESTAMPTZ NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  interview_id INT UNIQUE REFERENCES interviews(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled', 
  created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_monthly_occurrence_period UNIQUE (enrollment_id, period_month),
  CONSTRAINT chk_monthly_occurrence_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_monthly_occurrence_interview ON monthly_assessment_occurrences(interview_id);

-- Backfill: migrate existing enrollment interview_id into the first occurrence row
INSERT INTO monthly_assessment_occurrences (
  enrollment_id, 
  period_month, 
  available_from, 
  due_at, 
  duration_minutes, 
  interview_id, 
  status, 
  created, 
  updated
)
SELECT 
  e.id, 
  date_trunc('month', e.start_date)::DATE, 
  COALESCE(i.available_from, i.scheduled_at, e.start_date),
  COALESCE(i.due_at, (i.scheduled_at + interval '1 month')), 
  COALESCE(i.duration_minutes, 60),
  e.interview_id,
  COALESCE(i.status, 'scheduled'),
  e.created,
  e.created
FROM monthly_assessment_enrollments e
JOIN interviews i ON i.id = e.interview_id
WHERE NOT EXISTS (
  SELECT 1 FROM monthly_assessment_occurrences o WHERE o.enrollment_id = e.id
);


-- 2. Assignment Requests Idempotency Table
CREATE TABLE IF NOT EXISTS assignment_requests (
  id SERIAL PRIMARY KEY,
  request_key VARCHAR(255) NOT NULL UNIQUE,
  assessment_id INT NOT NULL REFERENCES monthly_assessments(id) ON DELETE CASCADE,
  team_member_id INT NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  enrollment_id INT REFERENCES monthly_assessment_enrollments(id) ON DELETE SET NULL,
  created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_assignment_requests_member ON assignment_requests(team_member_id);

-- 3. Email Outbox Jobs Table
CREATE TABLE IF NOT EXISTS email_outbox_jobs (
  id SERIAL PRIMARY KEY,
  event_key VARCHAR(255) UNIQUE, -- Prevent duplicate jobs for the same logical event
  interview_id INT REFERENCES interviews(id) ON DELETE CASCADE,
  recipient VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  send_after TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'claimed', 'finished', 'failed'
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  claimed_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_outbox_status CHECK (status IN ('pending', 'claimed', 'finished', 'failed'))
);
CREATE INDEX IF NOT EXISTS idx_email_outbox_jobs_pending ON email_outbox_jobs(status, send_after);

