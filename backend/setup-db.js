// Creates a new Screeno V2 database from the checked-in migrations.
// Existing databases must be upgraded with the numbered migration runners.

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const db = require('./src/db/connection')

const MIGRATIONS = [
  '001_initial_schema.sql',
  '002_new_feature_tables.sql',
  '003_missing_columns.sql',
  '004_v2_schema_cleanup.sql',
  '005_external_candidate_tags.sql',
  '006_missing_indexes.sql',
  '007_client_teams.sql',
  '008_state_flow_fixes.sql',
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
]

async function main() {
  const existing = await db.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('users', 'interviews', 'reports')
  `)

  if (existing.length > 0 && process.env.RESET_DATABASE !== 'true') {
    throw new Error(
      'Core tables already exist. Refusing destructive setup; run the numbered migration scripts instead.'
    )
  }

  for (const migration of MIGRATIONS) {
    const sql = fs.readFileSync(path.join(__dirname, 'migrations', migration), 'utf8')
    console.log(`[setup] Applying ${migration}`)
    await db.query(sql)
  }

  console.log('[setup] Screeno V2 schema created successfully.')
  process.exit(0)
}

main().catch((err) => {
  console.error('[setup] Failed:', err.message)
  process.exit(1)
})
