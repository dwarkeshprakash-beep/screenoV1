// Applies migration 022: candidate-flow isolation and runtime safety.
// Run: node run-migration-022.js
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const db = require('./src/db/connection')

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '022_flow_runtime_safety.sql'), 'utf8')
  await db.query(sql)
  console.log('Migration 022 applied.')
  process.exit(0)
}

main().catch(err => {
  console.error('Migration 022 failed:', err.message)
  process.exit(1)
})
