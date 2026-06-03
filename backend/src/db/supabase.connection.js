// backend/src/db/supabase.connection.js
// PostgreSQL connection to Supabase via pg (node-postgres).
// Port 6543 = pgBouncer transaction pooler — no session-level commands.
// Converts @paramName → $1, $2 so all repos can use readable named params.

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Supabase uses self-signed cert
  },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.on('error', (err) => {
  console.error('[db] Pool error:', err.message)
})

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
  const client = await pool.connect()

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

module.exports = { query }
