const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.zhnxfghnujizjslygjfs:Dwarkesh%401234%23@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);
  
  const tables = {};
  for (const row of res.rows) {
    if (!tables[row.table_name]) tables[row.table_name] = [];
    tables[row.table_name].push(`${row.column_name} (${row.data_type})`);
  }
  
  for (const [table, cols] of Object.entries(tables)) {
    console.log(`Table: ${table}`);
    cols.forEach(c => console.log(`  - ${c}`));
    console.log('');
  }
  await client.end();
}

run().catch(console.error);
