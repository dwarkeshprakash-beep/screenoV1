# Database Schema — Screeno

Two versions: PostgreSQL (Supabase — current) and SQL Server (SSMS — future).
Run the correct migration file in your DB before starting the backend.

**Rules:**
- No foreign key constraints — validation done in backend code
- Simple snake_case column names
- Primary keys only as constraints
- No extra tables or columns — only what is needed now

---

## Migration files location

```
backend/migrations/
├── 001_supabase.sql                 ← initial schema
├── 001_sqlserver.sql                ← SQL Server equivalent
├── 002–007_*.sql                    ← feature additions (see files for details)
├── 008_profile_columns.sql          ← added last_assessed; removed resume_text/status/type from candidates
├── 009_team_members.sql             ← created team_members pure-mapping table; backfilled from candidates
├── 010_candidate_snapshot_cleanup.sql  ← stripped redundant profile columns from candidates
└── 011_strip_team_members.sql       ← reduced team_members to pure mapping; moved last_assessed to candidates
```

---

## PostgreSQL Schema (Supabase — run this now)

```sql
-- ============================================================
-- COMPANIES
-- Each company using Screeno
-- ============================================================
CREATE TABLE companies (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    logo_url    VARCHAR(500),
    created     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS
-- All app users: manager, interviewer, hr, admin
-- Candidates are separate (they may not have a login)
-- ============================================================
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    company_id  INT NOT NULL,
    first_name  VARCHAR(100) NOT NULL,
    last_name   VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(20) NOT NULL,    -- 'manager', 'interviewer', 'hr', 'admin'
    status      VARCHAR(20) DEFAULT 'active',
    created     TIMESTAMPTZ DEFAULT NOW(),
    deleted     TIMESTAMPTZ,             -- soft delete: NULL = active
    UNIQUE(company_id, email)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company ON users(company_id);

-- ============================================================
-- REFRESH TOKENS
-- Stored tokens for JWT refresh (7 day validity)
-- ============================================================
CREATE TABLE refresh_tokens (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL,
    token_hash  VARCHAR(255) NOT NULL,
    expires     TIMESTAMPTZ NOT NULL,
    revoked     TIMESTAMPTZ,
    created     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);

-- ============================================================
-- TEAM_MEMBERS
-- Pure mapping: which users does this manager manage?
-- No profile data — everything comes from users JOIN.
-- candidate_id is set when the first interview is scheduled.
-- ============================================================
CREATE TABLE team_members (
    id           SERIAL PRIMARY KEY,
    company_id   INT NOT NULL,
    manager_id   INT NOT NULL,   -- users.id of the manager
    user_id      INT NOT NULL,   -- users.id of the team member
    candidate_id INT,            -- candidates.id, set on first scheduling
    created      TIMESTAMPTZ DEFAULT NOW(),
    deleted      TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_team_members_manager_user
  ON team_members(manager_id, user_id) WHERE deleted IS NULL;
CREATE INDEX idx_team_members_company
  ON team_members(company_id) WHERE deleted IS NULL;

-- Profile query (join users + departments):
-- SELECT tm.*, u.first_name, u.last_name, u.email, u.emp_number AS employee_id,
--        u.job_title AS current_position, u.location, d.name AS department,
--        c.last_assessed, c.resume_url
-- FROM team_members tm
-- JOIN users u ON u.id = tm.user_id
-- LEFT JOIN departments d ON d.id = u.department_id
-- LEFT JOIN candidates c ON c.id = tm.candidate_id

-- ============================================================
-- CANDIDATES
-- Interview subject record, created when first interview is scheduled.
-- Identity snapshot (name, email) kept for magic-link emails.
-- HR profile (employee_id, location, etc.) lives in users, accessed via JOIN.
-- ============================================================
CREATE TABLE candidates (
    id             SERIAL PRIMARY KEY,
    company_id     INT NOT NULL,
    user_id        INT,                    -- users.id link (may be null for external)
    first_name     VARCHAR(100) NOT NULL,
    last_name      VARCHAR(100) NOT NULL DEFAULT '',
    email          VARCHAR(255) NOT NULL,
    phone          VARCHAR(20),
    resume_url     VARCHAR(500),           -- Supabase Storage URL
    resume_text    TEXT,                   -- extracted text for AI question generation
    resume_updated TIMESTAMPTZ,
    last_assessed  TIMESTAMPTZ,            -- updated on interview completion
    source         VARCHAR(50),
    created        TIMESTAMPTZ DEFAULT NOW(),
    deleted        TIMESTAMPTZ,
    UNIQUE(company_id, email)
);

CREATE INDEX idx_candidates_company ON candidates(company_id);

-- ============================================================
-- INTERVIEWS
-- A scheduled interview session (AI voice, exam, or human)
-- ============================================================
CREATE TABLE interviews (
    id                  SERIAL PRIMARY KEY,
    company_id          INT NOT NULL,
    candidate_id        INT NOT NULL,
    manager_id          INT NOT NULL,           -- who scheduled it
    interviewer_id      INT,                    -- for human interviews
    type                VARCHAR(20) NOT NULL,   -- 'ai_voice', 'exam', 'human'
    mode                VARCHAR(20) NOT NULL,   -- 'client_mock', 'internal_monthly', 'assessment'
    interview_mode      VARCHAR(20) NOT NULL,   -- 'simple' (pre-gen) or 'adaptive' (LLM per Q)
    difficulty          VARCHAR(20) NOT NULL,   -- 'easy', 'medium', 'hard'
    jd_url              VARCHAR(500),
    jd_text             TEXT,                   -- extracted JD text for AI
    focus_areas         TEXT,                   -- manager's custom instructions
    max_attempts        INT DEFAULT 3,          -- -1 for unlimited
    cooldown_hours      INT DEFAULT 24,         -- min hours between attempts
    window_days         INT DEFAULT 7,          -- how many days the link stays active
    report_timing       VARCHAR(20) DEFAULT 'all',  -- 'each' or 'all'
    report_every_n      INT DEFAULT 3,          -- for unlimited: report every N attempts
    report_emails       TEXT,                   -- JSON array of extra email addresses
    status              VARCHAR(20) DEFAULT 'scheduled',
    token               VARCHAR(255),           -- magic link token for candidate
    token_expires       TIMESTAMPTZ,
    window_closes       TIMESTAMPTZ,
    created             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX idx_interviews_manager ON interviews(manager_id);
CREATE INDEX idx_interviews_token ON interviews(token);

-- ============================================================
-- ATTEMPTS
-- Each time a candidate starts the interview = one attempt
-- ============================================================
CREATE TABLE attempts (
    id              SERIAL PRIMARY KEY,
    interview_id    INT NOT NULL,
    attempt_num     INT NOT NULL,           -- 1, 2, 3...
    started         TIMESTAMPTZ,
    ended           TIMESTAMPTZ,
    status          VARCHAR(20) DEFAULT 'in_progress',
    created         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attempts_interview ON attempts(interview_id);

-- ============================================================
-- QUESTIONS
-- Generated questions for each interview/attempt
-- ============================================================
CREATE TABLE questions (
    id              SERIAL PRIMARY KEY,
    interview_id    INT NOT NULL,
    attempt_id      INT,                -- NULL = shared across all attempts (simple mode)
    text            TEXT NOT NULL,
    phase           VARCHAR(20) NOT NULL,   -- 'warmup', 'technical', 'scenario', 'closing'
    order_num       INT NOT NULL,
    question_type   VARCHAR(20),        -- 'mcq' | 'open' | 'coding' (exam questions only)
    options         TEXT,               -- JSON array — mcq choices
    correct_answer  INT,                -- mcq correct option index
    language        VARCHAR(20),        -- coding: 'javascript' | 'python' (added in migration 007)
    starter_code    TEXT,               -- coding: skeleton shown to the candidate (migration 007)
    test_cases      TEXT,               -- coding: JSON [{ input, expected_output, hidden }],
                                         --   expected_output is judge-verified, never LLM-guessed (migration 007)
    created         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_interview ON questions(interview_id);

-- ============================================================
-- ANSWERS
-- Candidate's answer to each question (text only — no audio stored)
-- ============================================================
CREATE TABLE answers (
    id              SERIAL PRIMARY KEY,
    interview_id    INT NOT NULL,
    attempt_id      INT NOT NULL,
    question_id     INT NOT NULL,
    answer_text     TEXT NOT NULL,      -- transcribed from audio, audio discarded
    created         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_answers_interview ON answers(interview_id);
CREATE INDEX idx_answers_attempt ON answers(attempt_id);

-- ============================================================
-- PROCTORING_EVENTS
-- Tab switches, fullscreen exits, face detection results
-- High write volume — BIGSERIAL for large ID space
-- ============================================================
CREATE TABLE proctoring_events (
    id              BIGSERIAL PRIMARY KEY,
    interview_id    INT NOT NULL,
    attempt_id      INT NOT NULL,
    event_type      VARCHAR(50) NOT NULL,   -- 'tab_switch', 'fullscreen_exit', 'face_absent', 'no_camera'
    severity        VARCHAR(20) NOT NULL,   -- 'low', 'medium', 'high'
    occurred        TIMESTAMPTZ NOT NULL,
    details         VARCHAR(500)
);

CREATE INDEX idx_proctoring_attempt ON proctoring_events(attempt_id);

-- ============================================================
-- REPORTS
-- AI-generated report after interview attempts complete
-- ============================================================
CREATE TABLE reports (
    id              SERIAL PRIMARY KEY,
    interview_id    INT NOT NULL,
    attempt_id      INT,                    -- NULL = summary across all attempts
    candidate_id    INT NOT NULL,
    overall_score   NUMERIC(4,2),           -- 1.00 to 10.00
    confidence      NUMERIC(4,2),
    tech_knowledge  NUMERIC(4,2),
    communication   NUMERIC(4,2),
    summary         TEXT,                   -- manager-facing summary
    strengths       TEXT,                   -- JSON array of strength strings
    tips            TEXT,                   -- JSON array — shown to candidate only
    pdf_url         VARCHAR(500),           -- Cloudinary URL of generated PDF
    status          VARCHAR(20) DEFAULT 'generating',  -- 'generating', 'ready', 'error'
    created         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_interview ON reports(interview_id);
CREATE INDEX idx_reports_candidate ON reports(candidate_id);

-- ============================================================
-- FILES
-- Track all Cloudinary uploads for auto-cleanup
-- ============================================================
CREATE TABLE files (
    id              SERIAL PRIMARY KEY,
    cloudinary_id   VARCHAR(255) NOT NULL,  -- used to delete from Cloudinary
    url             VARCHAR(500) NOT NULL,
    type            VARCHAR(50) NOT NULL,   -- 'resume', 'report', 'jd'
    owner_id        INT NOT NULL,
    owner_type      VARCHAR(20) NOT NULL,   -- 'candidate' or 'interview'
    keep_until      TIMESTAMPTZ,            -- NULL = keep forever
    deleted         TIMESTAMPTZ,
    created         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_files_cleanup ON files(keep_until) WHERE deleted IS NULL;

-- ============================================================
-- TEMPLATES (if Phase 1)
-- Saved interview configurations that manager can reuse
-- ============================================================
CREATE TABLE templates (
    id              SERIAL PRIMARY KEY,
    company_id      INT NOT NULL,
    manager_id      INT NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    attempts        INT DEFAULT 3,
    type            VARCHAR(50),            -- 'AI Voice', 'Exam', 'AI + Coding'
    report_after    VARCHAR(20) DEFAULT 'all',
    focus_prompt    TEXT,
    created         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_company ON templates(company_id);
```

