// Applies migration 026: supporting indexes for multi-resume listing and mandate in-use checks.
// Run: node run-migration-026.js
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const db = require('./src/db/connection')

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '026_resume_indexes.sql'), 'utf8')
  await db.query(sql)
  console.log('Migration 026 applied.')
  process.exit(0)
}

main().catch(err => {
  console.error('Migration 026 failed:', err.message)
  process.exit(1)
})
