// backend/src/services/mandate-status.service.js
// Tracks a mandate's lifecycle: created -> assigned_to_manager -> candidates_assigned
// -> interview_in_progress -> completed. Each milestone is auto-recorded the first
// time its triggering event happens (see call sites), never re-recorded, never regressed.
// "Interview in progress" deliberately doesn't distinguish mock vs. client interviews,
// or track per-candidate — with several candidates on a mandate, one could be mid-mock
// while another is already in a client round, so a single generic status avoids a
// misleading "which stage exactly" claim at the mandate level.
const mandateStatusRepo = require('../repositories/mandate-status-history.repository')
const clientOutcomeRoundsRepo = require('../repositories/client-outcome-rounds.repository')

const STATUS_ORDER = [
  'created',
  'assigned_to_manager',
  'candidates_assigned',
  'interview_in_progress',
  'completed',
]

const STATUS_LABELS = {
  created: 'Created',
  assigned_to_manager: 'Assigned to manager',
  candidates_assigned: 'Candidates assigned',
  interview_in_progress: 'Interview in progress',
  completed: 'Completed',
}

async function record(mandateId, status, actorUserId = null) {
  if (!mandateId || !STATUS_LABELS[status]) return null
  return mandateStatusRepo.record(Number(mandateId), status, actorUserId ? Number(actorUserId) : null)
}

// "Assigned to manager" is only a real, distinct event when someone other than the
// owning manager created the mandate (a BDE creating it and picking a manager to own
// it). When a manager creates their own mandate there's no separate assignment to
// record — they were never "assigned", they just own it from the start.
async function recordCreated(mandateId, actorUserId, managerId) {
  await record(mandateId, 'created', actorUserId)
  if (managerId && Number(actorUserId) !== Number(managerId)) {
    await record(mandateId, 'assigned_to_manager', actorUserId)
  }
}

async function recordCandidatesAssigned(mandateId, actorUserId) {
  return record(mandateId, 'candidates_assigned', actorUserId)
}

// Fired by either a mock interview being scheduled (Schedule button / flow engine)
// or a client round being scheduled (Rounds button) — whichever happens first.
async function recordInterviewInProgress(mandateId, actorUserId) {
  return record(mandateId, 'interview_in_progress', actorUserId)
}

async function recordCompleted(mandateId, actorUserId) {
  return record(mandateId, 'completed', actorUserId)
}

// Auto-completion check: call after any client round outcome changes. Moves the
// mandate to "completed" once every candidate on the client team has a terminal
// outcome on their latest round. A manager can also always mark it complete manually
// via recordCompleted() for cases this check won't catch.
async function checkAutoComplete(mandateId, actorUserId) {
  const resolved = await clientOutcomeRoundsRepo.allCandidatesResolved(Number(mandateId))
  if (resolved) await recordCompleted(mandateId, actorUserId)
}

function actorName(row) {
  const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim()
  return name || null
}

// Full timeline plus the derived summary fields the UI needs: who created it,
// the current stage, and (if reached) when the final stage completed.
async function getSummary(mandateId) {
  const rows = await mandateStatusRepo.getByMandate(Number(mandateId))
  const byStatus = new Map(rows.map(row => [row.status, row]))
  const timeline = STATUS_ORDER
    .filter(status => byStatus.has(status))
    .map(status => {
      const row = byStatus.get(status)
      return {
        status,
        label: STATUS_LABELS[status],
        at: row.created,
        actor_name: actorName(row),
      }
    })

  const current = timeline[timeline.length - 1] || null
  const createdEntry = timeline.find(entry => entry.status === 'created') || null
  const completedEntry = timeline.find(entry => entry.status === 'completed') || null

  return {
    timeline,
    current_status: current?.status || null,
    current_status_label: current?.label || null,
    created_by_name: createdEntry?.actor_name || null,
    created_at: createdEntry?.at || null,
    completed_at: completedEntry?.at || null,
  }
}

module.exports = {
  STATUS_ORDER,
  STATUS_LABELS,
  recordCreated,
  recordCandidatesAssigned,
  recordInterviewInProgress,
  recordCompleted,
  checkAutoComplete,
  getSummary,
}
