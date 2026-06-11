-- Migration 002: New feature tables for Client Interviews, Monthly Assessments, External Candidates
-- Idempotent: uses IF NOT EXISTS — safe to re-run

CREATE TABLE IF NOT EXISTS external_candidates (
  id         SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name  VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  resume_url VARCHAR(500),
  created    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_templates (
  id           SERIAL PRIMARY KEY,
  manager_id   INT NOT NULL,
  client_name  VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  headcount    INT DEFAULT 1,
  requirements TEXT,
  jd_text      TEXT,
  custom_info  TEXT,
  tags         TEXT,
  created      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_assessments (
  id               SERIAL PRIMARY KEY,
  manager_id       INT NOT NULL,
  subject_name     VARCHAR(255) NOT NULL,
  difficulty       VARCHAR(20) DEFAULT 'medium',
  topics           TEXT,
  sub_topics       TEXT,
  ai_generated_jd  TEXT,
  duration_months  INT DEFAULT 1,
  status           VARCHAR(20) DEFAULT 'active',
  created          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_assessment_enrollments (
  id             SERIAL PRIMARY KEY,
  assessment_id  INT NOT NULL,
  team_member_id INT NOT NULL,
  start_date     TIMESTAMPTZ,
  end_date       TIMESTAMPTZ,
  month_progress TEXT,
  status         VARCHAR(20) DEFAULT 'pending',
  created        TIMESTAMPTZ DEFAULT NOW()
);
