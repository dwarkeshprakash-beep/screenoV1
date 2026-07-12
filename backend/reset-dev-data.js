// Destructive dev-data reset helper.
//
// Dry run:
//   node reset-dev-data.js
//
// Apply safe workflow cleanup:
//   CONFIRM_RESET_SCREENO_DEV_DATA=DELETE_WORKFLOW_DATA DRY_RUN=false node reset-dev-data.js
//
// Apply master-only cleanup:
//   CONFIRM_RESET_SCREENO_DEV_DATA=DELETE_WORKFLOW_DATA DRY_RUN=false RESET_MODE=master-only node reset-dev-data.js
require('dotenv').config()
const db = require('./src/db/connection')

const CONFIRM_PHRASE = 'DELETE_WORKFLOW_DATA'
const mode = process.env.RESET_MODE || 'clean-workflows'
const dryRun = process.env.DRY_RUN !== 'false'
const confirmed = process.env.CONFIRM_RESET_SCREENO_DEV_DATA === CONFIRM_PHRASE

const KEEP_TABLES_BY_MODE = {
  'clean-workflows': ['companies', 'departments', 'users', 'team_members'],
  'master-only': ['companies', 'departments', 'users'],
}

const DELETE_ORDER_BY_MODE = {
  'clean-workflows': [
    'email_outbox_jobs',
    'email_deliveries',
    'report_jobs',
    'reports',
    'scorecards',
    'transcripts',
    'monthly_assessment_occurrences',
    'assignment_requests',
    'monthly_assessment_enrollments',
    'monthly_assessments',
    'client_interview_rounds',
    'interviews',
    'client_teams',
    'client_mandate_requirements',
    'client_templates',
    'external_candidates',
    'refresh_tokens',
    'password_reset_tokens',
  ],
  'master-only': [
    'email_outbox_jobs',
    'email_deliveries',
    'report_jobs',
    'reports',
    'scorecards',
    'transcripts',
    'monthly_assessment_occurrences',
    'assignment_requests',
    'monthly_assessment_enrollments',
    'monthly_assessments',
    'client_interview_rounds',
    'interviews',
    'client_teams',
    'client_mandate_requirements',
    'client_templates',
    'external_candidates',
    'resume_assets',
    'refresh_tokens',
    'password_reset_tokens',
    'team_members',
  ],
}

function quotedIdentifier(name) {
  return `"${name.replace(/"/g, '""')}"`
}

async function tableCounts(tx, tables) {
  const counts = {}
  for (const table of tables) {
    const rows = await tx.query(`SELECT COUNT(*)::int AS count FROM ${quotedIdentifier(table)}`)
    counts[table] = rows[0]?.count || 0
  }
  return counts
}

async function main() {
  if (!KEEP_TABLES_BY_MODE[mode]) {
    throw new Error(`Unsupported RESET_MODE "${mode}". Use clean-workflows or master-only.`)
  }

  const tablesToDelete = DELETE_ORDER_BY_MODE[mode]
  const tablesToInspect = [...new Set([...tablesToDelete, ...KEEP_TABLES_BY_MODE[mode]])]

  await db.transaction(async tx => {
    const before = await tableCounts(tx, tablesToInspect)
    console.log(JSON.stringify({
      mode,
      dryRun,
      keepTables: KEEP_TABLES_BY_MODE[mode],
      deleteTables: tablesToDelete,
      before,
    }, null, 2))

    if (dryRun) {
      console.log('Dry run only. Set DRY_RUN=false and CONFIRM_RESET_SCREENO_DEV_DATA=DELETE_WORKFLOW_DATA to apply.')
      return
    }

    if (!confirmed) {
      throw new Error(`Refusing reset. Set CONFIRM_RESET_SCREENO_DEV_DATA=${CONFIRM_PHRASE} to apply.`)
    }

    for (const table of tablesToDelete) {
      await tx.query(`DELETE FROM ${quotedIdentifier(table)}`)
    }

    if (mode === 'master-only') {
      await tx.query(
        `UPDATE users
         SET resume_url = NULL,
             resume_text = NULL,
             resume_updated = NULL,
             current_resume_asset_id = NULL,
             tags = NULL,
             availability = COALESCE(availability, 'bench')`
      )
    }

    const after = await tableCounts(tx, tablesToInspect)
    console.log(JSON.stringify({ after }, null, 2))
  })
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Reset failed:', err.message)
    process.exit(1)
  })
