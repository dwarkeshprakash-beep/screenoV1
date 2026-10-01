// One-off: set the SAME known password for every user in one organization - e.g.
// after a bulk import where you'd rather hand out one password directly than rely
// on each user going through "forgot password" (which depends on SMTP being set up).
//
// The password itself is never passed on the command line or hardcoded here - it's
// read from BULK_TEMP_PASSWORD in .env, so it never shows up in shell history or
// process listings. Add it to .env, run this, then remove it from .env again.
//
// Usage (from backend/):
//   node scripts/set-shared-password.js <companyId> --dry-run   # preview, write nothing
//   node scripts/set-shared-password.js <companyId>             # apply it
require('dotenv').config()
const bcrypt = require('bcryptjs')
const db = require('../src/db/connection')
const { validatePassword } = require('../src/utils/password-policy')

const BCRYPT_SALT_ROUNDS = 10
const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  const companyId = parseInt(process.argv[2], 10)
  if (!Number.isInteger(companyId)) {
    console.error('Usage: node scripts/set-shared-password.js <companyId> [--dry-run]')
    process.exit(1)
  }

  const password = process.env.BULK_TEMP_PASSWORD
  const validationError = validatePassword(password)
  if (validationError) {
    console.error(`[set-shared-password] BULK_TEMP_PASSWORD is missing or weak: ${validationError}`)
    process.exit(1)
  }

  const company = await db.query(`SELECT id, name FROM companies WHERE id = @id`, { id: companyId })
  if (!company[0]) {
    console.error(`[set-shared-password] No company found with id ${companyId}`)
    process.exit(1)
  }

  const users = await db.query(`SELECT id, email FROM users WHERE company_id = @companyId`, { companyId })
  console.log(`[set-shared-password] ${company[0].name}: ${users.length} user(s) would get the shared password${DRY_RUN ? ' [DRY RUN - nothing written]' : ''}`)

  if (DRY_RUN) {
    process.exit(0)
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
  const updated = await db.query(
    `UPDATE users SET password = @passwordHash WHERE company_id = @companyId RETURNING id`,
    { passwordHash, companyId }
  )
  console.log(`[set-shared-password] Updated ${updated.length} user(s). Remove BULK_TEMP_PASSWORD from .env now.`)
  process.exit(0)
}

main().catch(err => {
  console.error('[set-shared-password] Failed:', err.message)
  process.exit(1)
})
