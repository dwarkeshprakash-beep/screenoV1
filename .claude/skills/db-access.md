# SKILL: Database Access — Screeno

> Two database connection files. Same interface. Switch with one env variable.
> Current: Supabase (PostgreSQL). Future: SQL Server (SSMS).

---

## Architecture — Strategy Pattern

Both connection files expose EXACTLY the same function signature:

```js
query(sql, params) → returns array of rows
```

All repositories write SQL with `@param` style (readable named params).
The connection layer handles the translation so repos never need to change.

```
Repository
  ↓ writes: SELECT * FROM users WHERE id = @id
  ↓ calls:  db.query(sql, { id: 1 })

connection.js (factory)
  ↓ reads DB_TYPE from .env
  ↓ loads supabase.connection.js OR sqlserver.connection.js

supabase.connection.js      sqlserver.connection.js
  converts @id → $1           uses @id natively
  passes [1] to pg             passes { id: 1 } to mssql
```

---

## File 1: connection.js (the factory)

```js
// backend/src/db/connection.js
// ─────────────────────────────────────────────────────────────
// Factory file — this is the ONLY file repositories should import.
// It reads DB_TYPE from environment and loads the correct driver.
//
// Usage in repositories:
//   const db = require('../db/connection')
//   const rows = await db.query('SELECT * FROM users WHERE id = @id', { id: 1 })
//
// To switch databases: change DB_TYPE in .env
//   DB_TYPE=supabase    → uses supabase.connection.js (PostgreSQL)
//   DB_TYPE=sqlserver   → uses sqlserver.connection.js (SQL Server)
// ─────────────────────────────────────────────────────────────

const DB_TYPE = process.env.DB_TYPE || 'supabase'

// Load the correct connection file based on DB_TYPE
let db

if (DB_TYPE === 'sqlserver') {
  // SQL Server (SSMS) — future option
  db = require('./sqlserver.connection')
  console.log('Database: SQL Server (SSMS)')
} else {
  // Supabase (PostgreSQL) — current default
  db = require('./supabase.connection')
  console.log('Database: Supabase (PostgreSQL)')
}

// Export the same interface regardless of which DB is loaded
// Both files have:  module.exports = { query }
module.exports = db
```

---

## File 2: supabase.connection.js (PostgreSQL — current)

```js
// backend/src/db/supabase.connection.js
// ─────────────────────────────────────────────────────────────
// PostgreSQL connection for Supabase.
//
// Key points:
// - Uses 'pg' npm package (node-postgres)
// - Port 6543 = Supabase transaction pooler (pgBouncer)
//   This means: no session-level SET commands, no LISTEN/NOTIFY
//   For our use case (simple CRUD), this is fine.
// - SSL required: rejectUnauthorized: false (Supabase uses self-signed cert)
// - Converts @param named params to $1, $2 (PostgreSQL syntax)
// ─────────────────────────────────────────────────────────────

const { Pool } = require('pg')

// ── CONNECTION POOL ──────────────────────────────────────────
// Pool reuses connections instead of opening a new one every query.
// max: 5 — keep small because pgBouncer has connection limits
// idleTimeoutMillis: 30000 — release idle connections after 30s
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // Required for Supabase — they use self-signed certificates
    rejectUnauthorized: false
  },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

// Log when pool has errors (important for debugging)
pool.on('error', (err) => {
  console.error('Database pool error:', err.message)
})

// ── PARAM CONVERTER ──────────────────────────────────────────
// PostgreSQL uses $1, $2, $3 for query params.
// We write @paramName in our SQL (more readable, same as SQL Server).
// This function converts: @name → $1, @email → $2, etc.
//
// Example:
//   Input:  "SELECT * FROM users WHERE id = @id AND role = @role"
//           { id: 1, role: 'manager' }
//   Output: "SELECT * FROM users WHERE id = $1 AND role = $2"
//           [1, 'manager']
function convertParams(sql, params) {
  // Values array in the order params appear in SQL
  const values = []
  let counter = 1

  // Replace each @paramName with $N and collect the value
  const convertedSql = sql.replace(/@(\w+)/g, (match, paramName) => {
    // Check the param exists — helps catch typos early
    if (!(paramName in params)) {
      throw new Error(`Missing query parameter: @${paramName}`)
    }
    values.push(params[paramName])
    return `$${counter++}`
  })

  return { sql: convertedSql, values }
}

// ── MAIN QUERY FUNCTION ───────────────────────────────────────
// This is the only function exported — keep the interface simple.
//
// Usage examples:
//   // Get all team members for a company
//   const members = await query(
//     'SELECT * FROM candidates WHERE company_id = @companyId',
//     { companyId: 1 }
//   )
//
//   // Insert a new record
//   const rows = await query(
//     'INSERT INTO candidates (first_name, email, company_id) VALUES (@first_name, @email, @company_id) RETURNING *',
//     { first_name: 'Rahul', email: 'rahul@example.com', company_id: 1 }
//   )
async function query(sql, params = {}) {
  // Get a connection from the pool
  const client = await pool.connect()

  try {
    // Convert @params to $1 positional style
    const { sql: convertedSql, values } = convertParams(sql, params)

    // Execute the query
    const result = await client.query(convertedSql, values)

    // Return the rows array (same format as SQL Server's recordset)
    return result.rows
  } catch (err) {
    // Add the SQL to the error message to help with debugging
    console.error('Query failed:', err.message)
    console.error('SQL:', sql)
    throw err
  } finally {
    // IMPORTANT: always release the connection back to the pool
    // If we don't do this, the pool fills up and all queries hang
    client.release()
  }
}

// Export just the query function — same interface as sqlserver.connection.js
module.exports = { query }
```

