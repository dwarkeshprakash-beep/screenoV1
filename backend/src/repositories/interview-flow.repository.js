const db = require('../db/connection')

/** Create a mandate flow. */
async function createFlow(data) {
  const rows = await db.query(
    `INSERT INTO interview_flows (mandate_id, name, created_by_manager_id, report_user_ids)
     VALUES (@mandateId, @name, @managerId, @reportUserIds)
     RETURNING *`, data
  )
  return rows[0]
}

/** Create one ordered flow stage. */
async function createStage(data) {
  const rows = await db.query(
    `INSERT INTO interview_flow_stages
       (flow_id, stage_order, name, type, scheduled_at, schedule_timezone,
        duration_minutes, interview_mode, difficulty, question_count, require_pass,
        minimum_score, interviewer_user_id, location, meeting_url, notes)
     VALUES
       (@flowId, @stageOrder, @name, @type, @scheduledAt, @scheduleTimezone,
        @durationMinutes, @interviewMode, @difficulty, @questionCount, @requirePass,
        @minimumScore, @interviewerUserId, @location, @meetingUrl, @notes)
     RETURNING *`, data
  )
  return rows[0]
}

/** List flows and their stages for an owned mandate. */
async function listByMandate(mandateId, managerId) {
  return db.query(
    `SELECT f.*, s.id AS stage_id, s.stage_order, s.name AS stage_name, s.type,
            s.scheduled_at, s.schedule_timezone, s.duration_minutes, s.interview_mode,
            s.difficulty, s.question_count, s.require_pass, s.minimum_score,
            s.interviewer_user_id, s.location, s.meeting_url, s.notes,
            u.first_name AS interviewer_first, u.last_name AS interviewer_last,
            u.email AS interviewer_email
     FROM interview_flows f
     LEFT JOIN interview_flow_stages s ON s.flow_id = f.id
     LEFT JOIN users u ON u.id = s.interviewer_user_id
     WHERE f.mandate_id = @mandateId AND f.created_by_manager_id = @managerId
       AND f.status = 'active'
     ORDER BY f.created DESC, s.stage_order`, { mandateId, managerId }
  )
}

/** Load an owned flow and all stage rows. */
async function getOwnedFlow(flowId, managerId) {
  const flows = await db.query(
    `SELECT * FROM interview_flows WHERE id = @flowId AND created_by_manager_id = @managerId`,
    { flowId, managerId }
  )
  if (!flows[0]) return null
  const stages = await db.query(
    `SELECT * FROM interview_flow_stages WHERE flow_id = @flowId ORDER BY stage_order`,
    { flowId }
  )
  return { ...flows[0], stages }
}

/** Update an owned flow header. */
async function updateFlow(flowId, managerId, data) {
  const rows = await db.query(
    `UPDATE interview_flows
     SET name = @name, report_user_ids = @reportUserIds, updated = CURRENT_TIMESTAMP
     WHERE id = @flowId AND created_by_manager_id = @managerId AND status != 'deleted'
     RETURNING *`, { flowId, managerId, name: data.name, reportUserIds: data.reportUserIds }
  )
  return rows[0] || null
}

/** Update an existing stage without replacing its runtime identity. */
async function updateStage(stageId, flowId, data) {
  const rows = await db.query(
    `UPDATE interview_flow_stages
     SET stage_order = @stageOrder, name = @name, type = @type,
         scheduled_at = @scheduledAt, schedule_timezone = @scheduleTimezone,
         duration_minutes = @durationMinutes, interview_mode = @interviewMode,
         difficulty = @difficulty, question_count = @questionCount,
         require_pass = @requirePass, minimum_score = @minimumScore,
         interviewer_user_id = @interviewerUserId, location = @location,
         meeting_url = @meetingUrl, notes = @notes, updated = CURRENT_TIMESTAMP
     WHERE id = @stageId AND flow_id = @flowId RETURNING *`,
    { stageId, flowId, ...data }
  )
  return rows[0] || null
}

/** Keep an already-created interview aligned with edits to its active flow stage. */
async function syncScheduledStageInterviews(stageId, flowId, data) {
  return db.transaction(async tx => {
    const targets = await tx.query(
      `SELECT i.id AS interview_id, sr.id AS stage_run_id
       FROM candidate_flow_stage_runs sr
       JOIN candidate_flow_runs r ON r.id = sr.run_id
       JOIN interviews i ON i.id = sr.interview_id
       WHERE sr.stage_id = @stageId AND r.flow_id = @flowId
         AND i.status = 'scheduled'`,
      { stageId, flowId }
    )
    if (targets.length === 0) return []

    const interviewIds = targets.map(row => row.interview_id)
    const updated = await tx.query(
      `UPDATE interviews
       SET type = @type, interview_mode = @interviewMode,
           difficulty = @difficulty, question_count = @questionCount,
           duration_minutes = @durationMinutes, scheduled_at = @scheduledAt,
           available_from = @scheduledAt, due_at = @dueAt,
           token_expires = @tokenExpires,
           report_emails = @reportEmails,
           schedule_timezone = @scheduleTimezone, location = @location,
           meeting_url = CASE
             WHEN calendar_event_id IS NOT NULL AND CAST(@meetingUrl AS TEXT) IS NULL THEN meeting_url
             ELSE CAST(@meetingUrl AS TEXT)
           END
       WHERE id = ANY(@interviewIds) AND status = 'scheduled'
       RETURNING *`,
      { interviewIds, ...data }
    )

    return updated
  })
}

