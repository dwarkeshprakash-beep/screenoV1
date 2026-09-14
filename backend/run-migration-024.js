// Applies migration 024: BDE mandate creator tracking.
// Run: node run-migration-024.js
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const db = require('./src/db/connection')

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '024_bde_mandate_creator.sql'), 'utf8')
  await db.query(sql)
  console.log('Migration 024 applied.')
  process.exit(0)
}

main().catch(err => {
  console.error('Migration 024 failed:', err.message)
  process.exit(1)
})
