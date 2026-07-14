const flowRepository = require('../repositories/interview-flow.repository')
const clientTemplateRepository = require('../repositories/client-template.repository')
const clientTeamRepository = require('../repositories/client-team.repository')
const userRepository = require('../repositories/user.repository')
const interviewRepository = require('../repositories/interview.repository')
const emailDeliveryRepository = require('../repositories/email-delivery.repository')
const scheduleService = require('./schedule.service')
const emailService = require('./email.service')
const storageService = require('./storage.service')
const googleMeetService = require('./google-meet.service')

const TYPES = new Set(['ai_voice', 'exam', 'human', 'offline'])
const INTERVIEW_MODES = new Set(['simple', 'adaptive'])
const DIFFICULTIES = new Set(['easy', 'medium', 'hard'])

function parseReportUserIds(value) {
  if (Array.isArray(value)) return value.map(Number).filter(Number.isInteger)
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isInteger) : []
  } catch {
    return []
  }
}

async function validateReportRecipients(value, companyId) {
  const ids = [...new Set(parseReportUserIds(value))]
  const users = ids.length > 0 ? await userRepository.getByIdsForCompany(ids, companyId) : []
  if (users.length !== ids.length) throw new Error('Some report recipients are not in your organization')
  return { ids, emails: users.map(user => user.email).filter(Boolean) }
}

/** Send and record an interviewer assignment notification. */
async function notifyInterviewer(interviewId, interviewer, data) {
  const notificationData = {
    ...data,
    portalPath: interviewer.role === 'manager' ? '/manager/interviewer' : '/candidate/interviews',
  }
  try {
    await emailService.sendInterviewerAssignment(interviewer.email, notificationData)
    await emailDeliveryRepository.create({
      kind: 'interviewer_assignment', interviewId, intendedTo: interviewer.email,
      deliveredTo: emailService.getDeliveredRecipients(interviewer.email).join(','), status: 'sent',
    })
  } catch (err) {
    console.error('sendInterviewerAssignment failed:', err.message)
    await emailDeliveryRepository.create({
      kind: 'interviewer_assignment', interviewId, intendedTo: interviewer.email,
      deliveredTo: emailService.getDeliveredRecipients(interviewer.email).join(','),
      status: 'failed', error: err.message,
    }).catch(logError => console.error('interviewer email delivery log failed:', logError.message))
  }
}

/** Convert flat flow/stage query rows into API objects. */
function groupFlows(rows) {
  const flows = new Map()
  for (const row of rows) {
    if (!flows.has(row.id)) flows.set(row.id, {
      id: row.id, mandate_id: row.mandate_id, name: row.name, status: row.status,
      report_user_ids: row.report_user_ids == null ? null : parseReportUserIds(row.report_user_ids),
      stages: [],
    })
    if (row.stage_id) flows.get(row.id).stages.push({
      id: row.stage_id, stage_order: row.stage_order, name: row.stage_name, type: row.type,
      scheduled_at: row.scheduled_at, schedule_timezone: row.schedule_timezone,
      duration_minutes: row.duration_minutes, interview_mode: row.interview_mode,
      difficulty: row.difficulty, question_count: row.question_count,
      require_pass: row.require_pass, minimum_score: row.minimum_score,
      interviewer_user_id: row.interviewer_user_id,
      interviewer_name: [row.interviewer_first, row.interviewer_last].filter(Boolean).join(' '),
      interviewer_email: row.interviewer_email, location: row.location,
      meeting_url: row.meeting_url, notes: row.notes,
    })
  }
  return [...flows.values()]
}

