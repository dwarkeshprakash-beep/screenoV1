// Applies missing indexes for high-traffic lookup columns.
// Run: node run-migration-006.js
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const db = require('./src/db/connection')

async function main() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', '006_missing_indexes.sql'),
    'utf8'
  )
  await db.query(sql)

  const indexes = await db.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'idx_users_email',
        'idx_users_company_id',
        'idx_refresh_tokens_hash',
        'idx_transcripts_interview_id'
      )
  `)
  console.log(`Migration 006 applied. ${indexes.length}/4 indexes verified:`, indexes.map(r => r.indexname).join(', '))
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration 006 failed:', err.message)
  process.exit(1)
})