async function getAssignedInterviewer(interviewId) {
  const rows = await db.query(
    `SELECT u.* FROM interview_assignments a
     JOIN users u ON u.id = a.interviewer_user_id
     WHERE a.interview_id = @interviewId AND a.status != 'completed'
     ORDER BY a.id DESC LIMIT 1`,
    { interviewId }
  )
  return rows[0] || null
}

async function syncInterviewAssignments(interviewIds, interviewerUserId) {
  if (!interviewIds.length) return
  return db.transaction(async tx => {
    if (interviewerUserId) {
      await tx.query(
        `UPDATE interview_assignments
         SET interviewer_user_id = @interviewerUserId, updated = CURRENT_TIMESTAMP
         WHERE interview_id = ANY(@interviewIds) AND status != 'completed'`,
        { interviewIds, interviewerUserId }
      )
      await tx.query(
        `INSERT INTO interview_assignments (stage_run_id, interview_id, interviewer_user_id)
         SELECT sr.id, i.id, @interviewerUserId
         FROM candidate_flow_stage_runs sr
         JOIN interviews i ON i.id = sr.interview_id
         WHERE i.id = ANY(@interviewIds)
           AND NOT EXISTS (
             SELECT 1 FROM interview_assignments a WHERE a.interview_id = i.id
           )`,
        { interviewIds, interviewerUserId }
      )
    } else {
      await tx.query(
        `DELETE FROM interview_assignments
         WHERE interview_id = ANY(@interviewIds) AND status != 'completed'`,
        { interviewIds }
      )
    }
  })
}

/** Add a newly appended definition stage to candidate runs already using this flow. */
async function ensureStageRuns(stageId, flowId, stageOrder) {
  return db.query(
    `INSERT INTO candidate_flow_stage_runs
       (run_id, stage_id, stage_order, status, attempt_number)
     SELECT r.id, @stageId, @stageOrder, 'pending', 1
     FROM candidate_flow_runs r
     WHERE r.flow_id = @flowId AND r.status NOT IN ('completed', 'cancelled')
       AND NOT EXISTS (
         SELECT 1 FROM candidate_flow_stage_runs sr
         WHERE sr.run_id = r.id AND sr.stage_id = @stageId
       )
     RETURNING *`,
    { stageId, flowId, stageOrder }
  )
}

/** Remove an unused definition, or a candidate-specific stage that is still pending. */
async function deleteUnusedStage(stageId, flowId, allowPendingRuntime = false) {
  return db.transaction(async tx => {
    const references = await tx.query(
      `SELECT sr.id, sr.status, sr.interview_id
       FROM candidate_flow_stage_runs sr
       JOIN candidate_flow_runs r ON r.id = sr.run_id
       WHERE sr.stage_id = @stageId AND r.flow_id = @flowId
       FOR UPDATE`,
      { stageId, flowId }
    )
    if (references.length > 0) {
      if (!allowPendingRuntime || references.some(row => row.status !== 'pending' || row.interview_id)) {
        return null
      }
      await tx.query(
        `DELETE FROM candidate_flow_stage_runs
         WHERE id = ANY(@ids)`,
        { ids: references.map(row => row.id) }
      )
    }
    const rows = await tx.query(
      `DELETE FROM interview_flow_stages
       WHERE id = @stageId AND flow_id = @flowId
       RETURNING id`,
      { stageId, flowId }
    )
    return rows[0] || null
  })
}

/** Keep a retained runtime stage aligned after an earlier pending stage is removed. */
async function syncStageRunOrder(stageId, flowId, stageOrder) {
  return db.query(
    `UPDATE candidate_flow_stage_runs sr
     SET stage_order = @stageOrder, updated = CURRENT_TIMESTAMP
     FROM candidate_flow_runs r
     WHERE sr.run_id = r.id AND r.flow_id = @flowId AND sr.stage_id = @stageId
     RETURNING sr.*`,
    { stageId, flowId, stageOrder }
  )
}