/** Validate and normalize ordered stage input. */
async function normalizeStages(stages, companyId, { allowPastExisting = false } = {}) {
  if (stages.length === 0) throw new Error('Add at least one stage')
  if (stages.length > 20) throw new Error('A flow can have at most 20 stages')

  const interviewerIds = [...new Set(stages
    .filter(stage => ['human', 'offline'].includes(stage.type))
    .filter(stage => stage.interviewerUserId !== null && stage.interviewerUserId !== undefined && stage.interviewerUserId !== '')
    .map(stage => Number(stage.interviewerUserId))
    .filter(Number.isInteger))]
  const interviewers = await userRepository.getByIdsForCompany(interviewerIds, companyId)
  if (interviewers.length !== interviewerIds.length) throw new Error('Every interviewer must belong to your organization')

  const normalized = stages.map((stage, index) => {
    if (!TYPES.has(stage.type)) throw new Error(`Invalid interview type at stage ${index + 1}`)
    const scheduledAt = new Date(stage.scheduledAt)
    const mayKeepPastDate = allowPastExisting && Number.isInteger(Number(stage.id))
    if (Number.isNaN(scheduledAt.getTime()) || (!mayKeepPastDate && scheduledAt <= new Date())) throw new Error(`Stage ${index + 1} needs a future date and time`)
    const needsInterviewer = ['human', 'offline'].includes(stage.type)
    const interviewerUserId = needsInterviewer && stage.interviewerUserId ? Number(stage.interviewerUserId) : null
    if (needsInterviewer && !Number.isInteger(interviewerUserId)) throw new Error(`Stage ${index + 1} needs an interviewer`)
    const durationMinutes = Number(stage.durationMinutes)
    if (!Number.isInteger(durationMinutes) || durationMinutes < 2 || durationMinutes > 180) {
      throw new Error(`Stage ${index + 1} duration must be between 2 and 180 minutes`)
    }
    const questionCount = Number(stage.questionCount)
    if (['ai_voice', 'exam'].includes(stage.type) && (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 50)) {
      throw new Error(`Stage ${index + 1} questions must be between 1 and 50`)
    }
    const requestedMode = stage.interviewMode || 'simple'
    if (!INTERVIEW_MODES.has(requestedMode)) throw new Error(`Invalid interview mode at stage ${index + 1}`)
    const difficulty = stage.difficulty || 'medium'
    if (!DIFFICULTIES.has(difficulty)) throw new Error(`Invalid difficulty at stage ${index + 1}`)
    const minimumScore = stage.minimumScore === '' || stage.minimumScore == null ? null : Number(stage.minimumScore)
    if (minimumScore != null && (!Number.isFinite(minimumScore) || minimumScore < 0 || minimumScore > 10)) throw new Error('Minimum score must be between 0 and 10')
    return {
      stageOrder: index + 1, name: String(stage.name || `Stage ${index + 1}`).trim(), type: stage.type,
      scheduledAt: scheduledAt.toISOString(), scheduleTimezone: stage.scheduleTimezone || null,
      durationMinutes,
      interviewMode: stage.type === 'exam' ? 'simple' : requestedMode,
      difficulty, questionCount: ['ai_voice', 'exam'].includes(stage.type) ? questionCount : 10,
      requirePass: !!stage.requirePass, minimumScore, interviewerUserId,
      location: stage.type === 'offline' ? (stage.location || null) : null,
      meetingUrl: stage.type === 'human' ? (stage.meetingUrl || null) : null,
      notes: stage.notes || null,
    }
  })
  for (let index = 1; index < normalized.length; index++) {
    const previous = normalized[index - 1]
    const previousEnd = new Date(
      new Date(previous.scheduledAt).getTime() + Number(previous.durationMinutes) * 60000
    )
    if (new Date(normalized[index].scheduledAt) < previousEnd) {
      throw new Error(`Stage ${index + 1} must start after stage ${index} ends`)
    }
  }
  return normalized
}

/** Validate and create a reusable mandate flow definition. */
async function createFlow(data, managerId, companyId) {
  const template = await clientTemplateRepository.getById(Number(data.mandateId), managerId)
  if (!template) throw new Error('Mandate not found')
  if (!String(data.name || '').trim()) throw new Error('Flow name is required')
  const normalized = await normalizeStages(Array.isArray(data.stages) ? data.stages : [], companyId)
  const recipients = await validateReportRecipients(
    Array.isArray(data.reportUserIds) ? data.reportUserIds : [managerId],
    companyId
  )

  const flow = await flowRepository.createFlow({
    mandateId: template.id, name: data.name.trim(), managerId,
    reportUserIds: JSON.stringify(recipients.ids),
  })
  flow.report_user_ids = recipients.ids
  flow.stages = []
  for (const stage of normalized) flow.stages.push(await flowRepository.createStage({ ...stage, flowId: flow.id }))
  return flow
}

