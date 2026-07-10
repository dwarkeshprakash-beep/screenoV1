// backend/src/workers/outbox-worker.js
// Processes pending email_outbox_jobs using FOR UPDATE SKIP LOCKED for safe concurrency.
// Generates magic tokens JIT — never stores raw tokens for future months.

const db = require('../db/connection')
const emailService = require('../services/email.service')
const crypto = require('crypto')

const BATCH_SIZE = 10
const MAX_ATTEMPTS = 3

async function processOutboxJobs() {
  let processedCount = 0

  try {
    const jobs = await db.transaction(async (tx) => {
      const rows = await tx.query(
        `SELECT * FROM email_outbox_jobs
         WHERE status = 'pending'
           AND send_after <= CURRENT_TIMESTAMP
           AND attempts < @maxAttempts
         ORDER BY send_after ASC
         LIMIT @batchSize
         FOR UPDATE SKIP LOCKED`,
        { maxAttempts: MAX_ATTEMPTS, batchSize: BATCH_SIZE }
      )

      if (rows.length === 0) return []

      const jobIds = rows.map(r => r.id)

      await tx.query(
        `UPDATE email_outbox_jobs
         SET status = 'claimed', claimed_at = CURRENT_TIMESTAMP, attempts = attempts + 1
         WHERE id = ANY(@jobIds::int[])`,
        { jobIds }
      )

      return rows
    })

    if (!jobs || jobs.length === 0) return 0

    for (const job of jobs) {
      try {
        await processJob(job)
        await markJobStatus(job.id, 'finished')
        processedCount++
      } catch (err) {
        console.error(`[outbox-worker] Failed to process job ${job.id}:`, err.message)
        await markJobFailed(job.id, err.message)
      }
    }
  } catch (err) {
    console.error('[outbox-worker] Transaction failed:', err.message)
  }

  return processedCount
}

async function processJob(job) {
  const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : (job.payload || {})

  if (job.event_key && job.event_key.startsWith('monthly_occurrence_')) {
    if (!job.interview_id) throw new Error('monthly_occurrence job missing interview_id')

    // Fetch interview — check it is still launchable
    const rows = await db.query(
      `SELECT id, status, due_at, available_from, schedule_timezone, duration_minutes
       FROM interviews WHERE id = @id`,
      { id: job.interview_id }
    )
    const interview = rows[0]
    if (!interview) throw new Error(`Interview ${job.interview_id} not found`)
    if (interview.status === 'cancelled') {
      // Skip silently — job will be marked finished
      return
    }

    // Generate token JIT — never stored raw for future months
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    // Expiry = due_at + 24 hours
    const dueAt = interview.due_at ? new Date(interview.due_at) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const expiresAt = new Date(dueAt.getTime() + 24 * 60 * 60 * 1000)

    await db.query(
      `UPDATE interviews SET token = @tokenHash, token_expires = @expiresAt WHERE id = @id`,
      { tokenHash, expiresAt, id: interview.id }
    )

    await emailService.sendMagicLink(job.recipient, {
      candidateName: payload.candidateName || 'Candidate',
      interviewToken: rawToken,
      companyName: payload.companyName || 'Your organization',
      jobTitle: payload.jobTitle || 'Monthly Assessment',
      windowDays: 0,
      assessmentDate: interview.available_from,
      scheduleTimezone: interview.schedule_timezone,
      details: payload.details || null,
    })
  }
  // Additional job types can be handled here
}

async function markJobStatus(id, status) {
  await db.query(
    `UPDATE email_outbox_jobs
     SET status = @status, finished_at = CURRENT_TIMESTAMP, updated = CURRENT_TIMESTAMP
     WHERE id = @id`,
    { status, id }
  )
}

async function markJobFailed(id, errorMsg) {
  await db.query(
    `UPDATE email_outbox_jobs
     SET status = CASE WHEN attempts >= @maxAttempts THEN 'failed' ELSE 'pending' END,
         last_error = @errorMsg,
         updated = CURRENT_TIMESTAMP
     WHERE id = @id`,
    { maxAttempts: MAX_ATTEMPTS, errorMsg: errorMsg || 'Unknown error', id }
  )
}

// ── Worker lifecycle ──────────────────────────────────────────────────────────

let isShuttingDown = false
let workerTimer = null

async function tick() {
  if (isShuttingDown) return
  const processed = await processOutboxJobs()
  const delay = processed === 0 ? 5000 : 200
  if (!isShuttingDown) {
    workerTimer = setTimeout(tick, delay)
  }
}

function startWorker() {
  isShuttingDown = false
  console.log('[outbox-worker] Started')
  workerTimer = setTimeout(tick, 1000)
}

function stopWorker() {
  isShuttingDown = true
  if (workerTimer) clearTimeout(workerTimer)
  console.log('[outbox-worker] Stopped')
}

module.exports = {
  startWorker,
  stopWorker,
  processOutboxJobs,
}
