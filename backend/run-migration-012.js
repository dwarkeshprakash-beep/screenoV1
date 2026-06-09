const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://postgres.zhnxfghnujizjslygjfs:Dwarkesh%401234%23@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
})

async function run() {
  // Pre-flight check in JS (avoids the DO $$ parsing headache)
  const missing = await pool.query('SELECT COUNT(*) n FROM candidates WHERE user_id IS NULL AND deleted IS NULL')
  if (parseInt(missing.rows[0].n, 10) > 0) {
    console.error('ABORT: active candidates without user_id — fix them first')
    await pool.end(); process.exit(1)
  }
  console.log('Pre-flight OK: all active candidates have user_id')

  const stmts = [
    `ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_company_id_email_key`,
    `DROP INDEX IF EXISTS candidates_company_id_email_key`,
    `ALTER TABLE candidates
       DROP COLUMN IF EXISTS first_name,
       DROP COLUMN IF EXISTS last_name,
       DROP COLUMN IF EXISTS email,
       DROP COLUMN IF EXISTS phone`,
    `ALTER TABLE candidates
       ADD CONSTRAINT candidates_company_id_user_id_key UNIQUE (company_id, user_id)`,
    `ALTER TABLE candidates ALTER COLUMN user_id SET NOT NULL`,
  ]

  for (let i = 0; i < stmts.length; i++) {
    const preview = stmts[i].replace(/\s+/g, ' ').substring(0, 80)
    process.stdout.write(`  [${i + 1}] ${preview}… `)
    const r = await pool.query(stmts[i])
    console.log(`OK (${r.rowCount ?? '?'})`)
  }

  console.log('\n── candidates columns ────────────────────────────────────────')
  const cols = await pool.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='candidates' ORDER BY ordinal_position")
  for (const r of cols.rows) console.log(`  ${r.column_name} (nullable=${r.is_nullable})`)

  console.log('\n── candidates + user join ────────────────────────────────────')
  const rows = await pool.query(`
    SELECT c.id, c.user_id, c.company_id, c.last_assessed,
           u.first_name, u.last_name, u.email
    FROM candidates c JOIN users u ON u.id = c.user_id
    WHERE c.deleted IS NULL ORDER BY c.id
  `)
  for (const r of rows.rows) {
    console.log(`  id=${r.id} | user=${r.user_id} | ${r.first_name} ${r.last_name} <${r.email}> | last_assessed=${r.last_assessed}`)
  }

  await pool.end()
  console.log('\nDone.')
}

run().catch(async e => { console.error('Fatal:', e.message); await pool.end() })
