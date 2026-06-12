require('dotenv').config()
const fs = require('fs')
const path = require('path')
const db = require('./src/db/connection')

async function main() {
  const rows = await db.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `)
  const tables = {}
  for (const row of rows) {
    if (!tables[row.table_name]) tables[row.table_name] = []
    tables[row.table_name].push(row)
  }
  fs.writeFileSync(
    path.join(__dirname, 'schema.json'),
    JSON.stringify(tables, null, 2) + '\n'
  )
  console.log(`Wrote ${Object.keys(tables).length} tables to schema.json.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Schema dump failed:', err.message)
  process.exit(1)
})
