const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://postgres.zhnxfghnujizjslygjfs:Dwarkesh%401234%23@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
})

async function run() {
  console.log('Dropping candidate_id from team_members…')
  await pool.query('ALTER TABLE team_members DROP COLUMN IF EXISTS candidate_id')
  console.log('Done.')

  const cols = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='team_members' ORDER BY ordinal_position"
  )
  console.log('\nteam_members columns:', cols.rows.map(r => r.column_name).join(', '))

  await pool.end()
}

run().catch(async e => { console.error('Fatal:', e.message); await pool.end() })
