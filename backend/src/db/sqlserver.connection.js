// backend/src/db/sqlserver.connection.js
// SQL Server connection via mssql.
// Activate by setting DB_TYPE=sqlserver in .env.
//
// Key translation done here so repositories stay identical for both DBs:
//   @param   → native mssql named params (no conversion needed)
//   RETURNING * → OUTPUT INSERTED.* (repositioned before VALUES / WHERE)

const sql = require('mssql')

const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'Screeno',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
}

let pool = null

async function getPool() {
  if (pool) return pool
  pool = await sql.connect(config)
  return pool
}

/**
 * Translate PostgreSQL RETURNING * to SQL Server OUTPUT INSERTED.*.
 * INSERT: add OUTPUT INSERTED.* before VALUES
 * UPDATE: add OUTPUT INSERTED.* before WHERE
 * DELETE: add OUTPUT DELETED.*  before WHERE
 */
function translateReturning(sqlText) {
  if (!/RETURNING \*/i.test(sqlText)) return sqlText

  let out = sqlText.replace(/\s*RETURNING \*/gi, '')

  if (/^\s*INSERT/i.test(out)) {
    out = out.replace(/\bVALUES\b/i, 'OUTPUT INSERTED.* VALUES')
  } else if (/^\s*UPDATE/i.test(out)) {
    out = out.replace(/\bWHERE\b/i, 'OUTPUT INSERTED.* WHERE')
  } else if (/^\s*DELETE/i.test(out)) {
    out = out.replace(/\bWHERE\b/i, 'OUTPUT DELETED.* WHERE')
  }

  return out
}

/**
 * Run a parameterized SQL query against SQL Server.
 * @param {string} sqlText - SQL with @name style params
 * @param {Object} params  - param values
 * @returns {Promise<Array>} array of result rows
 */
async function query(sqlText, params = {}) {
  const conn = await getPool()
  const request = conn.request()

  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value)
  })

  const translated = translateReturning(sqlText)

  try {
    const result = await request.query(translated)
    return result.recordset
  } catch (err) {
    console.error('[db] Query failed:', err.message)
    console.error('[db] SQL:', translated)
    throw err
  }
}

module.exports = { query }
