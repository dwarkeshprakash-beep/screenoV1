// Applies latest migrations 009 through 015 securely.
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
]

async function main() {
  for (const file of MIGRATIONS) {
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', file),
      'utf8'
    )

    // Remove comment lines and run each statement individually
    const cleaned = sql.split('\n').filter(line => !line.trim().startsWith('--')).join('\n')
    const statements = cleaned
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    let ok = 0
    for (const stmt of statements) {
      try {
        await db.query(stmt + ';')
        ok++
      } catch (err) {
        // Ignore "already exists" errors — migration is idempotent
        if (!err.message?.includes('already exists') && !err.message?.includes('does not exist')) {
          console.error(`Failed on statement in ${file}: ${stmt}`)
          throw err
        }
      }
    }

    console.log(`Migration ${file} applied (${ok} statements run).`)
  }

  process.exit(0)
}

main().catch(err => {
  console.error('Migrations failed:', err.message)
  process.exit(1)
})