/** Soft-delete a definition when it has no active candidate runs. */
async function deleteFlow(flowId, managerId) {
  const rows = await db.query(
    `UPDATE interview_flows f SET status = 'deleted', updated = CURRENT_TIMESTAMP
     WHERE f.id = @flowId AND f.created_by_manager_id = @managerId
       AND f.status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM candidate_flow_runs r
         WHERE COALESCE(r.template_flow_id, r.flow_id) = f.id
           AND r.status NOT IN ('completed', 'cancelled')
       )
     RETURNING f.id`, { flowId, managerId }
  )
  return rows[0] || null
}

/** Permanently delete one candidate flow run and every interview created by it. */
async function getRunDeletionContext(runId, managerId) {
  const runs = await db.query(
    `SELECT id FROM candidate_flow_runs
     WHERE id = @runId AND created_by_manager_id = @managerId`,
    { runId, managerId }
  )
  if (!runs[0]) return null
  const interviews = await db.query(
    `SELECT i.id, i.status, i.scheduled_at, i.schedule_timezone, i.location,
            i.meeting_url, i.calendar_event_id,
            COALESCE(c.first_name, ec.first_name) AS candidate_first,
            COALESCE(c.last_name, ec.last_name) AS candidate_last,
            COALESCE(c.email, ec.email) AS candidate_email,
            iu.first_name AS interviewer_first, iu.last_name AS interviewer_last,
            iu.email AS interviewer_email,
            COALESCE(s.name, 'Interview') AS stage_name,
            COALESCE(t.client_name, 'Your company') AS client_name
     FROM candidate_flow_stage_runs sr
     JOIN interviews i ON i.id = sr.interview_id
     LEFT JOIN users c ON c.id = i.internal_user_id
     LEFT JOIN external_candidates ec ON ec.id = i.external_candidate_id
     LEFT JOIN interview_assignments a ON a.interview_id = i.id
     LEFT JOIN users iu ON iu.id = a.interviewer_user_id
     LEFT JOIN interview_flow_stages s ON s.id = sr.stage_id
     LEFT JOIN candidate_flow_runs r ON r.id = sr.run_id
     LEFT JOIN interview_flows f ON f.id = r.flow_id
     LEFT JOIN client_templates t ON t.id = f.mandate_id
     WHERE sr.run_id = @runId
     ORDER BY sr.stage_order, sr.attempt_number`,
    { runId }
  )
  return { id: Number(runId), interviews }
}

async function deleteRun(runId, managerId) {
  return db.transaction(async tx => {
    const runs = await tx.query(
      `SELECT r.id, r.flow_id, f.status AS flow_status
       FROM candidate_flow_runs r
       JOIN interview_flows f ON f.id = r.flow_id
       WHERE r.id = @runId AND r.created_by_manager_id = @managerId`,
      { runId, managerId }
    )
    if (!runs[0]) return null

    const interviewRows = await tx.query(
      `SELECT id FROM interviews
       WHERE flow_stage_run_id IN (SELECT id FROM candidate_flow_stage_runs WHERE run_id = @runId)`,
      { runId }
    )
    const interviewIds = interviewRows.map(row => row.id)
    const assetRows = await tx.query(
      `SELECT storage_path FROM interview_assignment_files
       WHERE assignment_id IN (
         SELECT id FROM interview_assignments
         WHERE stage_run_id IN (SELECT id FROM candidate_flow_stage_runs WHERE run_id = @runId)
       )`, { runId }
    )

    await tx.query(
      `DELETE FROM interview_assignment_files WHERE assignment_id IN (
         SELECT id FROM interview_assignments
         WHERE stage_run_id IN (SELECT id FROM candidate_flow_stage_runs WHERE run_id = @runId)
       )`, { runId }
    )
    await tx.query(
      `DELETE FROM interview_assignments
       WHERE stage_run_id IN (SELECT id FROM candidate_flow_stage_runs WHERE run_id = @runId)`,
      { runId }
    )

    if (interviewIds.length > 0) {
      const reportAssets = await tx.query(
        `SELECT pdf_url AS storage_path FROM reports WHERE interview_id = ANY(@interviewIds)`,
        { interviewIds }
      )
      assetRows.push(...reportAssets)
      await tx.query(`DELETE FROM email_outbox_jobs WHERE interview_id = ANY(@interviewIds)`, { interviewIds })
      await tx.query(`DELETE FROM email_deliveries WHERE interview_id = ANY(@interviewIds)`, { interviewIds })
      await tx.query(`DELETE FROM report_jobs WHERE interview_id = ANY(@interviewIds)`, { interviewIds })
      await tx.query(`DELETE FROM reports WHERE interview_id = ANY(@interviewIds)`, { interviewIds })
      await tx.query(`DELETE FROM scorecards WHERE interview_id = ANY(@interviewIds)`, { interviewIds })
      await tx.query(`DELETE FROM transcripts WHERE interview_id = ANY(@interviewIds)`, { interviewIds })
      await tx.query(
        `UPDATE monthly_assessment_occurrences SET interview_id = NULL, status = 'cancelled'
         WHERE interview_id = ANY(@interviewIds)`, { interviewIds }
      )
      await tx.query(`DELETE FROM interviews WHERE id = ANY(@interviewIds)`, { interviewIds })
    }

    await tx.query(`DELETE FROM candidate_flow_stage_runs WHERE run_id = @runId`, { runId })
    await tx.query(`DELETE FROM candidate_flow_runs WHERE id = @runId`, { runId })
    if (runs[0].flow_status === 'run_specific') {
      await tx.query(`DELETE FROM interview_flow_stages WHERE flow_id = @flowId`, { flowId: runs[0].flow_id })
      await tx.query(`DELETE FROM interview_flows WHERE id = @flowId`, { flowId: runs[0].flow_id })
    }
    return { id: Number(runId), deleted: true, storagePaths: assetRows.map(row => row.storage_path).filter(Boolean) }
  })
}

