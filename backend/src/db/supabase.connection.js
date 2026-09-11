// backend/src/db/supabase.connection.js
// PostgreSQL connection via pg (node-postgres). Works against Supabase or any other
// Postgres host — point DATABASE_URL at it.
// Port 6543 = pgBouncer transaction pooler — no session-level commands (Supabase-specific).
// Converts @paramName → $1, $2 so all repos can use readable named params.

const { Pool } = require('pg')

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