/** List flow definitions for a mandate. */
async function listFlows(mandateId, managerId) {
  const template = await clientTemplateRepository.getById(Number(mandateId), managerId)
  if (!template) throw new Error('Mandate not found')
  return groupFlows(await flowRepository.listByMandate(template.id, managerId))
}

/** Edit a saved flow and synchronize any stage that is already scheduled. */
async function updateFlow(flowId, data, managerId, companyId) {
  const flow = await flowRepository.getOwnedFlow(Number(flowId), managerId)
  if (!flow || flow.status === 'deleted') throw new Error('Interview flow not found')
  if (!String(data.name || '').trim()) throw new Error('Flow name is required')
  const inputStages = Array.isArray(data.stages) ? data.stages : []
  const normalized = await normalizeStages(inputStages, companyId, { allowPastExisting: true })
  const requestedRecipientIds = Array.isArray(data.reportUserIds)
    ? data.reportUserIds
    : flow.report_user_ids == null ? [managerId] : parseReportUserIds(flow.report_user_ids)
  const recipients = await validateReportRecipients(requestedRecipientIds, companyId)
  const keptIds = new Set(inputStages.map(stage => Number(stage.id)).filter(Number.isInteger))

  for (const existing of flow.stages) {
    if (!keptIds.has(Number(existing.id))) {
      const removed = await flowRepository.deleteUnusedStage(existing.id, flow.id)
      if (!removed) throw new Error(`Stage "${existing.name}" cannot be removed because a candidate run uses it`)
    }
  }

  const updated = await flowRepository.updateFlow(flow.id, managerId, {
    name: data.name.trim(), reportUserIds: JSON.stringify(recipients.ids),
  })
  updated.report_user_ids = recipients.ids
  updated.stages = []
  for (let index = 0; index < normalized.length; index++) {
    const stageInput = inputStages[index]
    const stage = normalized[index]
    let saved
    if (stageInput.id) {
      saved = await flowRepository.updateStage(Number(stageInput.id), flow.id, stage)
      if (!saved) throw new Error('Flow stage not found')
    } else {
      saved = await flowRepository.createStage({ ...stage, flowId: flow.id })
    }
    await flowRepository.ensureStageRuns(saved.id, flow.id, saved.stage_order)
    const dueAt = new Date(
      new Date(saved.scheduled_at).getTime() + Number(saved.duration_minutes) * 60000
    ).toISOString()
    const tokenExpires = new Date(
      new Date(dueAt).getTime()
        + Number(process.env.INVITE_WINDOW_DAYS || 14) * 24 * 60 * 60 * 1000
    ).toISOString()
    await flowRepository.syncScheduledStageInterviews(saved.id, flow.id, {
      type: saved.type,
      interviewMode: saved.interview_mode || 'simple',
      difficulty: saved.difficulty || 'medium',
      questionCount: Number(saved.question_count) || 10,
      durationMinutes: Number(saved.duration_minutes),
      scheduledAt: saved.scheduled_at,
      dueAt,
      tokenExpires,
      reportEmails: recipients.emails.join(',') || null,
      scheduleTimezone: saved.schedule_timezone,
      interviewerUserId: saved.interviewer_user_id,
      location: saved.location,
      meetingUrl: saved.meeting_url,
    })
    updated.stages.push(saved)
  }
  return updated
}

/** Delete an unused saved definition. */
async function deleteFlow(flowId, managerId) {
  const deleted = await flowRepository.deleteFlow(Number(flowId), managerId)
  if (!deleted) throw new Error('Cancel active candidate flows before deleting this saved flow')
  return { deleted: true }
}

