// backend/src/db/connection.js
// All repositories import from HERE, never from supabase.connection.js directly.

require('dotenv').config()

const db = require('./supabase.connection')
console.log('[db] Connected to: PostgreSQL')

module.exports = db