/** Create a candidate run. */
async function createRun(data) {
  const rows = await db.query(
    `INSERT INTO candidate_flow_runs (flow_id, client_team_id, created_by_manager_id)
     VALUES (@flowId, @clientTeamId, @managerId) RETURNING *`, data
  )
  return rows[0]
}

/** Clone a reusable template and atomically create an isolated candidate run. */
async function createIsolatedRun(flowId, clientTeamId, managerId) {
  return db.transaction(async tx => {
    const sourceRows = await tx.query(
      `SELECT * FROM interview_flows
       WHERE id = @flowId AND created_by_manager_id = @managerId AND status = 'active'`,
      { flowId, managerId }
    )
    if (!sourceRows[0]) return null
    const source = sourceRows[0]
    const clone = (await tx.query(
      `INSERT INTO interview_flows
         (mandate_id, name, status, created_by_manager_id, report_user_ids)
       VALUES (@mandateId, @name, 'run_specific', @managerId, @reportUserIds)
       RETURNING *`,
      { mandateId: source.mandate_id, name: source.name, managerId, reportUserIds: source.report_user_ids }
    ))[0]
    const stages = await tx.query(
      `INSERT INTO interview_flow_stages
         (flow_id, stage_order, name, type, scheduled_at, schedule_timezone,
          duration_minutes, interview_mode, difficulty, question_count, require_pass,
          minimum_score, interviewer_user_id, location, meeting_url, notes)
       SELECT @cloneId, stage_order, name, type, scheduled_at, schedule_timezone,
              duration_minutes, interview_mode, difficulty, question_count, require_pass,
              minimum_score, interviewer_user_id, location, meeting_url, notes
       FROM interview_flow_stages WHERE flow_id = @flowId
       ORDER BY stage_order RETURNING *`,
      { cloneId: clone.id, flowId }
    )
    const run = (await tx.query(
      `INSERT INTO candidate_flow_runs
         (flow_id, template_flow_id, client_team_id, created_by_manager_id)
       VALUES (@cloneId, @flowId, @clientTeamId, @managerId)
       RETURNING *`,
      { cloneId: clone.id, flowId, clientTeamId, managerId }
    ))[0]
    await tx.query(
      `INSERT INTO candidate_flow_stage_runs
         (run_id, stage_id, stage_order, status, attempt_number)
       SELECT @runId, id, stage_order,
              CASE WHEN stage_order = 1 THEN 'activating' ELSE 'pending' END, 1
       FROM interview_flow_stages WHERE flow_id = @cloneId
       ORDER BY stage_order`,
      { runId: run.id, cloneId: clone.id }
    )
    const stageRuns = await tx.query(
      `SELECT * FROM candidate_flow_stage_runs WHERE run_id = @runId ORDER BY stage_order`,
      { runId: run.id }
    )
    return { run, flow: { ...clone, stages }, stageRuns }
  })
}

