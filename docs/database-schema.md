# Database Schema

This document details the updated schema for the AI Interview platform (PostgreSQL via Supabase). The schema relies entirely on primary keys, with no foreign key constraints enforced by the database (as per `AGENTS.md` guidelines). Validations and relational logic are handled in the backend code.

---

## 1. Core Tables

### `companies`
Stores the organizations using the platform.
- `id` (SERIAL PK)
- `name` (VARCHAR(255) NOT NULL)
- `logo_url` (VARCHAR(500))
- `created` (TIMESTAMPTZ DEFAULT NOW())

### `departments`
Stores departments to which internal users can belong.
- `id` (SERIAL PK)
- `name` (VARCHAR(100) NOT NULL)

### `users`
Internal system users (Managers, Interviewers, internal candidates).
- `id` (SERIAL PK)
- `emp_number` (VARCHAR(20))
- `first_name` (VARCHAR(100) NOT NULL)
- `last_name` (VARCHAR(100) NOT NULL)
- `email` (VARCHAR(255) NOT NULL UNIQUE)
- `department_id` (INT)
- `job_title` (VARCHAR(150))
- `location` (VARCHAR(100))
- `role` (VARCHAR(20) NOT NULL DEFAULT 'employee')
- `password` (VARCHAR(255))
- `company_id` (INT)
- `resume_url` (VARCHAR(500))
- `resume_updated` (TIMESTAMPTZ)
- `tags` (TEXT) - Stored as JSON array or string
- `created` (TIMESTAMPTZ DEFAULT NOW())

### `team_members`
Links users to managers (for organizational hierarchy).
- `id` (SERIAL PK)
- `manager_id` (INT NOT NULL)
- `user_id` (INT NOT NULL)
- `created` (TIMESTAMPTZ DEFAULT NOW())

---

## 2. Candidates & Interviews

### `external_candidates`
Stores external candidates who do not have system accounts.
- `id` (SERIAL PK)
- `company_id` (INT NOT NULL)
- `first_name` (VARCHAR(100) NOT NULL)
- `last_name` (VARCHAR(100) NOT NULL)
- `email` (VARCHAR(255) NOT NULL)
- `resume_url` (VARCHAR(500))
- `created` (TIMESTAMPTZ DEFAULT NOW())

### `interviews`
Core entity representing a scheduled or completed AI interview. Has exactly ONE attempt.
- `id` (SERIAL PK)
- `manager_id` (INT NOT NULL)
- `internal_user_id` (INT) - Null if external candidate
- `external_candidate_id` (INT) - Null if internal user
- `type` (VARCHAR(20) NOT NULL)
- `interview_mode` (VARCHAR(20) NOT NULL)
- `difficulty` (VARCHAR(20) NOT NULL)
- `status` (VARCHAR(20) NOT NULL DEFAULT 'scheduled')
- `result` (VARCHAR(50)) - 'pending', 'completed', 'failed_mid', 'cheating_attempt'
- `token` (VARCHAR(255)) - Magic link token
- `token_expires` (TIMESTAMPTZ)
- `question_count` (INT DEFAULT 10)
- `started_at` (TIMESTAMPTZ)
- `ended_at` (TIMESTAMPTZ)
- `created` (TIMESTAMPTZ DEFAULT NOW())

### `transcripts`
Stores the exact question-answer pairs generated during the interview.
- `id` (SERIAL PK)
- `interview_id` (INT NOT NULL)
- `question` (TEXT NOT NULL)
- `answer` (TEXT NOT NULL)
- `created` (TIMESTAMPTZ DEFAULT NOW())

---

## 3. Post-Interview & Reporting

### `scorecards`
Stores the AI-generated evaluation of the interview.
- `id` (SERIAL PK)
- `interview_id` (INT NOT NULL)
- `overall` (NUMERIC)
- `confidence` (NUMERIC)
- `tech_knowledge` (NUMERIC)
- `communication` (NUMERIC)
- `problem_solving` (NUMERIC)
- `decision` (VARCHAR(20) NOT NULL)
- `reason` (TEXT NOT NULL)
- `created` (TIMESTAMPTZ DEFAULT NOW())

### `reports`
Stores the text summary, strengths, and link to the generated PDF.
- `id` (SERIAL PK)
- `interview_id` (INT NOT NULL)
- `scorecard_id` (INT)
- `summary` (TEXT)
- `strengths` (TEXT)
- `status` (VARCHAR(20) NOT NULL DEFAULT 'generating')
- `pdf_url` (VARCHAR(500))
- `created` (TIMESTAMPTZ DEFAULT NOW())

### `report_jobs`
Async worker queue for generating PDF reports.
- `id` (SERIAL PK)
- `interview_id` (INT NOT NULL)
- `status` (VARCHAR(20) DEFAULT 'pending')
- `attempts` (INT DEFAULT 0)
- `last_error` (TEXT)
- `available_at` (TIMESTAMPTZ DEFAULT NOW())
- `started` (TIMESTAMPTZ)
- `completed` (TIMESTAMPTZ)
- `created` (TIMESTAMPTZ DEFAULT NOW())

---

## 4. System Logic

### `email_deliveries`
Logs of all emails sent out by the system.
- `id` (SERIAL PK)
- `kind` (VARCHAR(40) NOT NULL)
- `interview_id` (INT)
- `intended_to` (TEXT NOT NULL)
- `delivered_to` (TEXT NOT NULL)
- `status` (VARCHAR(20) NOT NULL)
- `error` (TEXT)
- `created` (TIMESTAMPTZ DEFAULT NOW())

### `refresh_tokens`
Tracks active refresh tokens for the 7-day authentication sessions.
- `id` (SERIAL PK)
- `user_id` (INT NOT NULL)
- `token_hash` (VARCHAR(255) NOT NULL)
- `expires` (TIMESTAMPTZ NOT NULL)
- `revoked` (TIMESTAMPTZ)
- `created` (TIMESTAMPTZ DEFAULT NOW())
