// run-migration-003.js — applies 003_missing_columns.sql to Supabase
// Run: node run-migration-003.js
require('dotenv').config()
const db = require('./src/db/connection')

async function run(label, sql) {
  try {
    await db.query(sql, {})
    console.log(`  ✓ ${label}`)
  } catch (e) {
    console.error(`  ✗ ${label}: ${e.message}`)
  }
}

async function main() {
  console.log('\n=== Migration 003: Missing columns ===\n')

  await run('users.availability', `ALTER TABLE users ADD COLUMN IF NOT EXISTS availability VARCHAR(20) DEFAULT 'bench'`)
  await run('interviews.client_template_id', `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS client_template_id INT`)
  await run('interviews.monthly_assessment_id', `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS monthly_assessment_id INT`)
  await run('interviews.jd_text', `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS jd_text TEXT`)
  await run('interviews.interviewer_id', `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interviewer_id INT`)
  await run('client_templates.resume_deadline', `ALTER TABLE client_templates ADD COLUMN IF NOT EXISTS resume_deadline TIMESTAMPTZ`)
  await run('monthly_assessment_enrollments.interview_id', `ALTER TABLE monthly_assessment_enrollments ADD COLUMN IF NOT EXISTS interview_id INT`)

  console.log('\n=== Verifying column presence ===\n')

  const cols = await db.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'users' AND column_name = 'availability') OR
        (table_name = 'interviews' AND column_name IN ('client_template_id','monthly_assessment_id','jd_text','interviewer_id')) OR
        (table_name = 'client_templates' AND column_name = 'resume_deadline') OR
        (table_name = 'monthly_assessment_enrollments' AND column_name = 'interview_id')
      )
    ORDER BY table_name, column_name
  `, {})

  for (const c of cols) {
    console.log(`  ✓ ${c.table_name}.${c.column_name} (${c.data_type})`)
  }

  const expected = 7
  if (cols.length < expected) {
    console.warn(`\n  WARNING: only ${cols.length}/${expected} columns verified — check errors above`)
  } else {
    console.log(`\n  All ${expected} columns confirmed present.`)
  }

  process.exit(0)
}

main().catch(e => {
  console.error('Fatal:', e.message)
  process.exit(1)
})
