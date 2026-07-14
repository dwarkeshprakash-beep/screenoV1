require('dotenv').config()

const assert = require('node:assert/strict')
const bcrypt = require('bcryptjs')
const db = require('../src/db/connection')
const interviewFlowService = require('../src/services/interview-flow.service')

const baseUrl = process.env.API_TEST_BASE_URL || 'http://localhost:4010'
const stamp = Date.now()
const state = {
  companyIds: [],
  userIds: [],
  managerIds: [],
  teamMemberIds: [],
  externalCandidateIds: [],
  interviewIds: [],
  assessmentIds: [],
  templateIds: [],
  clientTeamIds: [],
  flowIds: [],
  departmentName: `Codex QA ${stamp}`,
}
const DAY_MS = 24 * 60 * 60 * 1000

function futureDate(daysFromNow) {
  const date = new Date(Date.now() + daysFromNow * DAY_MS)
  date.setUTCHours(10, 0, 0, 0)
  return date.toISOString().slice(0, 10)
}

function futureIso(secondsFromNow) {
  return new Date(Date.now() + secondsFromNow * 1000).toISOString()
}

function monthValue(dateString) {
  return String(dateString).slice(0, 7)
}

async function waitUntil(isoString) {
  const waitMs = new Date(isoString).getTime() - Date.now() + 500
  if (waitMs > 0) {
    await new Promise(resolve => setTimeout(resolve, waitMs))
  }
}

async function api(path, { method = 'GET', token, cookie, body, form } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: form || (body ? JSON.stringify(body) : undefined),
  })
  const payload = await response.json()
  return {
    status: response.status,
    payload,
    cookie: response.headers.get('set-cookie')?.split(';')[0] || null,
  }
}

async function seedCompany(name, managerEmail, candidateEmail) {
  const password = process.env.API_TEST_PASSWORD || `ApiTest-${stamp}!`
  const passwordHash = await bcrypt.hash(password, 10)
  return db.transaction(async tx => {
    const company = (await tx.query(
      `INSERT INTO companies (name) VALUES (@name) RETURNING id`,
      { name }
    ))[0]
    const manager = (await tx.query(
      `INSERT INTO users
         (company_id, first_name, last_name, email, password, role)
       VALUES
         (@companyId, 'API', 'Manager', @email, @password, 'manager')
       RETURNING id`,
      { companyId: company.id, email: managerEmail, password: passwordHash }
    ))[0]
    const candidate = (await tx.query(
      `INSERT INTO users
         (company_id, first_name, last_name, email, password, role, availability)
       VALUES
         (@companyId, 'API', 'Candidate', @email, @password, 'candidate', 'bench')
       RETURNING id`,
      { companyId: company.id, email: candidateEmail, password: passwordHash }
    ))[0]
    const teamMember = (await tx.query(
      `INSERT INTO team_members (manager_id, user_id)
       VALUES (@managerId, @candidateId)
       RETURNING id`,
      { managerId: manager.id, candidateId: candidate.id }
    ))[0]

    state.companyIds.push(company.id)
    state.userIds.push(manager.id, candidate.id)
    state.managerIds.push(manager.id)
    state.teamMemberIds.push(teamMember.id)
    return { password, company, manager, candidate, teamMember }
  })
}

