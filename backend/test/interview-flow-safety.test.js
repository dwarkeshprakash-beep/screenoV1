const test = require('node:test')
const assert = require('node:assert/strict')

const flowRepository = require('../src/repositories/interview-flow.repository')
const interviewRepository = require('../src/repositories/interview.repository')
const userRepository = require('../src/repositories/user.repository')
const emailDeliveryRepository = require('../src/repositories/email-delivery.repository')
const emailService = require('../src/services/email.service')
const googleMeetService = require('../src/services/google-meet.service')
const storageService = require('../src/services/storage.service')
const flowService = require('../src/services/interview-flow.service')

const dependencies = [
  flowRepository, interviewRepository, userRepository, emailDeliveryRepository,
  emailService, googleMeetService, storageService,
]
const originals = new Map(dependencies.map(dependency => [dependency, { ...dependency }]))

function restoreDependencies() {
  for (const [dependency, methods] of originals) {
    for (const key of Object.keys(dependency)) delete dependency[key]
    Object.assign(dependency, methods)
  }
}

test.afterEach(restoreDependencies)

test('calendar failures persist a retry marker and the next save retries before notifying', async () => {
  const oldTime = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const newTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
  let stage = {
    id: 11, stage_order: 1, name: 'Panel', type: 'human', scheduled_at: oldTime,
    schedule_timezone: 'Asia/Calcutta', duration_minutes: 30, interview_mode: 'simple',
    difficulty: 'medium', question_count: 10, require_pass: true, minimum_score: null,
    interviewer_user_id: 2, location: null, meeting_url: null, notes: null,
  }
  let interview = {
    id: 30, status: 'scheduled', meeting_url: 'https://meet.example/old',
    calendar_event_id: 'event-30', calendar_sync_error: null,
    candidate_first: 'Candidate', candidate_last: 'One', candidate_email: 'candidate@example.test',
    context_title: 'Client',
  }
  let updateAttempts = 0
  let assignmentSyncs = 0
  let candidateNotices = 0

  flowRepository.getOwnedFlow = async () => ({
    id: 10, status: 'run_specific', name: 'Flow', report_user_ids: '[]', stages: [{ ...stage }],
  })
  flowRepository.updateFlow = async () => ({ id: 10, status: 'run_specific', name: 'Flow' })
  flowRepository.updateStage = async (_stageId, _flowId, data) => {
    stage = {
      ...stage,
      stage_order: data.stageOrder, name: data.name, type: data.type,
      scheduled_at: data.scheduledAt, schedule_timezone: data.scheduleTimezone,
      duration_minutes: data.durationMinutes, interview_mode: data.interviewMode,
      difficulty: data.difficulty, question_count: data.questionCount,
      require_pass: data.requirePass, minimum_score: data.minimumScore,
      interviewer_user_id: data.interviewerUserId, location: data.location,
      meeting_url: data.meetingUrl, notes: data.notes,
    }
    return { ...stage }
  }
  flowRepository.ensureStageRuns = async () => []
  flowRepository.syncStageRunOrder = async () => []
  flowRepository.syncScheduledStageInterviews = async () => [{ id: interview.id }]
  flowRepository.getAssignedInterviewer = async () => ({
    id: 2, first_name: 'Interviewer', last_name: 'One', email: 'interviewer@example.test', role: 'candidate',
  })
  flowRepository.syncInterviewAssignments = async () => { assignmentSyncs += 1 }
  userRepository.getByIdsForCompany = async ids => ids.map(id => ({ id, email: `user-${id}@example.test` }))
  userRepository.getByIdForCompany = async id => ({
    id, first_name: id === 2 ? 'Interviewer' : 'Manager', last_name: 'One',
    email: `user-${id}@example.test`, role: id === 2 ? 'candidate' : 'manager',
  })
  interviewRepository.getById = async () => ({ ...interview })
  interviewRepository.setCalendarSyncError = async (_id, error) => {
    interview = { ...interview, calendar_sync_error: error }
    return interview
  }
  interviewRepository.updateMeetingDetails = async (_id, meetingUrl, calendarEventId) => {
    interview = { ...interview, meeting_url: meetingUrl, calendar_event_id: calendarEventId, calendar_sync_error: null }
    return interview
  }
  googleMeetService.isConfigured = () => true
  googleMeetService.updateMeeting = async () => {
    updateAttempts += 1
    if (updateAttempts === 1) throw new Error('temporary calendar outage')
    return { joinUrl: 'https://meet.example/new', eventId: 'event-30' }
  }
  emailService.sendInterviewScheduleUpdate = async () => { candidateNotices += 1 }
  emailService.sendInterviewerAssignment = async () => {}
  emailService.getDeliveredRecipients = value => [value]
  emailDeliveryRepository.create = async () => ({})

  const payload = {
    name: 'Flow', reportUserIds: [], stages: [{
      id: 11, name: 'Panel', type: 'human', scheduledAt: newTime,
      scheduleTimezone: 'Asia/Calcutta', durationMinutes: 30,
      interviewMode: 'simple', difficulty: 'medium', questionCount: 10,
      requirePass: true, interviewerUserId: 2,
    }],
  }

  await assert.rejects(
    flowService.updateFlow(10, payload, 9, 1, { allowRunSpecific: true }),
    /calendar synchronization failed/i
  )
  assert.match(interview.calendar_sync_error, /temporary calendar outage/i)
  assert.equal(candidateNotices, 0)
  assert.equal(assignmentSyncs, 0)

  await flowService.updateFlow(10, payload, 9, 1, { allowRunSpecific: true })
  assert.equal(updateAttempts, 2)
  assert.equal(interview.calendar_sync_error, null)
  assert.equal(candidateNotices, 1)
  assert.equal(assignmentSyncs, 1)
})

test('hard deletion cancels calendar events before deleting records and then notifies participants', async () => {
  const order = []
  flowRepository.getRunDeletionContext = async () => ({
    id: 44,
    interviews: [{
      id: 50, status: 'scheduled', calendar_event_id: 'event-50',
      candidate_first: 'Candidate', candidate_last: 'One', candidate_email: 'candidate@example.test',
      interviewer_first: 'Interviewer', interviewer_last: 'One', interviewer_email: 'interviewer@example.test',
      client_name: 'Client', stage_name: 'Panel', scheduled_at: new Date().toISOString(),
    }],
  })
  googleMeetService.cancelMeeting = async eventId => { order.push(`calendar:${eventId}`); return true }
  flowRepository.deleteRun = async () => { order.push('database'); return { id: 44, storagePaths: [] } }
  storageService.cleanupOrphanedFiles = () => {}
  emailService.sendInterviewCancelled = async () => { order.push('candidate-email') }
  emailService.sendInterviewerAssignmentCancelled = async () => { order.push('interviewer-email') }

  const result = await flowService.deleteRun(44, 9)
  assert.deepEqual(result, { id: 44, deleted: true })
  assert.deepEqual(order, ['calendar:event-50', 'database', 'candidate-email', 'interviewer-email'])
})
