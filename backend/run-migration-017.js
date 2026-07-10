// Applies migration 017: drop unused runtime columns.
// Run: node run-migration-017.js
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const db = require('./src/db/connection')

async function main() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', '017_drop_unused_runtime_columns.sql'),
    'utf8'
  )

  await db.query(sql)
  console.log('Migration 017 applied.')
  process.exit(0)
}

main().catch(err => {
  console.error('Migration 017 failed:', err.message)
  process.exit(1)
})