async function cleanup() {
  await db.transaction(async tx => {
    if (state.managerIds.length > 0) {
      const interviews = await tx.query(
        `SELECT id FROM interviews WHERE manager_id = ANY(@managerIds)`,
        { managerIds: state.managerIds }
      )
      state.interviewIds.push(...interviews.map(row => row.id))
    }
    const interviewIds = [...new Set(state.interviewIds)]
    if (state.flowIds.length > 0) {
      await tx.query(`DELETE FROM interview_assignment_files WHERE assignment_id IN (SELECT id FROM interview_assignments WHERE stage_run_id IN (SELECT id FROM candidate_flow_stage_runs WHERE run_id IN (SELECT id FROM candidate_flow_runs WHERE flow_id = ANY(@ids))))`, { ids: state.flowIds })
      await tx.query(`DELETE FROM interview_assignments WHERE stage_run_id IN (SELECT id FROM candidate_flow_stage_runs WHERE run_id IN (SELECT id FROM candidate_flow_runs WHERE flow_id = ANY(@ids)))`, { ids: state.flowIds })
      await tx.query(`DELETE FROM candidate_flow_stage_runs WHERE run_id IN (SELECT id FROM candidate_flow_runs WHERE flow_id = ANY(@ids))`, { ids: state.flowIds })
      await tx.query(`DELETE FROM candidate_flow_runs WHERE flow_id = ANY(@ids)`, { ids: state.flowIds })
      await tx.query(`DELETE FROM interview_flow_stages WHERE flow_id = ANY(@ids)`, { ids: state.flowIds })
      await tx.query(`DELETE FROM interview_flows WHERE id = ANY(@ids)`, { ids: state.flowIds })
    }
    if (interviewIds.length > 0) {
      await tx.query(`DELETE FROM email_outbox_jobs WHERE interview_id = ANY(@ids)`, { ids: interviewIds })
      await tx.query(`DELETE FROM monthly_assessment_occurrences WHERE interview_id = ANY(@ids)`, { ids: interviewIds })
      await tx.query(`DELETE FROM report_jobs WHERE interview_id = ANY(@ids)`, { ids: interviewIds })
      await tx.query(`DELETE FROM reports WHERE interview_id = ANY(@ids)`, { ids: interviewIds })
      await tx.query(`DELETE FROM scorecards WHERE interview_id = ANY(@ids)`, { ids: interviewIds })
      await tx.query(`DELETE FROM transcripts WHERE interview_id = ANY(@ids)`, { ids: interviewIds })
      await tx.query(`DELETE FROM email_deliveries WHERE interview_id = ANY(@ids)`, { ids: interviewIds })
      await tx.query(`DELETE FROM interview_assignment_files WHERE assignment_id IN (SELECT id FROM interview_assignments WHERE interview_id = ANY(@ids))`, { ids: interviewIds })
      await tx.query(`DELETE FROM interview_assignments WHERE interview_id = ANY(@ids)`, { ids: interviewIds })
      await tx.query(`DELETE FROM interviews WHERE id = ANY(@ids)`, { ids: interviewIds })
    }
    if (state.assessmentIds.length > 0) {
      await tx.query(
        `DELETE FROM email_outbox_jobs
         WHERE event_key LIKE 'monthly_occurrence_%'
           AND interview_id IN (
             SELECT interview_id
             FROM monthly_assessment_occurrences
             WHERE enrollment_id IN (
               SELECT id FROM monthly_assessment_enrollments WHERE assessment_id = ANY(@ids)
             )
           )`,
        { ids: state.assessmentIds }
      )
      await tx.query(
        `DELETE FROM monthly_assessment_occurrences
         WHERE enrollment_id IN (
           SELECT id FROM monthly_assessment_enrollments WHERE assessment_id = ANY(@ids)
         )`,
        { ids: state.assessmentIds }
      )
      await tx.query(`DELETE FROM assignment_requests WHERE assessment_id = ANY(@ids)`, {
        ids: state.assessmentIds,
      })
      await tx.query(
        `DELETE FROM monthly_assessment_enrollments WHERE assessment_id = ANY(@ids)`,
        { ids: state.assessmentIds }
      )
      await tx.query(
        `DELETE FROM monthly_assessments WHERE id = ANY(@ids)`,
        { ids: state.assessmentIds }
      )
    }
    if (state.templateIds.length > 0) {
      await tx.query(`DELETE FROM client_teams WHERE mandate_id = ANY(@ids)`, { ids: state.templateIds })
      await tx.query(`DELETE FROM client_templates WHERE id = ANY(@ids)`, { ids: state.templateIds })
    }
    if (state.teamMemberIds.length > 0) {
      await tx.query(`DELETE FROM team_members WHERE id = ANY(@ids)`, { ids: state.teamMemberIds })
    }
    if (state.externalCandidateIds.length > 0) {
      await tx.query(`DELETE FROM external_candidates WHERE id = ANY(@ids)`, {
        ids: state.externalCandidateIds,
      })
    }
    if (state.userIds.length > 0) {
      await tx.query(`DELETE FROM refresh_tokens WHERE user_id = ANY(@ids)`, { ids: state.userIds })
      await tx.query(`DELETE FROM users WHERE id = ANY(@ids)`, { ids: state.userIds })
    }
    if (state.companyIds.length > 0) {
      await tx.query(`DELETE FROM companies WHERE id = ANY(@ids)`, { ids: state.companyIds })
    }
    await tx.query(`DELETE FROM departments WHERE name = @name`, { name: state.departmentName })
  })
}