---

## SQL Server Schema (run in SSMS when switching)

```sql
-- Same structure, SQL Server syntax
-- Run this in SSMS after creating the Screeno database

CREATE TABLE companies (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    name        NVARCHAR(255) NOT NULL,
    logo_url    NVARCHAR(500),
    created     DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE users (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    company_id  INT NOT NULL,
    first_name  NVARCHAR(100) NOT NULL,
    last_name   NVARCHAR(100) NOT NULL,
    email       NVARCHAR(255) NOT NULL,
    password    NVARCHAR(255) NOT NULL,
    role        NVARCHAR(20) NOT NULL,
    status      NVARCHAR(20) DEFAULT 'active',
    created     DATETIME2 DEFAULT GETDATE(),
    deleted     DATETIME2 NULL
);
CREATE UNIQUE INDEX idx_users_email ON users(company_id, email);

CREATE TABLE refresh_tokens (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    user_id     INT NOT NULL,
    token_hash  NVARCHAR(255) NOT NULL,
    expires     DATETIME2 NOT NULL,
    revoked     DATETIME2 NULL,
    created     DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE candidates (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    company_id      INT NOT NULL,
    manager_id      INT NULL,
    first_name      NVARCHAR(100) NOT NULL,
    last_name       NVARCHAR(100) NOT NULL,
    email           NVARCHAR(255) NOT NULL,
    phone           NVARCHAR(20) NULL,
    type            NVARCHAR(20) NOT NULL,
    resume_url      NVARCHAR(500) NULL,
    resume_text     NVARCHAR(MAX) NULL,
    resume_updated  DATETIME2 NULL,
    source          NVARCHAR(50) NULL,
    status          NVARCHAR(20) DEFAULT 'active',
    created         DATETIME2 DEFAULT GETDATE(),
    deleted         DATETIME2 NULL
);

CREATE TABLE interviews (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    company_id          INT NOT NULL,
    candidate_id        INT NOT NULL,
    manager_id          INT NOT NULL,
    interviewer_id      INT NULL,
    type                NVARCHAR(20) NOT NULL,
    mode                NVARCHAR(20) NOT NULL,
    interview_mode      NVARCHAR(20) NOT NULL,
    transcription_mode  NVARCHAR(20) NOT NULL,
    difficulty          NVARCHAR(20) NOT NULL,
    jd_url              NVARCHAR(500) NULL,
    jd_text             NVARCHAR(MAX) NULL,
    focus_areas         NVARCHAR(MAX) NULL,
    max_attempts        INT DEFAULT 3,
    cooldown_hours      INT DEFAULT 24,
    window_days         INT DEFAULT 7,
    report_timing       NVARCHAR(20) DEFAULT 'all',
    report_every_n      INT DEFAULT 3,
    report_emails       NVARCHAR(MAX) NULL,
    status              NVARCHAR(20) DEFAULT 'scheduled',
    token               NVARCHAR(255) NULL,
    token_expires       DATETIME2 NULL,
    window_closes       DATETIME2 NULL,
    created             DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE attempts (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    interview_id    INT NOT NULL,
    attempt_num     INT NOT NULL,
    started         DATETIME2 NULL,
    ended           DATETIME2 NULL,
    status          NVARCHAR(20) DEFAULT 'in_progress',
    created         DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE questions (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    interview_id    INT NOT NULL,
    attempt_id      INT NULL,
    text            NVARCHAR(MAX) NOT NULL,
    phase           NVARCHAR(20) NOT NULL,
    order_num       INT NOT NULL,
    question_type   NVARCHAR(20) NULL,
    options         NVARCHAR(MAX) NULL,
    correct_answer  INT NULL,
    language        NVARCHAR(20) NULL,
    starter_code    NVARCHAR(MAX) NULL,
    test_cases      NVARCHAR(MAX) NULL,
    created         DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE answers (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    interview_id    INT NOT NULL,
    attempt_id      INT NOT NULL,
    question_id     INT NOT NULL,
    answer_text     NVARCHAR(MAX) NOT NULL,
    created         DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE proctoring_events (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    interview_id    INT NOT NULL,
    attempt_id      INT NOT NULL,
    event_type      NVARCHAR(50) NOT NULL,
    severity        NVARCHAR(20) NOT NULL,
    occurred        DATETIME2 NOT NULL,
    details         NVARCHAR(500) NULL
);

CREATE TABLE reports (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    interview_id    INT NOT NULL,
    attempt_id      INT NULL,
    candidate_id    INT NOT NULL,
    overall_score   DECIMAL(4,2) NULL,
    confidence      DECIMAL(4,2) NULL,
    tech_knowledge  DECIMAL(4,2) NULL,
    communication   DECIMAL(4,2) NULL,
    summary         NVARCHAR(MAX) NULL,
    strengths       NVARCHAR(MAX) NULL,
    tips            NVARCHAR(MAX) NULL,
    pdf_url         NVARCHAR(500) NULL,
    status          NVARCHAR(20) DEFAULT 'generating',
    created         DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE files (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    cloudinary_id   NVARCHAR(255) NOT NULL,
    url             NVARCHAR(500) NOT NULL,
    type            NVARCHAR(50) NOT NULL,
    owner_id        INT NOT NULL,
    owner_type      NVARCHAR(20) NOT NULL,
    keep_until      DATETIME2 NULL,
    deleted         DATETIME2 NULL,
    created         DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE templates (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    company_id      INT NOT NULL,
    manager_id      INT NOT NULL,
    name            NVARCHAR(255) NOT NULL,
    description     NVARCHAR(MAX) NULL,
    attempts        INT DEFAULT 3,
    type            NVARCHAR(50) NULL,
    report_after    NVARCHAR(20) DEFAULT 'all',
    focus_prompt    NVARCHAR(MAX) NULL,
    created         DATETIME2 DEFAULT GETDATE()
);
```

---

## Key SQL syntax differences

| Need | PostgreSQL (Supabase) | SQL Server |
|---|---|---|
| Return inserted row | `RETURNING *` | `OUTPUT INSERTED.*` |
| Auto-increment | `SERIAL` | `IDENTITY(1,1)` |
| Long string type | `TEXT` | `NVARCHAR(MAX)` |
| Current time | `NOW()` | `GETDATE()` |
| Limit rows | `LIMIT 10` | `TOP 10` |
| Boolean | `TRUE/FALSE` | `1/0` |
| Timestamp with timezone | `TIMESTAMPTZ` | `DATETIME2` |
