// Applies migration 018: mandate role tag column, integrity cleanup, indexes, and operational retention.
// Run: node run-migration-018.js
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const db = require('./src/db/connection')

async function main() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', '018_integrity_cleanup_and_indexes.sql'),
    'utf8'
  )

  await db.query(sql)
  console.log('Migration 018 applied.')
  process.exit(0)
}

main().catch(err => {
  console.error('Migration 018 failed:', err.message)
  process.exit(1)
})
