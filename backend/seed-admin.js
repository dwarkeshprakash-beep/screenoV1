// One-off script to seed a single admin user.
//
// Reads the password from ADMIN_SEED_PASSWORD in .env — set it there before running.
//
// Usage:
//   npm run seed:admin
require('dotenv').config()
const bcrypt = require('bcryptjs')

const db = require('./src/db/connection')
const { validatePassword } = require('./src/utils/password-policy')

const ADMIN_EMAIL = 'admin@gmail.com'
const ADMIN_FIRST_NAME = 'Admin'
const ADMIN_LAST_NAME = 'User'

async function main() {
  const password = process.env.ADMIN_SEED_PASSWORD

  if (!password) {
    console.error('Set ADMIN_SEED_PASSWORD in backend/.env before running this script.')
    process.exitCode = 1
    return
  }

  const passwordError = validatePassword(password)
  if (passwordError) {
    console.error(passwordError)
    process.exitCode = 1
    return
  }

  const existing = await db.query('SELECT id, role FROM users WHERE email = @email', { email: ADMIN_EMAIL })
  if (existing[0]) {
    console.error(`A user with email "${ADMIN_EMAIL}" already exists (id=${existing[0].id}, role=${existing[0].role}). Aborting — this script does not overwrite existing accounts.`)
    process.exitCode = 1
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const rows = await db.query(
    `INSERT INTO users (first_name, last_name, email, password, role, company_id)
     VALUES (@first_name, @last_name, @email, @password, 'admin', NULL)
     RETURNING id, email, role`,
    {
      first_name: ADMIN_FIRST_NAME,
      last_name: ADMIN_LAST_NAME,
      email: ADMIN_EMAIL,
      password: passwordHash,
    }
  )

  console.log('Admin user created:', rows[0])
}

main()
  .catch((err) => {
    console.error('Failed to seed admin user:', err.message)
    process.exitCode = 1
  })
  .finally(() => {
    process.exit(process.exitCode || 0)
  })