/** Clone a legacy shared definition before editing one candidate's run. */
async function isolateRun(runId, managerId) {
  return db.transaction(async tx => {
    const rows = await tx.query(
      `SELECT r.*, f.status AS flow_status, f.mandate_id, f.name AS flow_name,
              f.report_user_ids
       FROM candidate_flow_runs r
       JOIN interview_flows f ON f.id = r.flow_id
       WHERE r.id = @runId AND r.created_by_manager_id = @managerId
       FOR UPDATE`,
      { runId, managerId }
    )
    const current = rows[0]
    if (!current) return null
    if (current.flow_status === 'run_specific') {
      const flowRows = await tx.query(`SELECT * FROM interview_flows WHERE id = @flowId`, { flowId: current.flow_id })
      const stages = await tx.query(`SELECT * FROM interview_flow_stages WHERE flow_id = @flowId ORDER BY stage_order`, { flowId: current.flow_id })
      return { ...flowRows[0], stages }
    }
    const clone = (await tx.query(
      `INSERT INTO interview_flows
         (mandate_id, name, status, created_by_manager_id, report_user_ids)
       VALUES (@mandateId, @name, 'run_specific', @managerId, @reportUserIds)
       RETURNING *`,
      {
        mandateId: current.mandate_id, name: current.flow_name,
        managerId, reportUserIds: current.report_user_ids,
      }
    ))[0]
    const stages = await tx.query(
      `INSERT INTO interview_flow_stages
         (flow_id, stage_order, name, type, scheduled_at, schedule_timezone,
          duration_minutes, interview_mode, difficulty, question_count, require_pass,
          minimum_score, interviewer_user_id, location, meeting_url, notes)
       SELECT @cloneId, stage_order, name, type, scheduled_at, schedule_timezone,
              duration_minutes, interview_mode, difficulty, question_count, require_pass,
              minimum_score, interviewer_user_id, location, meeting_url, notes
       FROM interview_flow_stages WHERE flow_id = @flowId
       ORDER BY stage_order RETURNING *`,
      { cloneId: clone.id, flowId: current.flow_id }
    )
    await tx.query(
      `UPDATE candidate_flow_runs
       SET flow_id = @cloneId, template_flow_id = COALESCE(template_flow_id, @flowId),
           updated = CURRENT_TIMESTAMP
       WHERE id = @runId`,
      { cloneId: clone.id, flowId: current.flow_id, runId }
    )
    await tx.query(
      `UPDATE candidate_flow_stage_runs sr
       SET stage_id = s.id, updated = CURRENT_TIMESTAMP
       FROM interview_flow_stages s
       WHERE sr.run_id = @runId AND s.flow_id = @cloneId
         AND s.stage_order = sr.stage_order`,
      { runId, cloneId: clone.id }
    )
    return { ...clone, stages }
  })
}

async function getOwnedRunFlow(runId, managerId) {
  const rows = await db.query(
    `SELECT f.* FROM candidate_flow_runs r
     JOIN interview_flows f ON f.id = r.flow_id
     WHERE r.id = @runId AND r.created_by_manager_id = @managerId`,
    { runId, managerId }
  )
  if (!rows[0]) return null
  const stages = await db.query(
    `SELECT * FROM interview_flow_stages WHERE flow_id = @flowId ORDER BY stage_order`,
    { flowId: rows[0].id }
  )
  return { ...rows[0], stages }
}

async function listDirectRunIds(flowId) {
  return db.query(
    `SELECT id FROM candidate_flow_runs WHERE flow_id = @flowId ORDER BY id`,
    { flowId }
  )
}

/** Prevent the same saved flow being started twice concurrently for one candidate. */
async function getActiveRun(flowId, clientTeamId) {
  const rows = await db.query(
    `SELECT * FROM candidate_flow_runs
     WHERE COALESCE(template_flow_id, flow_id) = @flowId AND client_team_id = @clientTeamId
       AND status NOT IN ('completed', 'cancelled')
     ORDER BY created DESC LIMIT 1`,
    { flowId, clientTeamId }
  )
  return rows[0] || null
}

/** Atomically claim a paused run so duplicate manager actions cannot both progress it. */
async function claimRunStatus(runId, managerId, expectedStatuses, claimedStatus) {
  const rows = await db.query(
    `UPDATE candidate_flow_runs
     SET status = @claimedStatus, updated = CURRENT_TIMESTAMP
     WHERE id = @runId AND created_by_manager_id = @managerId
       AND status = ANY(@expectedStatuses)
     RETURNING *`,
    { runId, managerId, expectedStatuses, claimedStatus }
  )
  return rows[0] || null
}

/** Find flow interviews that were never attended before their due time. */
async function listExpiredFlowInterviews({ managerId = null, mandateId = null, userId = null, runId = null } = {}) {
  return db.query(
    `SELECT i.id AS interview_id, i.status AS interview_status,
            i.result AS interview_result, sr.run_id, sr.id AS stage_run_id,
            sr.stage_order, s.require_pass
     FROM interviews i
     JOIN candidate_flow_stage_runs sr ON sr.id = i.flow_stage_run_id
     JOIN candidate_flow_runs r ON r.id = sr.run_id
     JOIN interview_flows f ON f.id = r.flow_id
     JOIN client_teams ct ON ct.id = r.client_team_id
     JOIN interview_flow_stages s ON s.id = sr.stage_id
     WHERE r.status = 'active' AND r.current_stage_order = sr.stage_order
       AND sr.status = 'scheduled'
       AND s.type IN ('ai_voice', 'exam')
       AND (
         (i.status = 'scheduled' AND i.due_at IS NOT NULL AND i.due_at <= CURRENT_TIMESTAMP)
         OR (i.status = 'completed' AND i.result = 'expired_no_show')
       )
       AND (CAST(@managerId AS INT) IS NULL OR r.created_by_manager_id = CAST(@managerId AS INT))
       AND (CAST(@mandateId AS INT) IS NULL OR f.mandate_id = CAST(@mandateId AS INT))
       AND (CAST(@userId AS INT) IS NULL OR ct.user_id = CAST(@userId AS INT))
       AND (CAST(@runId AS INT) IS NULL OR r.id = CAST(@runId AS INT))
     ORDER BY i.due_at, i.id`,
    { managerId, mandateId, userId, runId }
  )
}

