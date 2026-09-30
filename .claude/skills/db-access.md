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

Only repositories import this. Routes, services and workers never touch the database directly.

```js
// backend/src/db/connection.js
// All repositories import from HERE, never from supabase.connection.js directly.

require('dotenv').config()

const db = require('./supabase.connection')
// The pool connects lazily on the first query - GET /health confirms connectivity.
console.log('[db] PostgreSQL pool configured')

module.exports = db
```

---

## File 2: supabase.connection.js (PostgreSQL)

The real file, verbatim. It exports `query(sql, params)` for single statements and
`transaction(work)` for several statements on one client (BEGIN / COMMIT, ROLLBACK on error).

```js
// backend/src/db/supabase.connection.js
// PostgreSQL connection via pg (node-postgres). Works against Supabase or any other
// Postgres host - point DATABASE_URL at it.
// Port 6543 = pgBouncer transaction pooler - no session-level commands (Supabase-specific).
// Converts @paramName → $1, $2 so all repos can use readable named params.

const { Pool, types } = require('pg')

// node-postgres parses DATE columns (OID 1082) into a JS Date anchored to *local* midnight,
// not UTC. Serializing that with toISOString() (as res.json() does) shifts it onto the
// previous/next UTC day whenever the server's local timezone offset is non-zero - e.g. a
// period_month of "2026-09-01" silently becomes "2026-08-31T18:30:00.000Z" in IST, bucketing
// it into August everywhere it's displayed. Keep DATE columns as their raw "YYYY-MM-DD"
// string instead - a bare date string parses as UTC midnight everywhere it's later consumed.
types.setTypeParser(1082, value => value)

// Supabase requires SSL with a self-signed cert, so SSL is on by default.
// Set DB_SSL=false in .env for a host that doesn't support/require SSL (e.g. local Postgres).
const sslEnabled = process.env.DB_SSL !== 'false'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

const RETRYABLE_CONNECTION_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT'])

pool.on('error', (err) => {
  console.error('[db] Pool error:', err.message)
})

/**
 * Acquire a database client, retrying once for temporary network failures.
 * The retry occurs before a SQL statement is sent, so writes are not duplicated.
 * @returns {Promise<import('pg').PoolClient>}
 */
async function connectWithRetry() {
  try {
    return await pool.connect()
  } catch (err) {
    if (!RETRYABLE_CONNECTION_CODES.has(err.code)) throw err
    await new Promise(resolve => setTimeout(resolve, 500))
    return pool.connect()
  }
}

/**
 * Convert @paramName markers to $1, $2 positional params for PostgreSQL.
 * @param {string} sql - SQL with @name params
 * @param {Object} params - key/value param map
 * @returns {{ sql: string, values: Array }}
 */
function convertParams(sql, params) {
  const values = []
  let counter = 1

  const convertedSql = sql.replace(/@(\w+)/g, (_, paramName) => {
    if (!(paramName in params)) {
      throw new Error(`Missing query parameter: @${paramName}`)
    }
    values.push(params[paramName])
    return `$${counter++}`
  })

  return { sql: convertedSql, values }
}

/**
 * Run a parameterized SQL query.
 * @param {string} sql - SQL with @name style params
 * @param {Object} params - param values, e.g. { companyId: 1 }
 * @returns {Promise<Array>} array of result rows
 */
async function query(sql, params = {}) {
  const client = await connectWithRetry()

  try {
    const { sql: convertedSql, values } = convertParams(sql, params)
    const result = await client.query(convertedSql, values)
    return result.rows
  } catch (err) {
    console.error('[db] Query failed:', err.message)
    console.error('[db] SQL:', sql)
    throw err
  } finally {
    client.release()
  }
}

/**
 * Run multiple statements on one client inside a transaction.
 * @param {(tx: {query: Function}) => Promise<any>} work
 * @returns {Promise<any>}
 */
async function transaction(work) {
  const client = await connectWithRetry()
  const tx = {
    query: async (sql, params = {}) => {
      const { sql: convertedSql, values } = convertParams(sql, params)
      const result = await client.query(convertedSql, values)
      return result.rows
    },
  }

  try {
    await client.query('BEGIN')
    const result = await work(tx)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

module.exports = { query, transaction }
```

---

## How repositories use the connection (example)

A real repository: plain queries use `db.query`; a multi-step change that must be atomic is one
repository function using `db.transaction`, with `tx.query` for every statement inside it
(`FOR UPDATE` locks the row for the rest of the transaction). Services call these functions and
never build SQL themselves.

```js
// backend/src/repositories/password-reset.repository.js
const db = require('../db/connection')

async function create(userId, tokenHash, expires) {
  const rows = await db.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires)
     VALUES (@userId, @tokenHash, @expires)
     RETURNING *`,
    { userId, tokenHash, expires }
  )
  return rows[0]
}

async function getValidByHash(tokenHash) {
  const rows = await db.query(
    `SELECT *
     FROM password_reset_tokens
     WHERE token_hash = @tokenHash
       AND used = FALSE
       AND expires > NOW()
     ORDER BY created DESC
     LIMIT 1`,
    { tokenHash }
  )
  return rows[0] || null
}

/**
 * Atomically consume a valid reset token and set the user's new password. The token row
 * is locked for the check+update, so two concurrent submits (double-click, two tabs)
 * can't both pass the validity check before either marks it used.
 * @returns {Promise<object|null>} the consumed token row, or null if invalid/expired/used
 */
async function consumeAndSetPassword(tokenHash, passwordHash) {
  return db.transaction(async (tx) => {
    const rows = await tx.query(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = @tokenHash AND used = FALSE AND expires > NOW()
       FOR UPDATE`,
      { tokenHash }
    )
    const stored = rows[0]
    if (!stored) return null

    await tx.query(`UPDATE password_reset_tokens SET used = TRUE WHERE id = @id`, { id: stored.id })
    await tx.query(`UPDATE users SET password = @passwordHash WHERE id = @userId`, {
      passwordHash, userId: stored.user_id,
    })
    return stored
  })
}

module.exports = { create, getValidByHash, consumeAndSetPassword }
```

When business rules must run while a row is locked, the service passes a callback instead of
moving the rules into SQL - see `interviewRepository.claimByTokenHash(tokenHash, validate)`, used
by `authService.claimMagicLink`.

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

From `backend/`, run `npm run migrate` (or `node migrations/migrate.js`). It applies every
`migrations/*.sql` file not yet recorded in the `schema_migrations` tracking table, in
filename order, and is safe to re-run — already-applied files are skipped. Add a new
migration by dropping a numbered `.sql` file in `migrations/`; nothing else needs editing
to register it.

This same command also bootstraps a brand-new database: point `DATABASE_URL` at an empty
Postgres instance and run `npm run migrate` — it detects there's no existing schema and
actually executes every migration file in order, instead of just recording them as already
applied (which is what it does against a database that already has the schema).

On an existing database that has no `schema_migrations` table yet, it records only the files up to
`046_remove_read_permission.sql` (`PRE_TRACKING_BASELINE` in `migrate.js`) as already applied, so
anything newer still runs. Never change that value.