---

## File 3: sqlserver.connection.js (SQL Server — future)

```js
// backend/src/db/sqlserver.connection.js
// ─────────────────────────────────────────────────────────────
// SQL Server connection for local SSMS or Azure SQL.
//
// Key points:
// - Uses 'mssql' npm package
// - Requires SQL Server Authentication (not Windows Auth)
//   See backend/CLAUDE.md for SSMS setup steps
// - Uses @param named params natively (no conversion needed)
// - Pool is managed by mssql internally
// ─────────────────────────────────────────────────────────────

const sql = require('mssql')

// ── CONNECTION CONFIG ─────────────────────────────────────────
// Read from environment variables — never hardcode credentials
const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'Screeno',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    // encrypt: true is required for Azure SQL
    // For local SSMS, set to false if you get SSL errors
    encrypt: process.env.DB_ENCRYPT === 'true',
    // trustServerCertificate: true allows self-signed certs (local dev)
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  }
}

// ── CONNECTION POOL ───────────────────────────────────────────
// Lazy connection — only connects when first query is made
// Reused for all subsequent queries
let pool = null

async function getPool() {
  // If pool already exists and is connected, reuse it
  if (pool) return pool

  try {
    pool = await sql.connect(config)
    console.log('SQL Server connected successfully')
    return pool
  } catch (err) {
    console.error('SQL Server connection failed:', err.message)
    throw err
  }
}

// ── MAIN QUERY FUNCTION ───────────────────────────────────────
// Same interface as supabase.connection.js
// SQL Server uses @param natively — no conversion needed
//
// Usage examples:
//   const members = await query(
//     'SELECT * FROM candidates WHERE company_id = @companyId',
//     { companyId: 1 }
//   )
async function query(sqlText, params = {}) {
  const conn = await getPool()
  const request = conn.request()

  // Add each parameter to the request
  // mssql infers the SQL type automatically
  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value)
  })

  try {
    const result = await request.query(sqlText)
    // recordset is the array of rows — same as pg's result.rows
    return result.recordset
  } catch (err) {
    console.error('Query failed:', err.message)
    console.error('SQL:', sqlText)
    throw err
  }
}

module.exports = { query }
```

---

## How repositories use the connection (example)

```js
// backend/src/repositories/candidate.repository.js
// ─────────────────────────────────────────────────────────────
// All database queries for the candidates table.
// Always import from '../db/connection' — never from the specific DB file.
// ─────────────────────────────────────────────────────────────

// Import the factory — it loads the right DB automatically
const db = require('../db/connection')

/**
 * Get all candidates for a company
 * @param {number} companyId - the company's ID
 * @param {string} type - 'internal' or 'external'
 * @returns {Promise<Array>} list of candidate rows
 */
async function getByCompany(companyId, type = 'internal') {
  return db.query(
    `SELECT id, first_name, last_name, email, type, resume_url, status, created
     FROM candidates
     WHERE company_id = @companyId AND type = @type AND deleted IS NULL
     ORDER BY created DESC`,
    { companyId, type }
  )
}

/**
 * Get a single candidate by ID
 * @param {number} id - candidate ID
 * @returns {Promise<Object|null>} candidate row or null if not found
 */
async function getById(id) {
  const rows = await db.query(
    'SELECT * FROM candidates WHERE id = @id AND deleted IS NULL',
    { id }
  )
  // Return first row or null — not an array
  return rows[0] || null
}

/**
 * Create a new candidate
 * @param {Object} data - candidate fields
 * @returns {Promise<Object>} the created candidate row
 */
async function create(data) {
  // RETURNING * works in PostgreSQL — returns the inserted row
  // For SQL Server, use OUTPUT INSERTED.*
  const rows = await db.query(
    `INSERT INTO candidates (first_name, last_name, email, phone, type, company_id, manager_id, source)
     VALUES (@first_name, @last_name, @email, @phone, @type, @company_id, @manager_id, @source)
     RETURNING *`,
    {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone || null,
      type: data.type,
      company_id: data.companyId,
      manager_id: data.managerId || null,
      source: data.source || 'manual'
    }
  )
  return rows[0]
}

module.exports = { getByCompany, getById, create }
```

---

## SQL differences to watch (Supabase vs SQL Server)

| Feature | Supabase (PostgreSQL) | SQL Server |
|---|---|---|
| Return inserted row | `RETURNING *` | `OUTPUT INSERTED.*` |
| Auto-increment | `SERIAL` | `IDENTITY(1,1)` |
| String type | `VARCHAR` | `NVARCHAR` |
| Current time | `NOW()` | `GETDATE()` |
| Limit rows | `LIMIT 10` | `TOP 10` |
| String concat | `\|\|` | `+` |
| Boolean | `TRUE/FALSE` | `1/0` or `BIT` |
| Text (long) | `TEXT` | `NVARCHAR(MAX)` |
| Timestamp | `TIMESTAMPTZ` | `DATETIME2` |

When you eventually switch to SQL Server, the only things to update are:
1. Queries that use `RETURNING *` → change to `OUTPUT INSERTED.*`
2. The migration script (see `docs/database-schema.md`)
3. The `.env` `DB_TYPE=sqlserver`

---

## Running migrations

### Supabase (current)
1. Go to your Supabase project → SQL Editor
2. Paste and run `backend/migrations/001_supabase.sql`

### SQL Server (future)
1. Open SSMS → connect to `(local)` → open New Query for `Screeno` database
2. Paste and run `backend/migrations/001_sqlserver.sql`