/** Permanently delete one candidate's flow run and its generated interview records. */
async function deleteRun(runId, managerId) {
  const deleted = await flowRepository.deleteRun(Number(runId), managerId)
  if (!deleted) throw new Error('Candidate interview flow not found')
  const storagePaths = deleted.storagePaths.filter(path => !/^https?:\/\//i.test(path))
  storageService.cleanupOrphanedFiles(storagePaths)
  return { id: deleted.id, deleted: true }
}

/** List manager-visible run progress and sign feedback documents. */
async function listRuns(mandateId, managerId) {
  const template = await clientTemplateRepository.getById(Number(mandateId), managerId)
  if (!template) throw new Error('Mandate not found')
  const rows = await flowRepository.listRunsByMandate(template.id, managerId)
  return Promise.all(rows.map(async row => ({
    ...row,
    file_url: row.storage_path ? await storageService.getSignedUrl(row.storage_path).catch(() => null) : null,
  })))
}

/** List one-off and flow-generated interview records for the manager schedule view. */
async function listSchedules(mandateId, managerId) {
  const template = await clientTemplateRepository.getById(Number(mandateId), managerId)
  if (!template) throw new Error('Mandate not found')
  return flowRepository.listSchedulesByMandate(template.id, managerId)
}

/** List interviewer work with signed feedback-file links. */
async function listAssignments(userId) {
  const rows = await flowRepository.listAssignmentsForUser(userId)
  return Promise.all(rows.map(async row => ({
    ...row,
    file_url: row.storage_path
      ? await storageService.getSignedUrl(row.storage_path).catch(() => null)
      : null,
  })))
}

/** Schedule a runtime stage and create interviewer work where needed. */
async function activateStage(run, stage, stageRun, managerId, companyId, scheduledAtOverride = null) {
  const scheduledAt = scheduledAtOverride || stage.scheduled_at
  let interviewer = null
  let candidate = null
  let meetingUrl = stage.meeting_url
  if (stage.interviewer_user_id) {
    [interviewer, candidate] = await Promise.all([
      userRepository.getByIdForCompany(stage.interviewer_user_id, companyId),
      userRepository.getByIdForCompany(run.user_id, companyId),
    ])
  }
  if (stage.type === 'human' && !meetingUrl) {
    if (!googleMeetService.isConfigured()) throw new Error('Google Meet is not configured and this stage has no meeting link')
    const manager = await userRepository.getByIdForCompany(managerId, companyId)
    const endAt = new Date(new Date(scheduledAt).getTime() + Number(stage.duration_minutes || 60) * 60000).toISOString()
    const meeting = await googleMeetService.createMeeting({
      summary: `${stage.name} - ${run.client_name}`,
      startAt: scheduledAt, endAt,
      attendeeEmails: [candidate?.email, interviewer?.email, manager?.email].filter(Boolean),
    })
    if (!meeting?.joinUrl) throw new Error('Could not create Google Meet for the human interview stage')
    meetingUrl = meeting.joinUrl
  }
  const interview = await scheduleService.createSchedule({
    userId: run.user_id, type: stage.type, interviewMode: stage.interview_mode || 'simple',
    difficulty: stage.difficulty || 'medium', questionCount: stage.question_count || 10,
    durationMinutes: stage.duration_minutes, clientTemplateId: run.mandate_id,
    clientTeamId: run.client_team_id, flowStageRunId: stageRun.id,
    scheduledAt, assessmentDate: scheduledAt, scheduleTimezone: stage.schedule_timezone,
    companyName: run.client_name, jobTitle: run.role_name, location: stage.location,
    meetingUrl, details: stage.notes,
    reportUserIds: run.report_user_ids == null ? [managerId] : parseReportUserIds(run.report_user_ids),
  }, managerId, companyId)
  await flowRepository.attachInterview(stageRun.id, interview.id)

  if (stage.interviewer_user_id) {
    await flowRepository.createAssignment({
      stageRunId: stageRun.id, interviewId: interview.id,
      interviewerUserId: stage.interviewer_user_id,
    })
    notifyInterviewer(interview.id, interviewer, {
      interviewerName: `${interviewer.first_name} ${interviewer.last_name}`.trim(),
      candidateName: `${candidate.first_name} ${candidate.last_name}`.trim(),
      clientName: run.client_name, stageName: stage.name, scheduledAt,
      scheduleTimezone: stage.schedule_timezone, location: stage.location,
      meetingUrl,
    }).catch(err => console.error('notifyInterviewer failed:', err.message))
  }
  return interview
}

/** Enroll one mandate candidate and schedule only stage one. */
async function startRun(flowId, clientTeamId, managerId, companyId) {
  const flow = await flowRepository.getOwnedFlow(Number(flowId), managerId)
  if (!flow) throw new Error('Interview flow not found')
  const member = await clientTeamRepository.getByIdForMandate(Number(clientTeamId), flow.mandate_id)
  if (!member) throw new Error('Candidate is not part of this mandate')
  const activeRun = await flowRepository.getActiveRun(flow.id, member.id)
  if (activeRun) throw new Error('Candidate already has an active run for this flow')
  const run = await flowRepository.createRun({ flowId: flow.id, clientTeamId: member.id, managerId })
  const template = await clientTemplateRepository.getById(flow.mandate_id, managerId)
  const runtime = { ...run, mandate_id: flow.mandate_id, user_id: member.user_id,
    client_name: template.client_name, role_name: member.requirement_name || template.requirements || 'Interview',
    report_user_ids: flow.report_user_ids }
  const stageRuns = []
  for (const stage of flow.stages) {
    stageRuns.push(await flowRepository.createStageRun({
      runId: run.id, stageId: stage.id, stageOrder: stage.stage_order,
      status: stage.stage_order === 1 ? 'activating' : 'pending', attemptNumber: 1,
    }))
  }
  try {
    const interview = await activateStage(runtime, flow.stages[0], stageRuns[0], managerId, companyId)
    return { ...run, firstInterview: interview }
  } catch (err) {
    await flowRepository.updateRun(run.id, 'paused_schedule_required', 1)
    throw err
  }
}

/** Evaluate an AI result and either advance, pause, or complete the run. */
async function handleInterviewResult(interviewId, decision, overallScore) {
  const context = await flowRepository.getContextByInterview(interviewId)
  if (!context || ['passed', 'failed', 'completed'].includes(context.status)) return null
  const passed = decision === 'pass' && (context.minimum_score == null || Number(overallScore) >= Number(context.minimum_score))
  const mayAdvance = !context.require_pass || passed
  await flowRepository.finishStageRun(context.id, passed ? 'passed' : 'failed', passed ? 'pass' : 'fail')
  if (!mayAdvance) {
    await flowRepository.updateRun(context.run_id, 'paused_failed', context.stage_order)
    return { status: 'paused_failed' }
  }
  return advanceRun(context.run_id, context.stage_order, context.created_by_manager_id)
}

/** Activate the next stage, or complete the run. */
async function advanceRun(runId, currentOrder, managerId, companyIdOverride = null) {
  const run = await flowRepository.getRun(runId)
  if (!run || Number(run.created_by_manager_id) !== Number(managerId)) throw new Error('Flow run not found')
  const nextStage = await flowRepository.getStage(run.flow_id, Number(currentOrder) + 1)
  if (!nextStage) {
    await flowRepository.updateRun(run.id, 'completed', currentOrder)
    return { status: 'completed' }
  }
  const manager = await userRepository.getById(managerId)
  const companyId = companyIdOverride || manager.company_id
  const stageRun = await flowRepository.getLatestAttempt(run.id, nextStage.stage_order)
  if (!stageRun) throw new Error('Next flow stage is missing')
  const scheduledAtOverride = new Date(nextStage.scheduled_at) <= new Date()
    ? new Date(Date.now() + 60 * 1000).toISOString()
    : null
  await flowRepository.updateRun(run.id, 'active', nextStage.stage_order)
  try {
    const interview = await activateStage(
      run,
      nextStage,
      stageRun,
      managerId,
      companyId,
      scheduledAtOverride
    )
    return { status: 'active', interview }
  } catch (err) {
    console.error('Flow stage activation failed:', err.message)
    await flowRepository.updateRun(run.id, 'paused_schedule_required', nextStage.stage_order)
    return { status: 'paused_schedule_required', error: err.message }
  }
}

/** Retry the failed current stage at a new date/time. */
async function retryRun(runId, scheduledAt, managerId, companyId) {
  const run = await flowRepository.getRun(Number(runId))
  if (!run || Number(run.created_by_manager_id) !== Number(managerId)) throw new Error('Flow run not found')
  if (!['paused_failed', 'paused_schedule_required'].includes(run.status)) throw new Error('Flow run is not paused')
  const date = new Date(scheduledAt)
  if (Number.isNaN(date.getTime()) || date <= new Date()) throw new Error('Retry needs a future date and time')
  const stage = await flowRepository.getStage(run.flow_id, run.current_stage_order)
  const latest = await flowRepository.getLatestAttempt(run.id, run.current_stage_order)
  let nextAttempt
  if (run.status === 'paused_schedule_required' && latest && !latest.interview_id) {
    nextAttempt = await flowRepository.updateStageRunStatus(latest.id, 'activating')
  } else {
    if (run.status === 'paused_schedule_required' && latest?.interview_id) {
      const previousInterview = await interviewRepository.getById(latest.interview_id)
      if (previousInterview?.status === 'scheduled') {
        await interviewRepository.updateStatus(previousInterview.id, 'cancelled')
      }
    }
    nextAttempt = await flowRepository.createStageRun({
      runId: run.id, stageId: stage.id, stageOrder: stage.stage_order,
      status: 'activating', attemptNumber: Number(latest?.attempt_number || 0) + 1,
    })
  }
  await flowRepository.updateRun(run.id, 'active', run.current_stage_order)
  try {
    const interview = await activateStage(run, stage, nextAttempt, managerId, companyId, date.toISOString())
    return { status: 'active', interview }
  } catch (err) {
    await flowRepository.updateRun(run.id, 'paused_schedule_required', run.current_stage_order)
    throw err
  }
}

/** Override a failed gate and continue to the next stage. */
async function continueRun(runId, managerId, companyId) {
  const run = await flowRepository.getRun(Number(runId))
  if (!run || Number(run.created_by_manager_id) !== Number(managerId)) throw new Error('Flow run not found')
  if (run.status !== 'paused_failed') throw new Error('Flow run is not paused after failure')
  return advanceRun(run.id, run.current_stage_order, managerId, companyId)
}

/** Submit human/offline feedback, optional document, and progress the flow. */
async function completeAssignment(assignmentId, userId, data, file) {
  const assignment = await flowRepository.getAssignmentForUser(Number(assignmentId), userId)
  if (!assignment) throw new Error('Interviewer assignment not found')
  if (!['pass', 'fail'].includes(data.outcome)) throw new Error('Choose pass or fail')
  if (assignment.interview_status === 'cancelled') throw new Error('This interview has been cancelled')
  if (assignment.status === 'completed') {
    await interviewRepository.markCompleted(assignment.interview_id, assignment.outcome || data.outcome)
    if (assignment.stage_run_id) {
      await handleInterviewResult(
        assignment.interview_id,
        assignment.outcome || data.outcome,
        (assignment.outcome || data.outcome) === 'pass' ? 10 : 0
      )
    }
    return assignment
  }
  if (file) {
    const uploaded = await storageService.uploadInterviewFeedbackAsset(file.buffer, assignment.id, file)
    await flowRepository.createAssignmentFile({ assignmentId: assignment.id,
      originalFilename: file.originalname, mimeType: file.mimetype, size: file.size,
      storagePath: uploaded.path })
  }
  const completed = await flowRepository.completeAssignment(assignment.id, userId, data.outcome, String(data.feedback || '').trim() || null)
  await interviewRepository.markCompleted(assignment.interview_id, data.outcome)
  if (assignment.stage_run_id) {
    await handleInterviewResult(assignment.interview_id, data.outcome, data.outcome === 'pass' ? 10 : 0)
  }
  return completed
}

/** Edit only the written comment on an already-completed assignment. */
async function updateAssignmentFeedback(assignmentId, userId, data) {
  const feedback = String(data.feedback || '').trim()
  if (feedback.length > 5000) throw new Error('Feedback must be 5000 characters or fewer')
  const updated = await flowRepository.updateAssignmentFeedback(Number(assignmentId), userId, feedback || null)
  if (!updated) throw new Error('Completed interviewer assignment not found')
  return updated
}

module.exports = {
  createFlow, updateFlow, deleteFlow, deleteRun, listFlows, listRuns, listSchedules,
  startRun, handleInterviewResult, retryRun, continueRun,
  listAssignments, completeAssignment, updateAssignmentFeedback, notifyInterviewer,
}
