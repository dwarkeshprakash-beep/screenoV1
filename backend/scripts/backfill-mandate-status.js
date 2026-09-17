// One-off backfill for mandates created before mandate_status_history existed.
// Reconstructs each milestone from current data as a best-effort approximation —
// NOT an accurate historical replay (see caveats per status below). Idempotent:
// safe to re-run, existing (mandate_id, status) rows are never touched or duplicated.
//
// Usage (from backend/):
//   node scripts/backfill-mandate-status.js --dry-run   # print the plan, write nothing
//   node scripts/backfill-mandate-status.js             # apply it
require('dotenv').config()
const db = require('../src/db/connection')

const DRY_RUN = process.argv.includes('--dry-run')
const TERMINAL_OUTCOMES = new Set(['passed', 'failed', 'offer_made', 'hired', 'withdrawn'])

// Earliest interview or client round scheduled against the mandate, whichever came
// first. Actor is the interview's manager_id or the round's created_by_manager_id.
async function findInterviewInProgressEvent(mandateId) {
  const [interviewRow, roundRow] = await Promise.all([
    db.query(
      `SELECT manager_id AS actor_user_id, created
       FROM interviews WHERE client_template_id = @mandateId
       ORDER BY created ASC LIMIT 1`,
      { mandateId }
    ),
    db.query(
      `SELECT cr.created_by_manager_id AS actor_user_id, cr.created
       FROM client_interview_rounds cr
       JOIN client_teams ct ON ct.id = cr.client_team_id
       WHERE ct.mandate_id = @mandateId
       ORDER BY cr.created ASC LIMIT 1`,
      { mandateId }
    ),
  ])
  const candidates = [...interviewRow, ...roundRow].sort((a, b) => new Date(a.created) - new Date(b.created))
  return candidates[0] || null
}

// True only if every client_team member has a terminal outcome on their latest
// round — mirrors mandate-status.service.js's checkAutoComplete rule exactly, so a
// mandate that would auto-complete today under the new logic gets backfilled too.
async function findCompletedEvent(mandateId, teamRows) {
  if (teamRows.length === 0) return null
  let latestAt = null
  let latestActor = null
  for (const team of teamRows) {
    const rows = await db.query(
      `SELECT outcome, created_by_manager_id, updated, created
       FROM client_interview_rounds WHERE client_team_id = @clientTeamId
       ORDER BY round_number DESC LIMIT 1`,
      { clientTeamId: team.id }
    )
    const latest = rows[0]
    if (!latest || !TERMINAL_OUTCOMES.has(latest.outcome)) return null
    const at = latest.updated || latest.created
    if (!latestAt || new Date(at) > new Date(latestAt)) {
      latestAt = at
      latestActor = latest.created_by_manager_id
    }
  }
  return { actor_user_id: latestActor, created: latestAt }
}

async function planForMandate(mandate) {
  const entries = []

  // created — exact.
  entries.push({ status: 'created', actorUserId: mandate.created_by_user_id, at: mandate.created })

  // assigned_to_manager — exact, same rule as going forward. Recorded at the same
  // instant as "created" since we never tracked a separate assignment moment.
  if (mandate.created_by_user_id && Number(mandate.created_by_user_id) !== Number(mandate.manager_id)) {
    entries.push({ status: 'assigned_to_manager', actorUserId: mandate.created_by_user_id, at: mandate.created })
  }

  // candidates_assigned — earliest client_teams row. Actor is NOT recoverable:
  // client_teams never recorded who added a candidate, so this backfills with a
  // null actor (the timeline will just show no name for this entry).
  const teamRows = await db.query(
    `SELECT id, created FROM client_teams WHERE mandate_id = @mandateId ORDER BY created ASC`,
    { mandateId: mandate.id }
  )
  if (teamRows.length > 0) {
    entries.push({ status: 'candidates_assigned', actorUserId: null, at: teamRows[0].created })
  }

  // interview_in_progress — exact timestamp/actor, first interview or round found.
  const inProgress = await findInterviewInProgressEvent(mandate.id)
  if (inProgress) {
    entries.push({ status: 'interview_in_progress', actorUserId: inProgress.actor_user_id, at: inProgress.created })
  }

  // completed — approximate: only whether it's true TODAY, using the latest
  // resolved round's updated time as a proxy for "when it became complete" (we
  // don't know the actual historical moment), and its manager as a best-guess actor.
  const completed = await findCompletedEvent(mandate.id, teamRows)
  if (completed) {
    entries.push({ status: 'completed', actorUserId: completed.actor_user_id, at: completed.created })
  }

  return entries.map(entry => ({ mandateId: mandate.id, clientName: mandate.client_name, ...entry }))
}

async function main() {
  const mandates = await db.query(
    `SELECT id, client_name, manager_id, created_by_user_id, created FROM client_templates ORDER BY id ASC`
  )

  const plan = []
  for (const mandate of mandates) {
    plan.push(...(await planForMandate(mandate)))
  }

  console.log(`[backfill] ${mandates.length} mandate(s) found, ${plan.length} status entry/entries planned.`)
  for (const entry of plan) {
    console.log(`  mandate #${entry.mandateId} (${entry.clientName}) -> ${entry.status} @ ${entry.at} actor=${entry.actorUserId ?? 'null'}`)
  }

  if (DRY_RUN) {
    console.log('[backfill] Dry run only — nothing written. Re-run without --dry-run to apply.')
    process.exit(0)
  }

  let inserted = 0
  for (const entry of plan) {
    const rows = await db.query(
      `INSERT INTO mandate_status_history (mandate_id, status, actor_user_id, created)
       VALUES (@mandateId, @status, @actorUserId, @at)
       ON CONFLICT (mandate_id, status) DO NOTHING
       RETURNING id`,
      { mandateId: entry.mandateId, status: entry.status, actorUserId: entry.actorUserId || null, at: entry.at }
    )
    if (rows.length > 0) inserted++
  }
  console.log(`[backfill] Done — inserted ${inserted} of ${plan.length} planned entrie(s) (the rest already existed).`)
  process.exit(0)
}

main().catch(err => {
  console.error('[backfill] Failed:', err.message)
  process.exit(1)
})
