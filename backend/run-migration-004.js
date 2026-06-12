// Applies the V2 schema cleanup to the configured database.
// Run: node run-migration-004.js
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const db = require('./src/db/connection')

async function main() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', '004_v2_schema_cleanup.sql'),
    'utf8'
  )
  await db.query(sql)

  const obsolete = await db.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'candidate_notes',
        'interview_notes',
        'proctoring_events',
        'interview_questions',
        'schedule_records',
        'templates'
      )
  `)
  const tips = await db.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reports'
      AND column_name = 'tips'
  `)
  const obsoleteColumns = await db.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'interviews' AND column_name IN (
          'jd_text', 'interviewer_id', 'company_id', 'mode', 'jd_url',
          'focus_areas', 'window_days', 'report_every_n', 'max_attempts',
          'cooldown_hours', 'report_timing', 'scheduled_start',
          'scheduled_end', 'timezone'
        ))
        OR (table_name = 'reports' AND column_name IN ('tips', 'attempt_id'))
        OR (table_name = 'users' AND column_name = 'deleted')
        OR (table_name = 'team_members' AND column_name IN ('tags', 'availability', 'deleted'))
      )
  `)
  if (obsolete.length > 0 || tips.length > 0 || obsoleteColumns.length > 0) {
    throw new Error('Obsolete V1 schema objects are still present')
  }

  console.log('Migration 004 applied. V2 schema cleanup verified.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration 004 failed:', err.message)
  process.exit(1)
})
