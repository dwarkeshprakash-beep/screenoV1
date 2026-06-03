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
  await run('candidates.manager_id column', `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS manager_id INT`)
  await run('candidates.resume_updated column', `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_updated TIMESTAMPTZ`)
  await run('candidates.source column', `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual'`)
  await run('candidates.status column', `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`)
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
  await run('interviews.token_expires column', `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS token_expires TIMESTAMPTZ`)

  // ─── 6. ALTER REPORTS TABLE ──────────────────────────────────
  console.log('\n[6] Aligning reports table...')

  await run('reports.attempt_id column', `ALTER TABLE reports ADD COLUMN IF NOT EXISTS attempt_id INT`)
  await run('reports.pdf_url column', `ALTER TABLE reports ADD COLUMN IF NOT EXISTS pdf_url VARCHAR(500)`)

  // ─── 7. ALTER FILES TABLE ───────────────────────────────────
  console.log('\n[7] Aligning files table...')

  await run('files.deleted column', `ALTER TABLE files ADD COLUMN IF NOT EXISTS deleted TIMESTAMPTZ`)

  // ─── 8. ADD QUESTIONS.CREATED IF MISSING ────────────────────
  console.log('\n[8] Aligning questions table...')

  await run('questions.created column', `ALTER TABLE questions ADD COLUMN IF NOT EXISTS created TIMESTAMPTZ DEFAULT NOW()`)

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

  // Employees in the users table are NOT auto-migrated to candidates.
  // A manager adds team members manually or imports via CSV in the UI.
  // This step removes any auto-migrated candidates from a previous run of this script.
  const deleted12 = await db.query(
    `DELETE FROM candidates WHERE source = 'csv_import' AND manager_id IS NULL RETURNING id`,
    {}
  )
  console.log(`  ✓ Removed ${deleted12.length} auto-migrated candidates`)

  // ─── 13. VERIFY ──────────────────────────────────────────────
  console.log('\n[13] Verification...')

  const userCount = await db.query(`SELECT COUNT(*) AS n FROM users`, {})
  const candCount = await db.query(`SELECT COUNT(*) AS n FROM candidates WHERE deleted IS NULL`, {})
  const mgr = await db.query(`SELECT id, email, role, company_id FROM users WHERE email = @email`, { email: testEmail })
  const comp = await db.query(`SELECT id, name FROM companies WHERE id = 1`, {})

  console.log(`  Users: ${userCount[0].n}`)
  console.log(`  Candidates (active): ${candCount[0].n}`)
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
