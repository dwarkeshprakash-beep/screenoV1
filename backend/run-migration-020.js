// Applies migration 020: ordered interview flows and interviewer feedback.
// Run: node run-migration-020.js
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const db = require('./src/db/connection')

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '020_interview_flows.sql'), 'utf8')
  await db.query(sql)
  console.log('Migration 020 applied.')
  process.exit(0)
}

main().catch(err => {
  console.error('Migration 020 failed:', err.message)
  process.exit(1)
})
