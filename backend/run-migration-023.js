// Applies migration 023: mandate last-modified tracking.
// Run: node run-migration-023.js
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const db = require('./src/db/connection')

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '023_mandate_updated_at.sql'), 'utf8')
  await db.query(sql)
  console.log('Migration 023 applied.')
  process.exit(0)
}

main().catch(err => {
  console.error('Migration 023 failed:', err.message)
  process.exit(1)
})
