// Applies latest migrations 009 through 022 securely.
// Run: node run-migration-latest.js
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const db = require('./src/db/connection')

const MIGRATIONS = [
  '009_flow_integrity.sql',
  '010_resume_assets_and_delete.sql',
  '011_interview_windows_and_locations.sql',
  '012_monthly_occurrences.sql',
  '013_client_outcome_rounds.sql',
  '014_refresh_families.sql',
  '015_role_level_jd_and_deadline.sql',
  '016_monthly_and_mandate_cleanup.sql',
  '017_drop_unused_runtime_columns.sql',
  '018_integrity_cleanup_and_indexes.sql',
  '019_manual_mapping_policy.sql',
  '020_interview_flows.sql',
  '021_flow_report_recipients.sql',
  '022_flow_runtime_safety.sql',
]

function isObsoleteBackfillDependency(file, err) {
  const message = String(err?.message || '')
  return (
    (file === '012_monthly_occurrences.sql' && message.includes('column e.interview_id does not exist')) ||
    (file === '013_client_outcome_rounds.sql' && message.includes('relation "client_interview_records" does not exist'))
  )
}

async function shouldSkipObsoleteBackfill(file, stmt) {
  if (file === '012_monthly_occurrences.sql' && stmt.includes('e.interview_id')) {
    const rows = await db.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'monthly_assessment_enrollments'
         AND column_name = 'interview_id'
       LIMIT 1`
    )
    return rows.length === 0
  }

  if (file === '013_client_outcome_rounds.sql' && stmt.includes('FROM client_interview_records')) {
    const rows = await db.query(`SELECT to_regclass('public.client_interview_records') AS table_name`)
    return !rows[0]?.table_name
  }

  return false
}

async function main() {
  for (const file of MIGRATIONS) {
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', file),
      'utf8'
    )

    // Remove comment lines and run each statement individually.
    const cleaned = sql.split('\n').filter(line => !line.trim().startsWith('--')).join('\n')
    const statements = cleaned
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    let ok = 0
    let skipped = 0
    for (const stmt of statements) {
      if (await shouldSkipObsoleteBackfill(file, stmt)) {
        skipped++
        continue
      }
      try {
        await db.query(stmt + ';')
        ok++
      } catch (err) {
        if (isObsoleteBackfillDependency(file, err)) {
          skipped++
          continue
        }
        if (!err.message?.includes('already exists')) {
          console.error(`Failed on statement in ${file}: ${stmt}`)
          throw err
        }
      }
    }

    const suffix = skipped ? `, ${skipped} obsolete backfill skipped` : ''
    console.log(`Migration ${file} applied (${ok} statements run${suffix}).`)
  }

  process.exit(0)
}

main().catch(err => {
  console.error('Migrations failed:', err.message)
  process.exit(1)
})