async function completeAssignmentsAsNoShow(interviewId) {
  return db.query(
    `UPDATE interview_assignments
     SET status = 'completed', outcome = 'fail',
         feedback = COALESCE(feedback, 'Candidate did not attend before the interview window expired.'),
         completed_at = CURRENT_TIMESTAMP, updated = CURRENT_TIMESTAMP
     WHERE interview_id = @interviewId AND status != 'completed'
     RETURNING *`,
    { interviewId }
  )
}

/** Create a runtime row for a stage attempt. */
async function createStageRun(data) {
  const rows = await db.query(
    `INSERT INTO candidate_flow_stage_runs
       (run_id, stage_id, stage_order, status, attempt_number)
     VALUES (@runId, @stageId, @stageOrder, @status, @attemptNumber)
     RETURNING *`, data
  )
  return rows[0]
}

/** Move an existing unscheduled attempt back into activation. */
async function updateStageRunStatus(stageRunId, status) {
  const rows = await db.query(
    `UPDATE candidate_flow_stage_runs
     SET status = @status, updated = CURRENT_TIMESTAMP
     WHERE id = @stageRunId RETURNING *`,
    { stageRunId, status }
  )
  return rows[0] || null
}

/** Connect a scheduled interview to its runtime stage. */
async function attachInterview(stageRunId, interviewId) {
  const rows = await db.query(
    `UPDATE candidate_flow_stage_runs
     SET interview_id = @interviewId, status = 'scheduled', updated = CURRENT_TIMESTAMP
     WHERE id = @stageRunId RETURNING *`, { stageRunId, interviewId }
  )
  return rows[0] || null
}

/** Load stage/run/flow/mandate context from an interview. */
async function getContextByInterview(interviewId) {
  const rows = await db.query(
    `SELECT sr.*, s.type, s.require_pass, s.minimum_score, s.scheduled_at,
            s.schedule_timezone, s.duration_minutes, s.interview_mode, s.difficulty,
            s.question_count, s.interviewer_user_id, s.location, s.meeting_url, s.notes,
            r.flow_id, r.client_team_id, r.status AS run_status,
            f.mandate_id, f.created_by_manager_id
     FROM candidate_flow_stage_runs sr
     JOIN interview_flow_stages s ON s.id = sr.stage_id
     JOIN candidate_flow_runs r ON r.id = sr.run_id
     JOIN interview_flows f ON f.id = r.flow_id
     WHERE sr.interview_id = @interviewId`, { interviewId }
  )
  return rows[0] || null
}

/** Load run context and candidate details. */
async function getRun(runId) {
  const rows = await db.query(
    `SELECT r.*, f.mandate_id, f.name AS flow_name, ct.user_id,
            f.report_user_ids,
            t.client_name, COALESCE(cmr.profile_name, t.requirements) AS role_name
     FROM candidate_flow_runs r
     JOIN interview_flows f ON f.id = r.flow_id
     JOIN client_teams ct ON ct.id = r.client_team_id
     JOIN client_templates t ON t.id = f.mandate_id
     LEFT JOIN client_mandate_requirements cmr ON cmr.id = ct.requirement_id
     WHERE r.id = @runId`, { runId }
  )
  return rows[0] || null
}

/** Load one flow stage. */
async function getStage(flowId, stageOrder) {
  const rows = await db.query(
    `SELECT * FROM interview_flow_stages WHERE flow_id = @flowId AND stage_order = @stageOrder`,
    { flowId, stageOrder }
  )
  return rows[0] || null
}

/** Mark an attempt complete or failed. */
async function finishStageRun(stageRunId, status, outcome) {
  const rows = await db.query(
    `UPDATE candidate_flow_stage_runs
     SET status = @status, outcome = @outcome, completed_at = CURRENT_TIMESTAMP,
         updated = CURRENT_TIMESTAMP
     WHERE id = @stageRunId AND status NOT IN ('passed', 'failed', 'completed')
     RETURNING *`, { stageRunId, status, outcome }
  )
  return rows[0] || null
}

/** Update candidate run progression. */
async function updateRun(runId, status, currentStageOrder) {
  const completedAt = status === 'completed' ? new Date().toISOString() : null
  const rows = await db.query(
    `UPDATE candidate_flow_runs
     SET status = @status, current_stage_order = @currentStageOrder,
         completed_at = @completedAt, updated = CURRENT_TIMESTAMP
     WHERE id = @runId RETURNING *`, { runId, status, currentStageOrder, completedAt }
  )
  return rows[0] || null
}

