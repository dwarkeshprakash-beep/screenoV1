// Applies external candidate resume-tag persistence.
// Run: node run-migration-005.js
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const db = require('./src/db/connection')

async function main() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', '005_external_candidate_tags.sql'),
    'utf8'
  )
  await db.query(sql)

  const cols = await db.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'external_candidates'
      AND column_name = 'tags'
  `)
  if (cols.length !== 1) throw new Error('external_candidates.tags was not created')

  console.log('Migration 005 applied. external_candidates.tags verified.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration 005 failed:', err.message)
  process.exit(1)
})