async function run() {
  const assessmentDate = futureDate(7)
  const conflictAssessmentDate = futureDate(12)
  const reusableAssessmentDate = futureDate(95)
  const duplicateAssessmentDate = futureDate(100)
  const assessmentMonth = monthValue(assessmentDate)
  const reusableAssessmentMonth = monthValue(reusableAssessmentDate)

  const primary = await seedCompany(
    `Screeno API QA ${stamp}`,
    `manager-${stamp}@example.test`,
    `candidate-${stamp}@example.test`
  )
  const foreign = await seedCompany(
    `Screeno API Foreign ${stamp}`,
    `foreign-manager-${stamp}@example.test`,
    `foreign-candidate-${stamp}@example.test`
  )

  const health = await api('/health')
  assert.equal(health.status, 200)
  assert.equal(health.payload.status, 'ok')

  const badLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: `manager-${stamp}@example.test`, password: 'wrong-password' },
  })
  assert.equal(badLogin.status, 401)

  const unauthenticated = await api('/api/team')
  assert.equal(unauthenticated.status, 401)

  const managerLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: `manager-${stamp}@example.test`, password: primary.password },
  })
  assert.equal(managerLogin.status, 200)
  assert.equal(managerLogin.payload.data.user.role, 'manager')
  assert.ok(managerLogin.cookie)
  const managerToken = managerLogin.payload.data.accessToken

  const refresh = await api('/api/auth/refresh', {
    method: 'POST',
    cookie: managerLogin.cookie,
  })
  assert.equal(refresh.status, 200)
  assert.ok(refresh.cookie)

  const team = await api('/api/team', { token: managerToken })
  assert.equal(team.status, 200)
  assert.equal(team.payload.data.length, 1)

  const organizationOnlyUser = (await db.query(
    `INSERT INTO users
       (company_id, first_name, last_name, email, password, role, availability)
     VALUES
       (@companyId, 'Organization', 'Only', @email, @password, 'employee', 'bench')
     RETURNING id`,
    {
      companyId: primary.company.id,
      email: `organization-only-${stamp}@example.test`,
      password: await bcrypt.hash(primary.password, 10),
    }
  ))[0]
  state.userIds.push(organizationOnlyUser.id)

  const employeeLogin = await api('/api/auth/login', {
    method: 'POST',
    body: {
      email: `organization-only-${stamp}@example.test`,
      password: primary.password,
    },
  })
  assert.equal(employeeLogin.status, 200)
  assert.equal(employeeLogin.payload.data.user.role, 'candidate')

  const orgUsers = await api('/api/schedule/org-users', { token: managerToken })
  assert.equal(orgUsers.status, 200)
  assert.ok(orgUsers.payload.data.some(user => user.id === organizationOnlyUser.id))

  const invalidDocument = new FormData()
  invalidDocument.append('file', new Blob(['not a document'], { type: 'audio/webm' }), 'audio.webm')
  const invalidDocumentUpload = await api('/api/upload/extract-text', {
    method: 'POST',
    token: managerToken,
    form: invalidDocument,
  })
  assert.equal(invalidDocumentUpload.status, 400)
  assert.match(invalidDocumentUpload.payload.error, /Document file type not allowed/)

  const addedMember = await api('/api/team/member', {
    method: 'POST',
    token: managerToken,
    body: {
      firstName: 'Added',
      lastName: 'Member',
      email: `added-${stamp}@example.test`,
      employeeId: `EMP-${stamp}`,
      position: 'Platform Engineer',
      department: state.departmentName,
      location: 'Ahmedabad',
    },
  })
  assert.equal(addedMember.status, 201)
  assert.equal(addedMember.payload.data.employee_id, `EMP-${stamp}`)
  assert.equal(addedMember.payload.data.current_position, 'Platform Engineer')
  assert.equal(addedMember.payload.data.department, state.departmentName)
  state.teamMemberIds.push(addedMember.payload.data.id)
  state.userIds.push(addedMember.payload.data.user_id)

  const external = await api('/api/team/external', {
    method: 'POST',
    token: managerToken,
    body: {
      firstName: 'External',
      lastName: 'Candidate',
      email: `external-${stamp}@example.test`,
      resumeUrl: 'https://example.test/resume.pdf',
    },
  })
  assert.equal(external.status, 201)
  assert.equal(external.payload.data.resume_url, 'https://example.test/resume.pdf')
  state.externalCandidateIds.push(external.payload.data.id)

  const template = await api('/api/templates/client', {
    method: 'POST',
    token: managerToken,
    body: {
      client_name: `QA Client ${stamp}`,
      requirements: 'Node.js engineer',
      headcount: 1,
      jd_text: 'Node.js, PostgreSQL, API testing',
      tags: ['Node.js', 'PostgreSQL'],
    },
  })
  assert.equal(template.status, 201)
  state.templateIds.push(template.payload.data.id)

  const clientCandidates = await api(
    `/api/templates/client/${template.payload.data.id}/matches`,
    { token: managerToken }
  )
  assert.equal(clientCandidates.status, 200)
  const organizationCandidate = clientCandidates.payload.data.find(
    user => user.id === organizationOnlyUser.id
  )
  assert.ok(organizationCandidate)
  assert.equal(organizationCandidate.match_score, 0)
  assert.equal(organizationCandidate.recommended, false)

  const informationalHeadcountTeam = await api(`/api/templates/client/${template.payload.data.id}/team`, {
    method: 'POST', token: managerToken,
    body: { userIds: [primary.candidate.id, organizationOnlyUser.id] },
  })
  assert.equal(informationalHeadcountTeam.status, 201)
  assert.equal(informationalHeadcountTeam.payload.data.length, 2)
  state.clientTeamIds.push(...informationalHeadcountTeam.payload.data.map(row => row.id))

  const flow = await api('/api/interview-flows', {
    method: 'POST', token: managerToken,
    body: {
      mandateId: template.payload.data.id,
      name: 'Seven-day candidate flow',
      stages: [
        { name: 'Voice screen', type: 'ai_voice', scheduledAt: futureIso(10 * 24 * 60 * 60), durationMinutes: 15, questionCount: 5, requirePass: true },
        { name: 'Technical exam', type: 'exam', scheduledAt: futureIso(10 * 24 * 60 * 60 + 15 * 60), durationMinutes: 60, questionCount: 8, requirePass: true, minimumScore: 6 },
        { name: 'Offline panel', type: 'offline', scheduledAt: futureIso(10 * 24 * 60 * 60 + 75 * 60), durationMinutes: 30, questionCount: 10, requirePass: false, interviewerUserId: primary.manager.id, location: 'QA room' },
      ],
    },
  })
  assert.equal(flow.status, 201)
  assert.equal(flow.payload.data.stages.length, 3)
  state.flowIds.push(flow.payload.data.id)

  const overlappingFlow = await api('/api/interview-flows', {
    method: 'POST', token: managerToken,
    body: {
      mandateId: template.payload.data.id,
      name: 'Invalid overlapping flow',
      stages: [
        { name: 'First', type: 'ai_voice', scheduledAt: futureIso(11 * 24 * 60 * 60), durationMinutes: 30, questionCount: 5 },
        { name: 'Overlap', type: 'exam', scheduledAt: futureIso(11 * 24 * 60 * 60 + 15 * 60), durationMinutes: 30, questionCount: 5 },
      ],
    },
  })
  assert.equal(overlappingFlow.status, 400)
  assert.match(overlappingFlow.payload.error, /must start after stage 1 ends/i)

  const editedFlow = await api(`/api/interview-flows/${flow.payload.data.id}`, {
    method: 'PATCH', token: managerToken,
    body: {
      mandateId: template.payload.data.id,
      name: 'Edited seven-day candidate flow',
      stages: flow.payload.data.stages.map(stage => ({
        id: stage.id,
        name: stage.name,
        type: stage.type,
        scheduledAt: stage.scheduled_at,
        durationMinutes: stage.duration_minutes,
        questionCount: stage.question_count,
        requirePass: stage.require_pass,
        minimumScore: stage.minimum_score,
        interviewerUserId: stage.interviewer_user_id,
        location: stage.location,
        meetingUrl: stage.meeting_url,
      })),
    },
  })
  assert.equal(editedFlow.status, 200)
  assert.equal(editedFlow.payload.data.name, 'Edited seven-day candidate flow')

  const primaryClientTeam = informationalHeadcountTeam.payload.data.find(row => row.user_id === primary.candidate.id)
  const managerInterview = await api(`/api/templates/client/${template.payload.data.id}/team/${primaryClientTeam.id}/schedule`, {
    method: 'POST', token: managerToken,
    body: {
      type: 'offline', scheduledAt: futureIso(9 * 24 * 60 * 60), durationMinutes: 45,
      location: 'QA conference room', interviewerUserId: primary.manager.id,
      scheduleTimezone: 'Asia/Calcutta',
    },
  })
  assert.equal(managerInterview.status, 201)
  state.interviewIds.push(managerInterview.payload.data.id)
  const managerAssignments = await api('/api/interview-flows/my-assignments', { token: managerToken })
  assert.equal(managerAssignments.status, 200)
  assert.ok(managerAssignments.payload.data.some(item => item.interview_id === managerInterview.payload.data.id))

  const flowRun = await api(`/api/interview-flows/${flow.payload.data.id}/runs`, {
    method: 'POST', token: managerToken, body: { clientTeamId: primaryClientTeam.id },
  })
  assert.equal(flowRun.status, 201)
  state.interviewIds.push(flowRun.payload.data.firstInterview.id)
  const duplicateFlowRun = await api(`/api/interview-flows/${flow.payload.data.id}/runs`, {
    method: 'POST', token: managerToken, body: { clientTeamId: primaryClientTeam.id },
  })
  assert.equal(duplicateFlowRun.status, 400)
  assert.match(duplicateFlowRun.payload.error, /already has an active run/i)
  const runtimeStages = await db.query(
    `SELECT status, interview_id FROM candidate_flow_stage_runs WHERE run_id = @runId ORDER BY stage_order`,
    { runId: flowRun.payload.data.id }
  )
  assert.equal(runtimeStages.length, 3)
  assert.equal(runtimeStages[0].status, 'scheduled')
  assert.ok(runtimeStages[0].interview_id)
  const flowInterviewDelivery = (await db.query(
    `SELECT report_emails FROM interviews WHERE id = @id`,
    { id: runtimeStages[0].interview_id }
  ))[0]
  assert.equal(flowInterviewDelivery.report_emails, `manager-${stamp}@example.test`)
  assert.equal(runtimeStages[1].status, 'pending')
  assert.equal(runtimeStages[1].interview_id, null)

  const shiftedStageTimes = editedFlow.payload.data.stages.map((stage, index) => {
    const date = new Date(stage.scheduled_at)
    date.setUTCMinutes(date.getUTCMinutes() + (index === 0 ? 5 : 10))
    return date.toISOString()
  })
  const runtimeEditedFlow = await api(`/api/interview-flows/${flow.payload.data.id}`, {
    method: 'PATCH', token: managerToken,
    body: {
      mandateId: template.payload.data.id,
      name: editedFlow.payload.data.name,
      stages: editedFlow.payload.data.stages.map((stage, index) => ({
        id: stage.id,
        name: stage.name,
        type: stage.type,
        scheduledAt: shiftedStageTimes[index],
        durationMinutes: index === 0 ? 20 : stage.duration_minutes,
        questionCount: index === 0 ? 7 : stage.question_count,
        requirePass: stage.require_pass,
        minimumScore: stage.minimum_score,
        interviewerUserId: stage.interviewer_user_id,
        location: stage.location,
        meetingUrl: stage.meeting_url,
      })),
    },
  })
  assert.equal(runtimeEditedFlow.status, 200)
  const synchronizedInterview = (await db.query(
    `SELECT scheduled_at, duration_minutes, question_count
     FROM interviews WHERE id = @id`,
    { id: runtimeStages[0].interview_id }
  ))[0]
  assert.equal(new Date(synchronizedInterview.scheduled_at).toISOString(), shiftedStageTimes[0])
  assert.equal(Number(synchronizedInterview.duration_minutes), 20)
  assert.equal(Number(synchronizedInterview.question_count), 7)
  const flowCandidateLogin = await api('/api/auth/login', {
    method: 'POST', body: { email: `candidate-${stamp}@example.test`, password: primary.password },
  })
  assert.equal(flowCandidateLogin.status, 200)
  const flowCandidateInterviews = await api('/api/candidate/interviews', {
    token: flowCandidateLogin.payload.data.accessToken,
  })
  const candidateFlowInterview = flowCandidateInterviews.payload.data.find(
    item => item.id === runtimeStages[0].interview_id
  )
  assert.ok(candidateFlowInterview)
  assert.equal(new Date(candidateFlowInterview.scheduled_at).toISOString(), shiftedStageTimes[0])
  assert.equal(Number(candidateFlowInterview.duration_minutes), 20)
  const editedScheduleWindow = (await db.query(
    `SELECT due_at, token_expires FROM interviews WHERE id = @id`,
    { id: flowRun.payload.data.firstInterview.id }
  ))[0]
  assert.ok(new Date(editedScheduleWindow.token_expires) > new Date(editedScheduleWindow.due_at))

  await interviewFlowService.handleInterviewResult(flowRun.payload.data.firstInterview.id, 'pass', 8)
  const advancedStages = await db.query(
    `SELECT status, interview_id FROM candidate_flow_stage_runs WHERE run_id = @runId ORDER BY stage_order`,
    { runId: flowRun.payload.data.id }
  )
  assert.equal(advancedStages[0].status, 'passed')
  assert.equal(advancedStages[1].status, 'scheduled')
  assert.ok(advancedStages[1].interview_id)
  assert.equal(advancedStages[2].status, 'pending')

  await interviewFlowService.handleInterviewResult(advancedStages[1].interview_id, 'pass', 5)
  const pausedRun = (await db.query(`SELECT status FROM candidate_flow_runs WHERE id = @id`, { id: flowRun.payload.data.id }))[0]
  assert.equal(pausedRun.status, 'paused_failed')
  const attemptsBeforeInvalidRetry = (await db.query(
    `SELECT COUNT(*)::int AS count FROM candidate_flow_stage_runs
     WHERE run_id = @runId AND stage_order = 2`,
    { runId: flowRun.payload.data.id }
  ))[0].count
  const invalidRetry = await api(`/api/interview-flows/runs/${flowRun.payload.data.id}/retry`, {
    method: 'POST', token: managerToken, body: { scheduledAt: 'not-a-date' },
  })
  assert.equal(invalidRetry.status, 400)
  const attemptsAfterInvalidRetry = (await db.query(
    `SELECT COUNT(*)::int AS count FROM candidate_flow_stage_runs
     WHERE run_id = @runId AND stage_order = 2`,
    { runId: flowRun.payload.data.id }
  ))[0].count
  assert.equal(attemptsAfterInvalidRetry, attemptsBeforeInvalidRetry)
  const continuedRun = await api(`/api/interview-flows/runs/${flowRun.payload.data.id}/continue`, {
    method: 'POST', token: managerToken,
  })
  assert.equal(continuedRun.status, 200)
  assert.equal(continuedRun.payload.data.status, 'active')
  const offlineAssignments = await api('/api/interview-flows/my-assignments', { token: managerToken })
  assert.equal(offlineAssignments.status, 200)
  const offlineAssignment = offlineAssignments.payload.data.find(
    item => item.interview_id === continuedRun.payload.data.interview.id
  )
  assert.ok(offlineAssignment)
  const feedbackForm = new FormData()
  feedbackForm.append('outcome', 'pass')
  feedbackForm.append('feedback', 'Strong offline panel result')
  const completedOffline = await api(`/api/interview-flows/assignments/${offlineAssignment.id}/complete`, {
    method: 'POST', token: managerToken, form: feedbackForm,
  })
  assert.equal(completedOffline.status, 200)
  const completedFlowRun = (await db.query(
    `SELECT status FROM candidate_flow_runs WHERE id = @id`,
    { id: flowRun.payload.data.id }
  ))[0]
  assert.equal(completedFlowRun.status, 'completed')
  const cancelledFlowRun = await api(`/api/interview-flows/runs/${flowRun.payload.data.id}`, {
    method: 'DELETE', token: managerToken,
  })
  assert.equal(cancelledFlowRun.status, 200)
  const deletedFlow = await api(`/api/interview-flows/${flow.payload.data.id}`, {
    method: 'DELETE', token: managerToken,
  })
  assert.equal(deletedFlow.status, 200)

  // Report generation can finish after an exactly consecutive stage's configured
  // start. The next stage must still activate immediately instead of requiring a
  // manager retry solely because processing crossed that boundary.
  const overdueFlow = await api('/api/interview-flows', {
    method: 'POST', token: managerToken,
    body: {
      mandateId: template.payload.data.id,
      name: 'Overdue progression flow',
      stages: [
        { name: 'Immediate first', type: 'ai_voice', scheduledAt: futureIso(12 * 24 * 60 * 60), durationMinutes: 15, questionCount: 5 },
        { name: 'Immediate second', type: 'exam', scheduledAt: futureIso(12 * 24 * 60 * 60 + 15 * 60), durationMinutes: 15, questionCount: 5 },
      ],
    },
  })
  assert.equal(overdueFlow.status, 201)
  state.flowIds.push(overdueFlow.payload.data.id)
  const organizationClientTeam = informationalHeadcountTeam.payload.data.find(
    row => row.user_id === organizationOnlyUser.id
  )
  const overdueRun = await api(`/api/interview-flows/${overdueFlow.payload.data.id}/runs`, {
    method: 'POST', token: managerToken, body: { clientTeamId: organizationClientTeam.id },
  })
  assert.equal(overdueRun.status, 201)
  await db.query(
    `UPDATE interview_flow_stages
     SET scheduled_at = CURRENT_TIMESTAMP - INTERVAL '1 minute'
     WHERE flow_id = @flowId AND stage_order = 2`,
    { flowId: overdueFlow.payload.data.id }
  )
  const progressionStartedAt = Date.now()
  const overdueProgression = await interviewFlowService.handleInterviewResult(
    overdueRun.payload.data.firstInterview.id,
    'pass',
    8
  )
  assert.equal(overdueProgression.status, 'active')
  const overdueSecondStage = (await db.query(
    `SELECT r.status AS run_status, sr.status AS stage_status, i.scheduled_at
     FROM candidate_flow_runs r
     JOIN candidate_flow_stage_runs sr ON sr.run_id = r.id AND sr.stage_order = 2
     JOIN interviews i ON i.id = sr.interview_id
     WHERE r.id = @runId`,
    { runId: overdueRun.payload.data.id }
  ))[0]
  assert.equal(overdueSecondStage.run_status, 'active')
  assert.equal(overdueSecondStage.stage_status, 'scheduled')
  assert.ok(new Date(overdueSecondStage.scheduled_at).getTime() > progressionStartedAt)
  assert.ok(new Date(overdueSecondStage.scheduled_at).getTime() <= Date.now() + 2 * 60 * 1000)
  const deletedOverdueRun = await api(`/api/interview-flows/runs/${overdueRun.payload.data.id}`, {
    method: 'DELETE', token: managerToken,
  })
  assert.equal(deletedOverdueRun.status, 200)
  const deletedOverdueFlow = await api(`/api/interview-flows/${overdueFlow.payload.data.id}`, {
    method: 'DELETE', token: managerToken,
  })
  assert.equal(deletedOverdueFlow.status, 200)

  const assessment = await api('/api/assessments/monthly', {
    method: 'POST',
    token: managerToken,
    body: {
      subject: 'Backend Engineering',
      difficulty: 'medium',
      duration_months: 2,
      assessment_date: assessmentDate,
      team_member_ids: [primary.teamMember.id],
      sub_topics: ['Node.js', 'PostgreSQL'],
      jd_text: 'Backend assessment',
    },
  })
  assert.equal(assessment.status, 201)
  state.assessmentIds.push(assessment.payload.data.id)
  assert.equal(assessment.payload.data.enrollments.length, 1)
  assert.ok(String(assessment.payload.data.enrollments[0].start_date).startsWith(assessmentDate))

  const firstAssessmentPlan = await api(`/api/assessments/monthly/plan?month=${assessmentMonth}`, {
    token: managerToken,
  })
  assert.equal(firstAssessmentPlan.status, 200)
  assert.equal(firstAssessmentPlan.payload.data.teamCount, 2)
  assert.equal(firstAssessmentPlan.payload.data.assignedCount, 1)
  assert.ok(firstAssessmentPlan.payload.data.subjects.some(subject =>
    subject.id === assessment.payload.data.id
      && subject.candidates.some(candidate => candidate.team_member_id === primary.teamMember.id)
  ))
  assert.ok(firstAssessmentPlan.payload.data.unassigned.some(member => member.id === addedMember.payload.data.id))

  const reusableTemplate = await api('/api/assessments/monthly', {
    method: 'POST',
    token: managerToken,
    body: {
      subject: 'Cloud Fundamentals',
      difficulty: 'easy',
      duration_months: 1,
      sub_topics: ['AWS', 'Networking'],
      jd_text: 'Cloud fundamentals study material',
    },
  })
  assert.equal(reusableTemplate.status, 201)
  assert.deepEqual(reusableTemplate.payload.data.enrollments, [])
  state.assessmentIds.push(reusableTemplate.payload.data.id)

  const crossSubjectConflict = await api(
    `/api/assessments/monthly/${reusableTemplate.payload.data.id}/assign`,
    {
      method: 'POST',
      token: managerToken,
      body: {
        assessment_date: conflictAssessmentDate,
        team_member_ids: [primary.teamMember.id],
      },
    }
  )
  assert.equal(crossSubjectConflict.status, 409)
  assert.match(crossSubjectConflict.payload.error, /Backend Engineering/)

  const reusableAssignment = await api(
    `/api/assessments/monthly/${reusableTemplate.payload.data.id}/assign`,
    {
      method: 'POST',
      token: managerToken,
      body: {
        assessment_date: reusableAssessmentDate,
        team_member_ids: [addedMember.payload.data.id],
      },
    }
  )
  assert.equal(reusableAssignment.status, 201)
  assert.equal(reusableAssignment.payload.data.enrollments.length, 1)

  const duplicateAssignment = await api(
    `/api/assessments/monthly/${reusableTemplate.payload.data.id}/assign`,
    {
      method: 'POST',
      token: managerToken,
      body: {
        assessment_date: duplicateAssessmentDate,
        team_member_ids: [addedMember.payload.data.id],
      },
    }
  )
  assert.equal(duplicateAssignment.status, 409)
  assert.match(duplicateAssignment.payload.error, /Cloud Fundamentals/)

  const reusablePlan = await api(`/api/assessments/monthly/plan?month=${reusableAssessmentMonth}`, {
    token: managerToken,
  })
  assert.equal(reusablePlan.status, 200)
  assert.ok(reusablePlan.payload.data.subjects.some(subject =>
    subject.id === reusableTemplate.payload.data.id
      && subject.candidates.some(candidate => candidate.team_member_id === addedMember.payload.data.id)
  ))
  assert.ok(reusablePlan.payload.data.unassigned.some(member => member.id === primary.teamMember.id))

  const removedEnrollment = await api(
    `/api/assessments/monthly/enrollments/${reusableAssignment.payload.data.enrollments[0].id}`,
    { method: 'DELETE', token: managerToken }
  )
  assert.equal(removedEnrollment.status, 200)
  assert.equal(removedEnrollment.payload.data.deleted, true)

  const octoberPlanAfterRemoval = await api(
    `/api/assessments/monthly/plan?month=${reusableAssessmentMonth}`,
    { token: managerToken }
  )
  assert.equal(octoberPlanAfterRemoval.status, 200)
  assert.ok(octoberPlanAfterRemoval.payload.data.unassigned.some(
    member => member.id === addedMember.payload.data.id
  ))

  const reassignmentAfterRemoval = await api(
    `/api/assessments/monthly/${reusableTemplate.payload.data.id}/assign`,
    {
      method: 'POST',
      token: managerToken,
      body: {
        assessment_date: reusableAssessmentDate,
        team_member_ids: [addedMember.payload.data.id],
      },
    }
  )
  assert.equal(reassignmentAfterRemoval.status, 201)

  const invalidPlanMonth = await api('/api/assessments/monthly/plan?month=October-2026', {
    token: managerToken,
  })
  assert.equal(invalidPlanMonth.status, 400)

  const monthlyCalendar = await api('/api/assessments/monthly/calendar', {
    token: managerToken,
  })
  assert.equal(monthlyCalendar.status, 200)
  assert.ok(monthlyCalendar.payload.data.some(row =>
    row.assessment_id === assessment.payload.data.id
      && String(row.start_date).startsWith(assessmentDate)
  ))

  const foreignAssessment = await api('/api/assessments/monthly', {
    method: 'POST',
    token: managerToken,
    body: {
      subject: 'Forbidden Assessment',
      team_member_ids: [foreign.teamMember.id],
    },
  })
  assert.equal(foreignAssessment.status, 403)

  const primaryScheduleAt = futureIso(3)
  const schedule = await api('/api/schedule', {
    method: 'POST',
    token: managerToken,
    body: {
      teamMemberId: primary.teamMember.id,
      type: 'ai_voice',
      scheduledAt: primaryScheduleAt,
      interviewMode: 'simple',
      difficulty: 'medium',
      questionCount: 5,
      clientTemplateId: template.payload.data.id,
    },
  })
  assert.equal(schedule.status, 201)
  assert.equal(schedule.payload.data.status, 'scheduled')
  assert.equal(schedule.payload.data.token, undefined)
  assert.equal(schedule.payload.data.report_emails, null)
  state.interviewIds.push(schedule.payload.data.id)

  const organizationSchedule = await api('/api/schedule', {
    method: 'POST',
    token: managerToken,
    body: {
      userId: organizationOnlyUser.id,
      type: 'ai_voice',
      scheduledAt: futureIso(24 * 60 * 60),
      interviewMode: 'adaptive',
      difficulty: 'hard',
      questionCount: 7,
      reportUserIds: [primary.manager.id, primary.candidate.id],
    },
  })
  assert.equal(organizationSchedule.status, 201)
  assert.equal(organizationSchedule.payload.data.internal_user_id, organizationOnlyUser.id)
  assert.equal(organizationSchedule.payload.data.question_count, 7)
  assert.match(
    organizationSchedule.payload.data.report_emails,
    new RegExp(`manager-${stamp}@example\\.test`)
  )
  assert.match(
    organizationSchedule.payload.data.report_emails,
    new RegExp(`candidate-${stamp}@example\\.test`)
  )
  state.interviewIds.push(organizationSchedule.payload.data.id)

  const cancellableClientSchedule = await api('/api/schedule', {
    method: 'POST',
    token: managerToken,
    body: {
      userId: organizationOnlyUser.id,
      type: 'ai_voice',
      scheduledAt: futureIso(2 * 24 * 60 * 60),
      interviewMode: 'simple',
      difficulty: 'medium',
      questionCount: 6,
      clientTemplateId: template.payload.data.id,
    },
  })
  assert.equal(cancellableClientSchedule.status, 201)
  state.interviewIds.push(cancellableClientSchedule.payload.data.id)

  const clientAssignments = await api(
    `/api/templates/client/${template.payload.data.id}/assignments`,
    { token: managerToken }
  )
  assert.equal(clientAssignments.status, 200)
  assert.ok(clientAssignments.payload.data.some(
    assignment => assignment.id === cancellableClientSchedule.payload.data.id
  ))

  const cancelledClientAssignment = await api(
    `/api/templates/client/${template.payload.data.id}/assignments/${cancellableClientSchedule.payload.data.id}`,
    { method: 'DELETE', token: managerToken }
  )
  assert.equal(cancelledClientAssignment.status, 200)
  assert.equal(cancelledClientAssignment.payload.data.status, 'cancelled')

  const foreignRecipientSchedule = await api('/api/schedule', {
    method: 'POST',
    token: managerToken,
    body: {
      userId: organizationOnlyUser.id,
      type: 'ai_voice',
      scheduledAt: futureIso(3 * 24 * 60 * 60),
      interviewMode: 'simple',
      difficulty: 'medium',
      questionCount: 5,
      reportUserIds: [foreign.candidate.id],
    },
  })
  assert.equal(foreignRecipientSchedule.status, 400)

  const externalSchedule = await api('/api/schedule', {
    method: 'POST',
    token: managerToken,
    body: {
      candidateId: external.payload.data.id,
      type: 'exam',
      scheduledAt: futureIso(4 * 24 * 60 * 60),
      interviewMode: 'simple',
      difficulty: 'easy',
      questionCount: 5,
    },
  })
  assert.equal(externalSchedule.status, 201)
  state.interviewIds.push(externalSchedule.payload.data.id)

  const calendar = await api('/api/schedule/calendar', { token: managerToken })
  assert.equal(calendar.status, 200)
  assert.ok(calendar.payload.data.some(item => item.id === schedule.payload.data.id))

  const reports = await api('/api/reports/team', { token: managerToken })
  assert.equal(reports.status, 200)
  assert.ok(Array.isArray(reports.payload.data.reports))

  const profile = await api('/api/profile', { token: managerToken })
  assert.equal(profile.status, 200)
  assert.equal(profile.payload.data.role, 'manager')

  const candidateLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: `candidate-${stamp}@example.test`, password: primary.password },
  })
  assert.equal(candidateLogin.status, 200)
  const candidateToken = candidateLogin.payload.data.accessToken

  const candidateInterviews = await api('/api/candidate/interviews', { token: candidateToken })
  assert.equal(candidateInterviews.status, 200)
  assert.ok(candidateInterviews.payload.data.some(item => item.id === schedule.payload.data.id))
  assert.ok(candidateInterviews.payload.data.some(item => item.id === managerInterview.payload.data.id))

  await waitUntil(primaryScheduleAt)
  const launch = await api(`/api/candidate/interviews/${schedule.payload.data.id}/launch`, {
    method: 'POST',
    token: candidateToken,
  })
  assert.equal(launch.status, 200)
  assert.ok(launch.payload.data.launchToken)
  assert.ok(launch.payload.data.sessionToken)

  const slots = await api(`/api/schedule/slots/${launch.payload.data.launchToken}`)
  assert.equal(slots.status, 200)
  assert.equal(slots.payload.data.id, schedule.payload.data.id)

  const magicLink = await api(`/api/auth/magic-link/${launch.payload.data.launchToken}`, {
    method: 'POST',
  })
  assert.equal(magicLink.status, 200)
  assert.equal(magicLink.payload.data.interview.id, schedule.payload.data.id)

  const foreignLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: `foreign-manager-${stamp}@example.test`, password: foreign.password },
  })
  assert.equal(foreignLogin.status, 200)
  const forbiddenDeliveries = await api(
    `/api/schedule/email-deliveries/${schedule.payload.data.id}`,
    { token: foreignLogin.payload.data.accessToken }
  )
  assert.equal(forbiddenDeliveries.status, 403)

  console.log('API regression passed: auth, refresh, upload guards, team, external, templates, assessments, schedules, reports, candidate launch, and ownership.')
}

run()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await cleanup()
      console.log('API regression cleanup complete.')
    } catch (cleanupError) {
      console.error('API regression cleanup failed:', cleanupError)
      process.exitCode = 1
    }
    process.exit(process.exitCode || 0)
  })