/** Return the latest attempt number for a stage. */
async function getLatestAttempt(runId, stageOrder) {
  const rows = await db.query(
    `SELECT * FROM candidate_flow_stage_runs
     WHERE run_id = @runId AND stage_order = @stageOrder
     ORDER BY attempt_number DESC LIMIT 1`, { runId, stageOrder }
  )
  return rows[0] || null
}

/** Create an internal interviewer assignment. */
async function createAssignment(data) {
  const rows = await db.query(
    `INSERT INTO interview_assignments
       (stage_run_id, interview_id, interviewer_user_id)
     VALUES (@stageRunId, @interviewId, @interviewerUserId) RETURNING *`, data
  )
  return rows[0]
}

/** List assignment cards visible to an interviewer. */
async function listAssignmentsForUser(userId) {
  return db.query(
    `SELECT a.*, i.type, i.scheduled_at, i.due_at, i.location, i.meeting_url,
            COALESCE(c.first_name, ec.first_name) AS candidate_first,
            COALESCE(c.last_name, ec.last_name) AS candidate_last,
            f.name AS flow_name, COALESCE(s.name, 'Single interview') AS stage_name,
            s.stage_order, COALESCE(t.client_name, ct.client_name) AS client_name,
            af.original_filename, af.storage_path
     FROM interview_assignments a
     JOIN interviews i ON i.id = a.interview_id
     LEFT JOIN users c ON c.id = i.internal_user_id
     LEFT JOIN external_candidates ec ON ec.id = i.external_candidate_id
     LEFT JOIN candidate_flow_stage_runs sr ON sr.id = a.stage_run_id
     LEFT JOIN interview_flow_stages s ON s.id = sr.stage_id
     LEFT JOIN candidate_flow_runs r ON r.id = sr.run_id
     LEFT JOIN interview_flows f ON f.id = r.flow_id
     LEFT JOIN client_templates t ON t.id = f.mandate_id
     LEFT JOIN client_templates ct ON ct.id = i.client_template_id
     LEFT JOIN interview_assignment_files af ON af.assignment_id = a.id
     WHERE a.interviewer_user_id = @userId AND i.status != 'cancelled'
     ORDER BY i.scheduled_at DESC`, { userId }
  )
}

/** Load one assignment in interviewer scope. */
async function getAssignmentForUser(assignmentId, userId) {
  const rows = await db.query(
    `SELECT a.*, i.manager_id, i.status AS interview_status FROM interview_assignments a
     JOIN interviews i ON i.id = a.interview_id
     WHERE a.id = @assignmentId AND a.interviewer_user_id = @userId`,
    { assignmentId, userId }
  )
  return rows[0] || null
}

/** Complete an interviewer assignment. */
async function completeAssignment(assignmentId, userId, outcome, feedback) {
  const rows = await db.query(
    `UPDATE interview_assignments
     SET status = 'completed', outcome = @outcome, feedback = @feedback,
         completed_at = CURRENT_TIMESTAMP, updated = CURRENT_TIMESTAMP
     WHERE id = @assignmentId AND interviewer_user_id = @userId
     RETURNING *`, { assignmentId, userId, outcome, feedback }
  )
  return rows[0] || null
}

/** Allow a completed interviewer to correct only their written feedback. */
async function updateAssignmentFeedback(assignmentId, userId, feedback) {
  const rows = await db.query(
    `UPDATE interview_assignments
     SET feedback = @feedback, updated = CURRENT_TIMESTAMP
     WHERE id = @assignmentId AND interviewer_user_id = @userId
       AND status = 'completed'
     RETURNING *`,
    { assignmentId, userId, feedback }
  )
  return rows[0] || null
}

/** Store an assignment feedback file. */
async function createAssignmentFile(data) {
  const rows = await db.query(
    `INSERT INTO interview_assignment_files
       (assignment_id, original_filename, mime_type, size, storage_path)
     VALUES (@assignmentId, @originalFilename, @mimeType, @size, @storagePath)
     RETURNING *`, data
  )
  return rows[0]
}

