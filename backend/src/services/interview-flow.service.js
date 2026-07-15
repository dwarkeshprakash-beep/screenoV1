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
async function normalizeStages(stages, companyId, { allowPastExisting = false, existingStages = [] } = {}) {
  if (stages.length === 0) throw new Error('Add at least one stage')
  if (stages.length > 20) throw new Error('A flow can have at most 20 stages')

  const interviewerIds = [...new Set(stages
    .filter(stage => ['human', 'offline'].includes(stage.type))
    .filter(stage => stage.interviewerUserId !== null && stage.interviewerUserId !== undefined && stage.interviewerUserId !== '')
    .map(stage => Number(stage.interviewerUserId))
    .filter(Number.isInteger))]
  const interviewers = await userRepository.getByIdsForCompany(interviewerIds, companyId)
  if (interviewers.length !== interviewerIds.length) throw new Error('Every interviewer must belong to your organization')

  const existingById = new Map(existingStages.map(stage => [Number(stage.id), stage]))
  const normalized = stages.map((stage, index) => {
    if (!TYPES.has(stage.type)) throw new Error(`Invalid interview type at stage ${index + 1}`)
    const scheduledAt = new Date(stage.scheduledAt)
    const existing = existingById.get(Number(stage.id))
    const mayKeepPastDate = allowPastExisting && existing
      && Math.floor(new Date(existing.scheduled_at).getTime() / 60000) === Math.floor(scheduledAt.getTime() / 60000)
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

function editableFlow(flow) {
  return {
    ...flow,
    report_user_ids: flow.report_user_ids == null ? null : parseReportUserIds(flow.report_user_ids),
    stages: flow.stages || [],
  }
}

async function getRunFlow(runId, managerId) {
  const flow = await flowRepository.getOwnedRunFlow(Number(runId), managerId)
  if (!flow) throw new Error('Candidate flow run not found')
  return editableFlow(flow)
}

async function updateRunFlow(runId, data, managerId, companyId) {
  const run = await flowRepository.getRun(Number(runId))
  if (!run || Number(run.created_by_manager_id) !== Number(managerId)) {
    throw new Error('Candidate flow run not found')
  }
  const selfAssignedStage = (Array.isArray(data.stages) ? data.stages : []).find(stage => (
    ['human', 'offline'].includes(stage.type)
    && Number(stage.interviewerUserId) === Number(run.user_id)
  ))
  if (selfAssignedStage) throw new Error('Candidate and interviewer must be different people')
  const isolated = await flowRepository.isolateRun(run.id, managerId)
  if (!isolated) throw new Error('Candidate flow run not found')
  const isolatedData = Number(isolated.id) === Number(run.flow_id)
    ? data
    : {
      ...data,
      stages: (Array.isArray(data.stages) ? data.stages : []).map((stage, index) => ({
        ...stage,
        id: isolated.stages[index]?.id || null,
      })),
    }
  return updateFlow(isolated.id, isolatedData, managerId, companyId, { allowRunSpecific: true })
}

/** Edit a saved flow and synchronize any stage that is already scheduled. */
async function updateFlow(flowId, data, managerId, companyId, { allowRunSpecific = false } = {}) {
  const flow = await flowRepository.getOwnedFlow(Number(flowId), managerId)
  if (!flow || flow.status === 'deleted') throw new Error('Interview flow not found')
  if (flow.status === 'run_specific' && !allowRunSpecific) {
    throw new Error('Candidate-specific flows must be edited from the candidate schedule')
  }
  if (!String(data.name || '').trim()) throw new Error('Flow name is required')
  const inputStages = Array.isArray(data.stages) ? data.stages : []
  const normalized = await normalizeStages(inputStages, companyId, {
    allowPastExisting: true,
    existingStages: flow.stages,
  })
  const requestedRecipientIds = Array.isArray(data.reportUserIds)
    ? data.reportUserIds
    : flow.report_user_ids == null ? [managerId] : parseReportUserIds(flow.report_user_ids)
  const recipients = await validateReportRecipients(requestedRecipientIds, companyId)
  if (flow.status === 'active') {
    const directRuns = await flowRepository.listDirectRunIds(flow.id)
    for (const run of directRuns) {
      await flowRepository.isolateRun(run.id, managerId)
    }
  }
  const keptIds = new Set(inputStages.map(stage => Number(stage.id)).filter(Number.isInteger))

  for (const existing of flow.stages) {
    if (!keptIds.has(Number(existing.id))) {
      const removed = await flowRepository.deleteUnusedStage(
        existing.id,
        flow.id,
        flow.status === 'run_specific'
      )
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
    if (flow.status === 'run_specific') {
      await flowRepository.ensureStageRuns(saved.id, flow.id, saved.stage_order)
      await flowRepository.syncStageRunOrder(saved.id, flow.id, saved.stage_order)
    }
    const dueAt = new Date(
      new Date(saved.scheduled_at).getTime() + Number(saved.duration_minutes) * 60000
    ).toISOString()
    const tokenExpires = new Date(
      new Date(dueAt).getTime()
        + Number(process.env.INVITE_WINDOW_DAYS || 14) * 24 * 60 * 60 * 1000
    ).toISOString()
    const synchronized = flow.status === 'run_specific'
      ? await flowRepository.syncScheduledStageInterviews(saved.id, flow.id, {
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
      location: saved.location,
      meetingUrl: saved.meeting_url,
      })
      : []
    if (flow.status === 'run_specific' && synchronized.length > 0) {
      const previousStage = flow.stages.find(item => Number(item.id) === Number(saved.id)) || null
      await notifyUpdatedStageInterviews(synchronized, previousStage, saved, managerId, companyId)
    }
    updated.stages.push(saved)
  }
  return updated
}

function stageScheduleChanged(previous, current) {
  if (!previous) return true
  const fields = [
    'type', 'scheduled_at', 'schedule_timezone', 'duration_minutes',
    'interviewer_user_id', 'location', 'meeting_url',
  ]
  return fields.some(field => String(previous[field] ?? '') !== String(current[field] ?? ''))
}

async function notifyUpdatedStageInterviews(interviews, previousStage, stage, managerId, companyId) {
  const scheduleChanged = stageScheduleChanged(previousStage, stage)
  for (const row of interviews) {
    const interview = await interviewRepository.getById(row.id)
    if (!interview) continue
    const pendingCalendarRetry = !!interview.calendar_sync_error
    if (!scheduleChanged && !pendingCalendarRetry) continue
    const [manager, newInterviewer, assignedInterviewer] = await Promise.all([
      userRepository.getByIdForCompany(managerId, companyId),
      stage.interviewer_user_id
        ? userRepository.getByIdForCompany(stage.interviewer_user_id, companyId)
        : null,
      flowRepository.getAssignedInterviewer(interview.id),
    ])
    const oldInterviewer = assignedInterviewer
      && Number(assignedInterviewer.id) !== Number(stage.interviewer_user_id)
      ? assignedInterviewer
      : null
    let meetingUrl = interview.meeting_url
    let calendarEventId = interview.calendar_event_id
    const endAt = new Date(
      new Date(stage.scheduled_at).getTime() + Number(stage.duration_minutes || 60) * 60000
    ).toISOString()
    const attendeeEmails = [interview.candidate_email, newInterviewer?.email, manager?.email].filter(Boolean)
    try {
      if (stage.type !== 'human' && calendarEventId) {
        const cancelled = await googleMeetService.cancelMeeting(calendarEventId)
        if (!cancelled) throw new Error('Google Calendar is not configured to cancel the previous event')
        calendarEventId = null
        meetingUrl = stage.meeting_url || null
        await interviewRepository.updateMeetingDetails(interview.id, meetingUrl, null)
      } else if (
        stage.type === 'human'
        && calendarEventId
        && stage.meeting_url
        && String(stage.meeting_url) !== String(previousStage?.meeting_url || '')
      ) {
        const cancelled = await googleMeetService.cancelMeeting(calendarEventId)
        if (!cancelled) throw new Error('Google Calendar is not configured to replace the previous event')
        calendarEventId = null
        meetingUrl = stage.meeting_url
        await interviewRepository.updateMeetingDetails(interview.id, meetingUrl, null)
      } else if (stage.type === 'human') {
        if (!meetingUrl && !calendarEventId && !googleMeetService.isConfigured()) {
          throw new Error('Google Meet is not configured and this stage has no meeting link')
        }
        const meeting = calendarEventId
          ? await googleMeetService.updateMeeting(calendarEventId, {
            summary: `${stage.name} - ${interview.context_title || 'Interview'}`,
            startAt: stage.scheduled_at, endAt, attendeeEmails,
          })
          : !meetingUrl
            ? await googleMeetService.createMeeting({
              summary: `${stage.name} - ${interview.context_title || 'Interview'}`,
              startAt: stage.scheduled_at, endAt, attendeeEmails,
            })
            : null
        if (calendarEventId && !meeting) throw new Error('Could not update the Google Calendar event')
        if (meeting) {
          meetingUrl = meeting.joinUrl || meetingUrl
          calendarEventId = meeting.eventId || calendarEventId
          await interviewRepository.updateMeetingDetails(interview.id, meetingUrl, calendarEventId)
        } else {
          await interviewRepository.updateMeetingDetails(interview.id, meetingUrl, calendarEventId)
        }
      } else if (pendingCalendarRetry) {
        await interviewRepository.updateMeetingDetails(interview.id, meetingUrl, calendarEventId)
      }
    } catch (err) {
      console.error('Calendar synchronization failed:', err.message)
      await interviewRepository.setCalendarSyncError(interview.id, err.message)
        .catch(logError => console.error('Calendar synchronization error persistence failed:', logError.message))
      throw new Error(`Calendar synchronization failed: ${err.message}. Save the flow again to retry.`)
    }
    await flowRepository.syncInterviewAssignments([interview.id], stage.interviewer_user_id)
    const notification = {
      candidateName: `${interview.candidate_first || ''} ${interview.candidate_last || ''}`.trim(),
      clientName: interview.context_title || 'Your company',
      stageName: stage.name,
      scheduledAt: stage.scheduled_at,
      scheduleTimezone: stage.schedule_timezone,
      location: stage.location,
      meetingUrl,
    }
    let candidateDeliveryError = null
    try {
      await emailService.sendInterviewScheduleUpdate(interview.candidate_email, notification)
    } catch (err) {
      candidateDeliveryError = err.message
      console.error('Candidate schedule update notification failed:', err.message)
    }
    await emailDeliveryRepository.create({
      kind: 'interview_schedule_update',
      interviewId: interview.id,
      intendedTo: interview.candidate_email,
      deliveredTo: candidateDeliveryError
        ? ''
        : emailService.getDeliveredRecipients(interview.candidate_email).join(','),
      status: candidateDeliveryError ? 'failed' : 'sent',
      error: candidateDeliveryError,
    }).catch(err => console.error('Candidate schedule update delivery log failed:', err.message))
    if (oldInterviewer?.email) {
      await emailService.sendInterviewerAssignmentCancelled(oldInterviewer.email, {
        ...notification,
        interviewerName: `${oldInterviewer.first_name} ${oldInterviewer.last_name}`.trim(),
      }).catch(err => console.error('Old interviewer notification failed:', err.message))
    }
    if (newInterviewer?.email) {
      await notifyInterviewer(interview.id, newInterviewer, {
        ...notification,
        interviewerName: `${newInterviewer.first_name} ${newInterviewer.last_name}`.trim(),
      }).catch(err => console.error('Interviewer update notification failed:', err.message))
    }
  }
}

/** Delete an unused saved definition. */
async function deleteFlow(flowId, managerId) {
  const deleted = await flowRepository.deleteFlow(Number(flowId), managerId)
  if (!deleted) throw new Error('Cancel active candidate flows before deleting this saved flow')
  return { deleted: true }
}

/** Permanently delete one candidate's flow run and its generated interview records. */
async function deleteRun(runId, managerId) {
  const deletionContext = await flowRepository.getRunDeletionContext(Number(runId), managerId)
  if (!deletionContext) throw new Error('Candidate interview flow not found')
  const calendarEventIds = [...new Set(deletionContext.interviews
    .filter(interview => interview.status === 'scheduled')
    .map(interview => interview.calendar_event_id)
    .filter(Boolean))]
  for (const eventId of calendarEventIds) {
    const cancelled = await googleMeetService.cancelMeeting(eventId)
    if (!cancelled) {
      throw new Error('Google Calendar is not configured; reconnect it before deleting this scheduled flow')
    }
  }
  const deleted = await flowRepository.deleteRun(Number(runId), managerId)
  if (!deleted) throw new Error('Candidate interview flow not found')
  const storagePaths = deleted.storagePaths.filter(path => !/^https?:\/\//i.test(path))
  storageService.cleanupOrphanedFiles(storagePaths)
  for (const interview of deletionContext.interviews.filter(item => item.status === 'scheduled')) {
    const notification = {
      candidateName: `${interview.candidate_first || ''} ${interview.candidate_last || ''}`.trim(),
      interviewerName: `${interview.interviewer_first || ''} ${interview.interviewer_last || ''}`.trim(),
      clientName: interview.client_name,
      stageName: interview.stage_name,
      scheduledAt: interview.scheduled_at,
      scheduleTimezone: interview.schedule_timezone,
      location: interview.location,
      meetingUrl: interview.meeting_url,
    }
    if (interview.candidate_email) {
      await emailService.sendInterviewCancelled(interview.candidate_email, notification)
        .catch(err => console.error('Candidate cancellation notification failed:', err.message))
    }
    if (interview.interviewer_email) {
      await emailService.sendInterviewerAssignmentCancelled(interview.interviewer_email, notification)
        .catch(err => console.error('Interviewer cancellation notification failed:', err.message))
    }
  }
  return { id: deleted.id, deleted: true }
}

/** List manager-visible run progress and sign feedback documents. */
async function listRuns(mandateId, managerId) {
  const template = await clientTemplateRepository.getById(Number(mandateId), managerId)
  if (!template) throw new Error('Mandate not found')
  await processExpiredFlows({ managerId, mandateId: template.id })
    .catch(err => console.error('Expired flow processing failed while listing runs:', err.message))
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
  await processExpiredFlows({ managerId, mandateId: template.id })
    .catch(err => console.error('Expired flow processing failed while listing schedules:', err.message))
  return flowRepository.listSchedulesByMandate(template.id, managerId)
}

/** Resolve unattended expired automated stages and apply their configured pass rule.
 * Human/offline rounds wait for interviewer feedback so a late reviewer cannot
 * be mistaken for a candidate no-show.
 */
async function processExpiredFlows(filters = {}) {
  const expired = await flowRepository.listExpiredFlowInterviews(filters)
  const processed = []
  for (const item of expired) {
    const claimed = await interviewRepository.markExpiredNoShow(item.interview_id)
    // A completed no-show with a still-scheduled stage means a previous process
    // stopped between recording attendance and advancing the flow. Resume it.
    if (!claimed && item.interview_result !== 'expired_no_show') continue
    await flowRepository.completeAssignmentsAsNoShow(item.interview_id)
    const progression = await handleInterviewResult(item.interview_id, 'fail', 0)
    processed.push({ ...item, progression })
  }
  return processed
}

/** Manager fallback for immediately resolving one visibly expired current stage. */
async function processExpiredRun(runId, managerId) {
  const run = await flowRepository.getRun(Number(runId))
  if (!run || Number(run.created_by_manager_id) !== Number(managerId)) {
    throw new Error('Flow run not found')
  }
  const processed = await processExpiredFlows({ managerId, runId: run.id })
  if (processed.length === 0) {
    throw new Error('The current scheduled stage has not expired or was already processed')
  }
  return { processed: processed.length, run: await flowRepository.getRun(run.id) }
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
  if (stage.interviewer_user_id && Number(stage.interviewer_user_id) === Number(run.user_id)) {
    throw new Error('Candidate and interviewer must be different people')
  }
  let interviewer = null
  let candidate = null
  let meetingUrl = stage.meeting_url
  let calendarEventId = null
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
    calendarEventId = meeting.eventId || null
  }
  const interview = await scheduleService.createSchedule({
    userId: run.user_id, type: stage.type, interviewMode: stage.interview_mode || 'simple',
    difficulty: stage.difficulty || 'medium', questionCount: stage.question_count || 10,
    durationMinutes: stage.duration_minutes, clientTemplateId: run.mandate_id,
    clientTeamId: run.client_team_id, flowStageRunId: stageRun.id,
    scheduledAt, assessmentDate: scheduledAt, scheduleTimezone: stage.schedule_timezone,
    companyName: run.client_name, jobTitle: run.role_name, location: stage.location,
    meetingUrl, calendarEventId, details: stage.notes,
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
  if (!flow || flow.status !== 'active') throw new Error('Interview flow not found')
  const member = await clientTeamRepository.getByIdForMandate(Number(clientTeamId), flow.mandate_id)
  if (!member) throw new Error('Candidate is not part of this mandate')
  if (flow.stages.some(stage => Number(stage.interviewer_user_id) === Number(member.user_id))) {
    throw new Error('Candidate and interviewer must be different people')
  }
  const activeRun = await flowRepository.getActiveRun(flow.id, member.id)
  if (activeRun) throw new Error('Candidate already has an active run for this flow')
  let isolated
  try {
    isolated = await flowRepository.createIsolatedRun(flow.id, member.id, managerId)
  } catch (err) {
    if (err.code === '23505') throw new Error('Candidate already has an active run for this flow')
    throw err
  }
  if (!isolated) throw new Error('Interview flow not found')
  const { run, flow: runFlow, stageRuns } = isolated
  const template = await clientTemplateRepository.getById(flow.mandate_id, managerId)
  const runtime = { ...run, mandate_id: flow.mandate_id, user_id: member.user_id,
    client_name: template.client_name, role_name: member.requirement_name || template.requirements || 'Interview',
    report_user_ids: runFlow.report_user_ids }
  try {
    const interview = await activateStage(runtime, runFlow.stages[0], stageRuns[0], managerId, companyId)
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
  const finished = await flowRepository.finishStageRun(
    context.id,
    passed ? 'passed' : 'failed',
    passed ? 'pass' : 'fail'
  )
  if (!finished) return null
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
  const claimed = await flowRepository.claimRunStatus(
    run.id,
    managerId,
    [run.status],
    'retrying'
  )
  if (!claimed) throw new Error('Another manager action is already processing this flow run')
  try {
    const stage = await flowRepository.getStage(run.flow_id, run.current_stage_order)
    const latest = await flowRepository.getLatestAttempt(run.id, run.current_stage_order)
    let nextAttempt
    if (run.status === 'paused_schedule_required' && latest && !latest.interview_id) {
      nextAttempt = await flowRepository.updateStageRunStatus(latest.id, 'activating')
    } else {
      if (run.status === 'paused_schedule_required' && latest?.interview_id) {
        const previousInterview = await interviewRepository.getById(latest.interview_id)
        if (previousInterview?.status === 'scheduled') {
          if (previousInterview.calendar_event_id) {
            const cancelled = await googleMeetService.cancelMeeting(previousInterview.calendar_event_id)
            if (!cancelled) throw new Error('Google Calendar is not configured to cancel the previous retry event')
          }
          await interviewRepository.updateStatus(previousInterview.id, 'cancelled')
        }
      }
      nextAttempt = await flowRepository.createStageRun({
        runId: run.id, stageId: stage.id, stageOrder: stage.stage_order,
        status: 'activating', attemptNumber: Number(latest?.attempt_number || 0) + 1,
      })
    }
    await flowRepository.updateRun(run.id, 'active', run.current_stage_order)
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
  const claimed = await flowRepository.claimRunStatus(
    run.id,
    managerId,
    ['paused_failed'],
    'advancing'
  )
  if (!claimed) throw new Error('Another manager action is already processing this flow run')
  try {
    return await advanceRun(run.id, run.current_stage_order, managerId, companyId)
  } catch (err) {
    await flowRepository.updateRun(run.id, 'paused_failed', run.current_stage_order)
    throw err
  }
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
  createFlow, updateFlow, updateRunFlow, getRunFlow,
  deleteFlow, deleteRun, listFlows, listRuns, listSchedules,
  startRun, handleInterviewResult, retryRun, continueRun,
  processExpiredFlows, processExpiredRun,
  listAssignments, completeAssignment, updateAssignmentFeedback, notifyInterviewer,
}
