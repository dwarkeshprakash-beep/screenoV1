// backend/setup-db.js
// One-time DB alignment script — aligns Supabase schema to Screeno spec.
// Run: node setup-db.js
// Safe to re-run — uses IF NOT EXISTS / IF EXISTS guards everywhere.

require('dotenv').config()
const bcrypt = require('bcryptjs')
const db = require('./src/db/connection')

async function run(label, sql, params = {}) {
  try {
    await db.query(sql, params)
    console.log(`  ✓ ${label}`)
  } catch (e) {
    console.error(`  ✗ ${label}: ${e.message}`)
  }
}

async function main() {
  console.log('\n=== Screeno DB Setup ===\n')

  // ─── 1. CREATE MISSING TABLES ────────────────────────────────
  console.log('[1] Creating missing tables...')

  await run('companies table', `
    CREATE TABLE IF NOT EXISTS companies (
      id        SERIAL PRIMARY KEY,
      name      VARCHAR(255) NOT NULL,
      logo_url  VARCHAR(500),
      created   TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await run('templates table', `
    CREATE TABLE IF NOT EXISTS templates (
      id           SERIAL PRIMARY KEY,
      company_id   INT NOT NULL,
      manager_id   INT NOT NULL,
      name         VARCHAR(255) NOT NULL,
      description  TEXT,
      attempts     INT DEFAULT 3,
      type         VARCHAR(50),
      report_after VARCHAR(20) DEFAULT 'all',
      focus_prompt TEXT,
      created      TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await run('candidate_notes table', `
    CREATE TABLE IF NOT EXISTS candidate_notes (
      id           SERIAL PRIMARY KEY,
      candidate_id INT NOT NULL,
      manager_id   INT NOT NULL,
      note         TEXT NOT NULL,
      created      TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // ─── 2. ALTER USERS TABLE ─────────────────────────────────────
  console.log('\n[2] Aligning users table...')

  await run('users.company_id column', `ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INT DEFAULT 1`)
  await run('users.deleted column', `ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted TIMESTAMPTZ`)
  // emp_number is HRMS-specific — not required for Screeno manager/interviewer users
  await run('users.emp_number nullable', `ALTER TABLE users ALTER COLUMN emp_number DROP NOT NULL`)

  // ─── 3. ALTER REFRESH_TOKENS TABLE ──────────────────────────
  console.log('\n[3] Aligning refresh_tokens table...')

  await run('refresh_tokens.revoked column', `ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS revoked TIMESTAMPTZ`)

  // ─── 4. ALTER CANDIDATES TABLE ──────────────────────────────
  console.log('\n[4] Aligning candidates table...')

  await run('candidates.company_id column', `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS company_id INT DEFAULT 1`)
  await run('candidates.resume_text column', `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_text TEXT`)
  await run('candidates.resume_updated column', `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_updated TIMESTAMPTZ`)
  await run('candidates.source column', `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual'`)
  await run('candidates.deleted column', `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS deleted TIMESTAMPTZ`)

  // Add unique constraint on (company_id, email) — ignore if already exists
  await run('candidates unique(company_id,email)', `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'candidates' AND constraint_type = 'UNIQUE'
          AND constraint_name = 'candidates_company_id_email_key'
      ) THEN
        ALTER TABLE candidates ADD CONSTRAINT candidates_company_id_email_key UNIQUE (company_id, email);
      END IF;
    END
    $$
  `)

  // ─── 5. ALTER INTERVIEWS TABLE ──────────────────────────────
  console.log('\n[5] Aligning interviews table...')

  await run('interviews.company_id column', `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS company_id INT DEFAULT 1`)
  await run('interviews.manager_id column', `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS manager_id INT`)
  await run('interviews.interviewer_id column', `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interviewer_id INT`)
  await run('interviews.mode column', `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'assessment'`)
  await run('interviews.jd_url column', `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS jd_url VARCHAR(500)`)
  await run('interviews.focus_areas column', `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS focus_areas TEXT`)
  await run('interviews.window_days column', `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS window_days INT DEFAULT 7`)
  await run('interviews.report_every_n column', `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS report_every_n INT DEFAULT 3`)
  await run('interviews.report_emails column', `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS report_emails TEXT`)
  await run('interviews.interview_mode column',    `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interview_mode VARCHAR(20) DEFAULT 'simple'`)
  await run('interviews.difficulty column',         `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'medium'`)
  await run('interviews.question_count column',     `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS question_count INT DEFAULT 10`)
  await run('interviews.jd_text column',            `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS jd_text TEXT`)
  await run('interviews.max_attempts column',       `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS max_attempts INT DEFAULT 3`)
  await run('interviews.cooldown_hours column',     `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS cooldown_hours INT DEFAULT 24`)
  await run('interviews.report_timing column',      `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS report_timing VARCHAR(20) DEFAULT 'all'`)
  await run('interviews.token_expires column',      `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS token_expires TIMESTAMPTZ`)
  await run('interviews.scheduled_start column',    `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ`)
  await run('interviews.scheduled_end column',      `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ`)
  await run('interviews.timezone column',           `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS timezone VARCHAR(100)`)
  await run('interviews.started_at column',         `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ`)
  await run('interviews.ended_at column',           `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ`)
  await run('interviews.internal_user_id column',   `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS internal_user_id INT`)
  await run('interviews.external_candidate_id col', `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS external_candidate_id INT`)

  await run('scorecards table', `
    CREATE TABLE IF NOT EXISTS scorecards (
      id SERIAL PRIMARY KEY, interview_id INT NOT NULL, candidate_id INT NOT NULL,
      interviewer_id INT NOT NULL, overall NUMERIC(4,2), confidence NUMERIC(4,2),
      tech_knowledge NUMERIC(4,2), communication NUMERIC(4,2), problem_solving NUMERIC(4,2),
      evidence TEXT, decision VARCHAR(20) NOT NULL, reason TEXT NOT NULL,
      created TIMESTAMPTZ DEFAULT NOW(), updated TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await run('scorecards unique index', `CREATE UNIQUE INDEX IF NOT EXISTS idx_scorecards_interview_interviewer ON scorecards(interview_id, interviewer_id)`)
  await run('report_jobs table', `
    CREATE TABLE IF NOT EXISTS report_jobs (
      id SERIAL PRIMARY KEY, interview_id INT NOT NULL, attempt_id INT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending', attempts INT DEFAULT 0, last_error TEXT,
      available_at TIMESTAMPTZ DEFAULT NOW(), started TIMESTAMPTZ,
      completed TIMESTAMPTZ, created TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await run('report_jobs attempt index', `CREATE UNIQUE INDEX IF NOT EXISTS idx_report_jobs_attempt ON report_jobs(attempt_id)`)
  await run('interview_notes table', `
    CREATE TABLE IF NOT EXISTS interview_notes (
      id SERIAL PRIMARY KEY, interview_id INT NOT NULL, interviewer_id INT NOT NULL,
      notes TEXT, asked_questions TEXT, created TIMESTAMPTZ DEFAULT NOW(),
      updated TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await run('interview_notes unique index', `CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_notes_owner ON interview_notes(interview_id, interviewer_id)`)
  await run('schedule_records table', `
    CREATE TABLE IF NOT EXISTS schedule_records (
      id SERIAL PRIMARY KEY, idempotency_key VARCHAR(120) NOT NULL,
      company_id INT NOT NULL, candidate_id INT NOT NULL, interview_id INT,
      status VARCHAR(20) DEFAULT 'pending', expires TIMESTAMPTZ,
      completed TIMESTAMPTZ, created TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await run('schedule_records unique index', `CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_records_key_company ON schedule_records(company_id, idempotency_key)`)
  await run('email_deliveries table', `
    CREATE TABLE IF NOT EXISTS email_deliveries (
      id SERIAL PRIMARY KEY, kind VARCHAR(40) NOT NULL, interview_id INT,
      candidate_id INT, intended_to TEXT NOT NULL, delivered_to TEXT NOT NULL,
      status VARCHAR(20) NOT NULL, error TEXT, attempts INT DEFAULT 1,
      last_attempt TIMESTAMPTZ DEFAULT NOW(), created TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await run('email_deliveries interview index', `CREATE INDEX IF NOT EXISTS idx_email_deliveries_interview ON email_deliveries(interview_id, kind, status)`)

  // ─── 6. ALTER REPORTS TABLE ──────────────────────────────────
  console.log('\n[6] Aligning reports table...')

  await run('reports.attempt_id column', `ALTER TABLE reports ADD COLUMN IF NOT EXISTS attempt_id INT`)
  await run('reports.pdf_url column', `ALTER TABLE reports ADD COLUMN IF NOT EXISTS pdf_url VARCHAR(500)`)

  // ─── 7. ALTER FILES TABLE ───────────────────────────────────
  console.log('\n[7] Aligning files table...')

  await run('files.deleted column', `ALTER TABLE files ADD COLUMN IF NOT EXISTS deleted TIMESTAMPTZ`)

  // ─── 8a. ALTER CANDIDATES TABLE — profile fields (migration 008) ──
  console.log('\n[8a] Aligning manager team roster...')

  await run('team_members table', `
    CREATE TABLE IF NOT EXISTS team_members (
      id SERIAL PRIMARY KEY, company_id INT NOT NULL, manager_id INT NOT NULL,
      user_id INT, candidate_id INT, first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL DEFAULT '', email VARCHAR(255) NOT NULL,
      phone VARCHAR(30), member_type VARCHAR(20) DEFAULT 'internal',
      employee_id VARCHAR(50), department VARCHAR(100), location VARCHAR(100),
      current_position VARCHAR(150), resume_url VARCHAR(500), resume_text TEXT,
      resume_updated TIMESTAMPTZ, last_assessed TIMESTAMPTZ,
      source VARCHAR(50) DEFAULT 'manual', created TIMESTAMPTZ DEFAULT NOW(),
      deleted TIMESTAMPTZ
    )
  `)
  await run('team_members manager email index', `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_manager_email
    ON team_members(manager_id, email) WHERE deleted IS NULL
  `)
  await run('team_members company index', `
    CREATE INDEX IF NOT EXISTS idx_team_members_company
    ON team_members(company_id) WHERE deleted IS NULL
  `)
  await run('backfill team_members from candidates', `
    INSERT INTO team_members (
      company_id, manager_id, user_id, candidate_id, first_name, last_name,
      email, phone, employee_id, department, location, current_position,
      resume_url, resume_text, resume_updated, source, created
    )
    SELECT
      c.company_id, i.manager_id, c.user_id, c.id,
      c.first_name, c.last_name, c.email, c.phone, u.emp_number,
      d.name, u.location, u.job_title, c.resume_url, c.resume_text,
      c.resume_updated, COALESCE(c.source, 'migration'), c.created
    FROM candidates c
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN LATERAL (
      SELECT manager_id FROM interviews
      WHERE candidate_id = c.id AND manager_id IS NOT NULL
      ORDER BY created DESC LIMIT 1
    ) i ON TRUE
    WHERE c.deleted IS NULL
      AND i.manager_id IS NOT NULL
    ON CONFLICT DO NOTHING
  `)
  await run('team_members.deleted column', `ALTER TABLE team_members ADD COLUMN IF NOT EXISTS deleted TIMESTAMPTZ`)
  await run('team_members unique manager+user constraint', `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'team_members' AND constraint_type = 'UNIQUE'
          AND constraint_name = 'team_members_manager_id_user_id_key'
      ) THEN
        ALTER TABLE team_members ADD CONSTRAINT team_members_manager_id_user_id_key UNIQUE (manager_id, user_id);
      END IF;
    END
    $$
  `)
  await run('candidate_notes.team_member_id column', `ALTER TABLE candidate_notes ADD COLUMN IF NOT EXISTS team_member_id INT`)
  await run('candidate_notes.candidate_id nullable', `ALTER TABLE candidate_notes ALTER COLUMN candidate_id DROP NOT NULL`)

  // ─── 8. ADD QUESTIONS.CREATED IF MISSING ────────────────────
  console.log('\n[8] Aligning questions table...')

  await run('questions.created column', `ALTER TABLE questions ADD COLUMN IF NOT EXISTS created TIMESTAMPTZ DEFAULT NOW()`)
  await run('questions.language column', `ALTER TABLE questions ADD COLUMN IF NOT EXISTS language VARCHAR(20)`)
  await run('questions.starter_code column', `ALTER TABLE questions ADD COLUMN IF NOT EXISTS starter_code TEXT`)
  await run('questions.test_cases column', `ALTER TABLE questions ADD COLUMN IF NOT EXISTS test_cases TEXT`)

  // ─── 8b. MIGRATION 002 — client/monthly/external tables ─────
  console.log('\n[8b] Applying migration 002 tables...')

  await run('external_candidates table', `
    CREATE TABLE IF NOT EXISTS external_candidates (
      id         SERIAL PRIMARY KEY,
      company_id INT NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name  VARCHAR(100) NOT NULL,
      email      VARCHAR(255) NOT NULL,
      resume_url VARCHAR(500),
      created    TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await run('client_templates table', `
    CREATE TABLE IF NOT EXISTS client_templates (
      id               SERIAL PRIMARY KEY,
      manager_id       INT NOT NULL,
      client_name      VARCHAR(255) NOT NULL,
      client_email     VARCHAR(255),
      headcount        INT DEFAULT 1,
      requirements     TEXT,
      jd_text          TEXT,
      custom_info      TEXT,
      tags             TEXT,
      resume_deadline  TIMESTAMPTZ,
      created          TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await run('monthly_assessments table', `
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
    )
  `)

  await run('monthly_assessment_enrollments table', `
    CREATE TABLE IF NOT EXISTS monthly_assessment_enrollments (
      id             SERIAL PRIMARY KEY,
      assessment_id  INT NOT NULL,
      team_member_id INT NOT NULL,
      interview_id   INT,
      start_date     TIMESTAMPTZ,
      end_date       TIMESTAMPTZ,
      month_progress TEXT,
      status         VARCHAR(20) DEFAULT 'pending',
      created        TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // ─── 8c. MIGRATION 003 — new columns ─────────────────────────
  console.log('\n[8c] Applying migration 003 columns...')

  await run('users.availability column', `ALTER TABLE users ADD COLUMN IF NOT EXISTS availability VARCHAR(20) DEFAULT 'bench'`)
  await run('team_members.tags column', `ALTER TABLE team_members ADD COLUMN IF NOT EXISTS tags TEXT`)
  await run('team_members.availability column', `ALTER TABLE team_members ADD COLUMN IF NOT EXISTS availability VARCHAR(20) DEFAULT 'bench'`)
  await run('interviews.client_template_id column', `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS client_template_id INT`)
  await run('interviews.monthly_assessment_id column', `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS monthly_assessment_id INT`)
  await run('reports.scorecard_id column', `ALTER TABLE reports ADD COLUMN IF NOT EXISTS scorecard_id INT`)
  await run('reports.status column', `ALTER TABLE reports ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'generating'`)
  await run('reports.summary column', `ALTER TABLE reports ADD COLUMN IF NOT EXISTS summary TEXT`)
  await run('reports.strengths column', `ALTER TABLE reports ADD COLUMN IF NOT EXISTS strengths TEXT`)

  // ─── 9. SEED TEST COMPANY ────────────────────────────────────
  console.log('\n[9] Seeding test company...')

  const existing = await db.query(`SELECT id FROM companies WHERE name = 'PSSPL' LIMIT 1`, {})
  if (existing.length === 0) {
    await run('insert PSSPL company', `INSERT INTO companies (id, name) VALUES (1, 'PSSPL') ON CONFLICT DO NOTHING`)
  } else {
    console.log('  ✓ Company PSSPL already exists (id=' + existing[0].id + ')')
  }

  // ─── 10. SET company_id=1 on all existing users ──────────────
  console.log('\n[10] Setting company_id=1 on existing users...')
  await run('update users.company_id', `UPDATE users SET company_id = 1 WHERE company_id IS NULL OR company_id = 0`)

  // ─── 11. SEED TEST MANAGER USER ─────────────────────────────
  console.log('\n[11] Seeding test manager user...')

  const testEmail = 'manager@psspl.com'
  const existingMgr = await db.query(`SELECT id FROM users WHERE email = @email`, { email: testEmail })
  if (existingMgr.length === 0) {
    const hash = await bcrypt.hash('Test@1234', 10)
    await run('insert manager user', `
      INSERT INTO users (company_id, first_name, last_name, email, password, role, status)
      VALUES (1, 'Test', 'Manager', @email, @hash, 'manager', 'active')
    `, { email: testEmail, hash })
  } else {
    console.log('  ✓ Test manager already exists (id=' + existingMgr[0].id + ')')
    // Ensure role is set correctly
    await run('ensure manager role', `UPDATE users SET role='manager', company_id=1 WHERE email=@email`, { email: testEmail })
  }

  // ─── 12. CLEAN UP WRONGLY MIGRATED CANDIDATES ───────────────
  console.log('\n[12] Removing any auto-migrated candidates (employees added in error)...')
  await run('remove auto-migrated candidates', `
    DELETE FROM candidates WHERE source = 'csv_import' AND manager_id IS NULL
  `)

  // ─── 13. VERIFY ──────────────────────────────────────────────
  console.log('\n[13] Verification...')

  const userCount = await db.query(`SELECT COUNT(*) AS n FROM users`, {})
  const memberCount = await db.query(`SELECT COUNT(*) AS n FROM team_members WHERE deleted IS NULL`, {})
  const mgr = await db.query(`SELECT id, email, role, company_id FROM users WHERE email = @email`, { email: testEmail })
  const comp = await db.query(`SELECT id, name FROM companies WHERE id = 1`, {})

  console.log(`  Users: ${userCount[0].n}`)
  console.log(`  Team members (active): ${memberCount[0].n}`)
  console.log(`  Company: ${JSON.stringify(comp[0])}`)
  console.log(`  Manager: ${JSON.stringify(mgr[0])}`)
  console.log('\n=== Setup complete ===')
  console.log('\nTest credentials:')
  console.log('  Email:    manager@psspl.com')
  console.log('  Password: Test@1234')
  console.log()
}

main().catch(e => {
  console.error('Fatal:', e.message)
  process.exit(1)
})