/** List run progress, feedback and files for an owning manager. */
async function listRunsByMandate(mandateId, managerId) {
  return db.query(
    `SELECT r.id AS run_id, r.status AS run_status, r.current_stage_order,
            r.template_flow_id,
            f.id AS flow_id, f.name AS flow_name, ct.id AS client_team_id,
            u.id AS candidate_user_id, u.first_name AS candidate_first, u.last_name AS candidate_last,
            u.email AS candidate_email,
            sr.id AS stage_run_id, sr.stage_order, sr.status AS stage_status,
            sr.outcome AS stage_outcome, sr.attempt_number, sr.interview_id,
            i.status AS interview_status, i.result AS interview_result,
            i.scheduled_at AS interview_scheduled_at, i.due_at AS interview_due_at,
            s.name AS stage_name, s.type, s.scheduled_at, s.require_pass,
            a.id AS assignment_id, a.status AS assignment_status,
            a.outcome AS interviewer_outcome, a.feedback,
            iu.first_name AS interviewer_first, iu.last_name AS interviewer_last,
            af.id AS file_id, af.original_filename, af.storage_path
     FROM candidate_flow_runs r
     JOIN interview_flows f ON f.id = r.flow_id
     JOIN client_teams ct ON ct.id = r.client_team_id
     JOIN users u ON u.id = ct.user_id
     JOIN candidate_flow_stage_runs sr ON sr.run_id = r.id
     JOIN interview_flow_stages s ON s.id = sr.stage_id
     LEFT JOIN interviews i ON i.id = sr.interview_id
     LEFT JOIN interview_assignments a ON a.stage_run_id = sr.id
     LEFT JOIN users iu ON iu.id = a.interviewer_user_id
     LEFT JOIN interview_assignment_files af ON af.assignment_id = a.id
     WHERE f.mandate_id = @mandateId AND r.created_by_manager_id = @managerId
     ORDER BY r.created DESC, sr.stage_order, sr.attempt_number`, { mandateId, managerId }
  )
}

/** List every scheduled interview for a mandate, including flow and one-off interviews. */
async function listSchedulesByMandate(mandateId, managerId) {
  return db.query(
    `SELECT i.id AS interview_id, i.type, i.status, i.result, i.scheduled_at,
            i.duration_minutes, i.location, i.meeting_url, i.created,
            i.flow_stage_run_id,
            u.id AS candidate_user_id, u.first_name AS candidate_first,
            u.last_name AS candidate_last, u.email AS candidate_email,
            sr.run_id, r.template_flow_id, sr.stage_order, sr.status AS stage_status,
            f.id AS flow_id, f.name AS flow_name, s.name AS stage_name,
            a.id AS assignment_id, a.status AS assignment_status,
            a.outcome AS interviewer_outcome, a.feedback,
            iu.first_name AS interviewer_first, iu.last_name AS interviewer_last,
            sc.decision
     FROM interviews i
     JOIN users u ON u.id = i.internal_user_id
     LEFT JOIN candidate_flow_stage_runs sr ON sr.id = i.flow_stage_run_id
     LEFT JOIN candidate_flow_runs r ON r.id = sr.run_id
     LEFT JOIN interview_flows f ON f.id = r.flow_id
     LEFT JOIN interview_flow_stages s ON s.id = sr.stage_id
     LEFT JOIN interview_assignments a ON a.interview_id = i.id
     LEFT JOIN users iu ON iu.id = a.interviewer_user_id
     LEFT JOIN scorecards sc ON sc.interview_id = i.id
     WHERE i.client_template_id = @mandateId AND i.manager_id = @managerId
     ORDER BY COALESCE(i.scheduled_at, i.created) DESC`,
    { mandateId, managerId }
  )
}

/** Load latest interview plus interviewer feedback for a mandate candidate. */
async function getLatestInterviewFeedback(clientTeamId) {
  const rows = await db.query(
    `SELECT i.id, i.type, i.status, i.scheduled_at, i.duration_minutes, i.location, i.created,
            a.id AS assignment_id, a.status AS assignment_status, a.outcome AS interviewer_outcome,
            a.feedback, iu.first_name AS interviewer_first, iu.last_name AS interviewer_last,
            af.original_filename, af.storage_path
     FROM interviews i
     LEFT JOIN interview_assignments a ON a.interview_id = i.id
     LEFT JOIN users iu ON iu.id = a.interviewer_user_id
     LEFT JOIN interview_assignment_files af ON af.assignment_id = a.id
     WHERE i.client_team_id = @clientTeamId
     ORDER BY i.created DESC, af.created DESC LIMIT 1`, { clientTeamId }
  )
  return rows[0] || null
}

module.exports = {
  createFlow, createStage, listByMandate, getOwnedFlow, updateFlow, updateStage,
  syncScheduledStageInterviews, getAssignedInterviewer, syncInterviewAssignments,
  ensureStageRuns, syncStageRunOrder,
  deleteUnusedStage, deleteFlow, getRunDeletionContext, deleteRun, createRun, createIsolatedRun,
  isolateRun, getOwnedRunFlow, listDirectRunIds, getActiveRun, claimRunStatus,
  listExpiredFlowInterviews, completeAssignmentsAsNoShow, createStageRun,
  updateStageRunStatus,
  attachInterview, getContextByInterview, getRun, getStage, finishStageRun, updateRun,
  getLatestAttempt, createAssignment, listAssignmentsForUser, getAssignmentForUser,
  completeAssignment, updateAssignmentFeedback, createAssignmentFile,
  listRunsByMandate, listSchedulesByMandate, getLatestInterviewFeedback,
}
