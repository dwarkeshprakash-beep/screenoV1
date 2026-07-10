require('dotenv').config()
const db = require('./src/db/connection.js')
;(async () => {
  try {
    await db.query(
      "ALTER TABLE monthly_assessments ADD COLUMN IF NOT EXISTS interview_type TEXT NOT NULL DEFAULT 'exam'"
    )
    await db.query(
      "ALTER TABLE monthly_assessments ADD COLUMN IF NOT EXISTS interview_mode TEXT NOT NULL DEFAULT 'simple'"
    )
    console.log('Columns added successfully')
    process.exit(0)
  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exit(1)
  }
})()
