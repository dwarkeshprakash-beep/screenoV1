// General migration runner - applies every *.sql file in this folder that hasn't
// been recorded in schema_migrations yet, in filename order, and records it once
// applied. Run from backend/: npm run migrate  (or: node migrations/migrate.js)
//
// Fully generic: just drop a new numbered .sql file next to this one and run it
// again. Nothing in this file (or elsewhere) needs to be edited to register it.
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const db = require('../src/db/connection')

const MIGRATIONS_DIR = __dirname

// Last migration that existed before schema_migrations tracking was in place. When an
// untracked existing database is seeded, only files up to this one are assumed applied -
// anything newer still runs. (Seeding every file silently skipped real migrations
// before; see 037_companies_logo_url.sql.) Never change this value.
const PRE_TRACKING_BASELINE = '046_remove_read_permission.sql'

function listMigrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()
}

// The very first time this runs, schema_migrations doesn't exist yet. Two cases:
//  - Existing database (e.g. the current Supabase instance): its migration files
//    were already applied by hand before this tracking table existed. Record them
//    without re-running so they aren't replayed.
//  - Brand-new/empty database (e.g. a fresh clone): nothing has been applied yet,
//    so leave schema_migrations empty and let every file actually run below.
// Distinguish the two by checking whether core tables already exist - the same
// check setup-db.js used to make.
async function ensureMigrationsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  const [{ count }] = await db.query('SELECT count(*)::int AS count FROM schema_migrations')
  if (count > 0) return

  const coreTables = await db.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('users', 'interviews', 'reports')
  `)
  if (coreTables.length === 0) return

  const files = listMigrationFiles().filter(f => f <= PRE_TRACKING_BASELINE)
  for (const filename of files) {
    await db.query(
      'INSERT INTO schema_migrations (filename) VALUES (@filename) ON CONFLICT DO NOTHING',
      { filename }
    )
  }
  console.log(`[migrate] Existing database detected - seeded schema_migrations with ${files.length} pre-tracking migration(s) up to ${PRE_TRACKING_BASELINE}.`)
}

async function main() {
  await ensureMigrationsTable()

  const files = listMigrationFiles()

  const applied = new Set((await db.query('SELECT filename FROM schema_migrations')).map(r => r.filename))
  const pending = files.filter(f => !applied.has(f))

  if (pending.length === 0) {
    console.log('[migrate] No pending migrations - database is up to date.')
    process.exit(0)
  }

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    console.log(`[migrate] Applying ${file}...`)
    await db.transaction(async (tx) => {
      await tx.query(sql)
      await tx.query('INSERT INTO schema_migrations (filename) VALUES (@filename)', { filename: file })
    })
    console.log(`[migrate] Applied ${file}`)
  }

  console.log(`[migrate] Done - applied ${pending.length} migration(s).`)
  process.exit(0)
}

main().catch(err => {
  console.error('[migrate] Failed:', err.message)
  process.exit(1)
})
