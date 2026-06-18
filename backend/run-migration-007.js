// Applies migration 007: client teams, requirement profiles, client interview records.
// Run: node run-migration-007.js
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const db = require('./src/db/connection')

async function main() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', '007_client_teams.sql'),
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
      if (!err.message?.includes('already exists')) throw err
    }
  }

  console.log(`Migration 007 applied (${ok} statements run).`)

  // Verify tables exist
  const tables = await db.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN ('client_mandate_requirements', 'client_teams', 'client_interview_records')`
  )
  console.log('Tables created:', tables.map(r => r.table_name).join(', '))

  process.exit(0)
}

main().catch(err => {
  console.error('Migration 007 failed:', err.message)
  process.exit(1)
})
