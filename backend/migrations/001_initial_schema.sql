-- Drop old tables
DROP TABLE IF EXISTS candidate_notes CASCADE;
DROP TABLE IF EXISTS interview_notes CASCADE;
DROP TABLE IF EXISTS attempts CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS proctoring_events CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS answers CASCADE;
DROP TABLE IF EXISTS schedule_records CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS email_deliveries CASCADE;
DROP TABLE IF EXISTS report_jobs CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS scorecards CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS interviews CASCADE;
DROP TABLE IF EXISTS transcripts CASCADE;
DROP TABLE IF EXISTS external_candidates CASCADE;

-- Recreate schema (No FK constraints, simple column names as per AGENTS.md rules)

CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  logo_url VARCHAR(500),
  created TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  emp_number VARCHAR(20),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  department_id INT,
  job_title VARCHAR(150),
  location VARCHAR(100),
  role VARCHAR(20) NOT NULL DEFAULT 'employee',
  password VARCHAR(255),
  company_id INT,
  resume_url VARCHAR(500),
  resume_updated TIMESTAMPTZ,
  tags TEXT,
  created TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE external_candidates (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  resume_url VARCHAR(500),
  tags TEXT,
  created TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_members (
  id SERIAL PRIMARY KEY,
  manager_id INT NOT NULL,
  user_id INT NOT NULL,
  created TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE interviews (
  id SERIAL PRIMARY KEY,
  manager_id INT NOT NULL,
  internal_user_id INT,
  external_candidate_id INT,
  type VARCHAR(20) NOT NULL,
  interview_mode VARCHAR(20) NOT NULL,
  difficulty VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  result VARCHAR(50),
  token VARCHAR(255),
  token_expires TIMESTAMPTZ,
  question_count INT DEFAULT 10,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transcripts (
  id SERIAL PRIMARY KEY,
  interview_id INT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_deliveries (
  id SERIAL PRIMARY KEY,
  kind VARCHAR(40) NOT NULL,
  interview_id INT,
  intended_to TEXT NOT NULL,
  delivered_to TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  error TEXT,
  created TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE report_jobs (
  id SERIAL PRIMARY KEY,
  interview_id INT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  attempts INT DEFAULT 0,
  last_error TEXT,
  available_at TIMESTAMPTZ DEFAULT NOW(),
  started TIMESTAMPTZ,
  completed TIMESTAMPTZ,
  created TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scorecards (
  id SERIAL PRIMARY KEY,
  interview_id INT NOT NULL,
  overall NUMERIC,
  confidence NUMERIC,
  tech_knowledge NUMERIC,
  communication NUMERIC,
  problem_solving NUMERIC,
  decision VARCHAR(20) NOT NULL,
  reason TEXT NOT NULL,
  created TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  interview_id INT NOT NULL,
  scorecard_id INT,
  summary TEXT,
  strengths TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'generating',
  pdf_url VARCHAR(500),
  created TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  revoked TIMESTAMPTZ,
  created TIMESTAMPTZ DEFAULT NOW()
);
