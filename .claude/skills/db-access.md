# SKILL: Database Access — Screeno

> Single PostgreSQL connection file. Works against Supabase or any other Postgres host —
> just point `DATABASE_URL` at it.

---

## Architecture

All repositories import one factory file, never the connection file directly:

```
Repository
  ↓ writes: SELECT * FROM users WHERE id = @id
  ↓ calls:  db.query(sql, { id: 1 })

connection.js (factory)
  ↓ loads supabase.connection.js

supabase.connection.js
  converts @id → $1
  passes [1] to pg
```

---

## File 1: connection.js (the factory)

```js
// backend/src/db/connection.js
// ─────────────────────────────────────────────────────────────
// Factory file — this is the ONLY file repositories should import.
//
// Usage in repositories:
//   const db = require('../db/connection')
//   const rows = await db.query('SELECT * FROM users WHERE id = @id', { id: 1 })
// ─────────────────────────────────────────────────────────────

const db = require('./supabase.connection')
console.log('[db] Connected to: PostgreSQL')

module.exports = db
```

---

## File 2: supabase.connection.js (PostgreSQL)

```js
// backend/src/db/supabase.connection.js
// ─────────────────────────────────────────────────────────────
// PostgreSQL connection. Named after Supabase (the current host) but this is
// plain node-postgres — it works against any PostgreSQL instance, not just Supabase.
//
// Key points:
// - Uses 'pg' npm package (node-postgres)
// - Port 6543 = Supabase transaction pooler (pgBouncer)
//   This means: no session-level SET commands, no LISTEN/NOTIFY
//   For our use case (simple CRUD), this is fine.
//   A different Postgres host may not need a pooler at all — connect directly
//   on port 5432 instead if there's no pgBouncer in front of it.
// - SSL: rejectUnauthorized: false (Supabase uses a self-signed cert). If you
//   move to a host that doesn't need this, adjust or drop the ssl option.
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
// We write @paramName in our SQL (more readable).
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

    // Return the rows array
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

// Export just the query function
module.exports = { query }
```

---

## How repositories use the connection (example)

```js
// backend/src/repositories/candidate.repository.js
// ─────────────────────────────────────────────────────────────
// All database queries for the candidates table.
// Always import from '../db/connection' — never from supabase.connection.js directly.
// ─────────────────────────────────────────────────────────────

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

## Moving to a different PostgreSQL host

Since this is already plain `pg` against a `DATABASE_URL` connection string, moving off Supabase's
hosted Postgres to another Postgres host (self-managed, RDS, Neon, etc.) is mostly an operational
step, not a code change:

1. `pg_dump` the schema + data from the current database.
2. `pg_restore`/`psql` it into the new host.
3. Point `DATABASE_URL` at the new host.
4. Set `DB_SSL=false` in `.env` if the new host doesn't support/require SSL (e.g. local Postgres) —
   `supabase.connection.js` forces SSL by default for Supabase's self-signed cert, and a host that
   doesn't speak SSL will reject the connection with "The server does not support SSL connections".
5. Check whether the new host sits behind a transaction-mode pooler like Supabase's pgBouncer
   (port 6543) — if not, connect on the host's normal Postgres port instead.

File storage (`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, used only in `storage.service.js`) is
unrelated to `DATABASE_URL` and is unaffected by this move — you can migrate the database while
keeping Supabase Storage for resumes/reports.

---

## Running migrations

Apply `backend/migrations/*.sql` in order (see `docs/database-schema.md`), or run
`node setup-db.js` from `backend/` — it's idempotent and safe to re-run against the live database.
