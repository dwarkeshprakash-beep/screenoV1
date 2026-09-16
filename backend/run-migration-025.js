// Applies migration 025: store the original JD file (path + filename) on mandates and role profiles.
// Run: node run-migration-025.js
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const db = require('./src/db/connection')

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '025_mandate_jd_file.sql'), 'utf8')
  await db.query(sql)
  console.log('Migration 025 applied.')
  process.exit(0)
}

main().catch(err => {
  console.error('Migration 025 failed:', err.message)
  process.exit(1)
})
