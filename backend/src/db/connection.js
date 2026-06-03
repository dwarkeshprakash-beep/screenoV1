// backend/src/db/connection.js
// Factory — reads DB_TYPE from env and loads the correct driver.
// All repositories import from HERE, never from a specific connection file.
//
// Switch databases by changing .env:
//   DB_TYPE=supabase    → supabase.connection.js (current)
//   DB_TYPE=sqlserver   → sqlserver.connection.js (future)

require('dotenv').config()

const DB_TYPE = process.env.DB_TYPE || 'supabase'

let db

if (DB_TYPE === 'sqlserver') {
  db = require('./sqlserver.connection')
  console.log('[db] Connected to: SQL Server (SSMS)')
} else {
  db = require('./supabase.connection')
  console.log('[db] Connected to: Supabase (PostgreSQL)')
}

module.exports = db
