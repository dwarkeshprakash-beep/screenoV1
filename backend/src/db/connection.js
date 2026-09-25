// backend/src/db/connection.js
// All repositories import from HERE, never from supabase.connection.js directly.

require('dotenv').config()

const db = require('./supabase.connection')
// The pool connects lazily on the first query - GET /health confirms connectivity.
console.log('[db] PostgreSQL pool configured')

module.exports = db
