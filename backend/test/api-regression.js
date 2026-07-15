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
      const runFlowRows = await tx.query(
        `SELECT DISTINCT flow_id FROM candidate_flow_runs
         WHERE flow_id = ANY(@ids) OR template_flow_id = ANY(@ids)`,
        { ids: state.flowIds }
      )
      const cleanupFlowIds = [...new Set([...state.flowIds, ...runFlowRows.map(row => row.flow_id)])]
      await tx.query(`DELETE FROM interview_assignment_files WHERE assignment_id IN (SELECT id FROM interview_assignments WHERE stage_run_id IN (SELECT id FROM candidate_flow_stage_runs WHERE run_id IN (SELECT id FROM candidate_flow_runs WHERE flow_id = ANY(@ids))))`, { ids: cleanupFlowIds })
      await tx.query(`DELETE FROM interview_assignments WHERE stage_run_id IN (SELECT id FROM candidate_flow_stage_runs WHERE run_id IN (SELECT id FROM candidate_flow_runs WHERE flow_id = ANY(@ids)))`, { ids: cleanupFlowIds })
      await tx.query(`DELETE FROM candidate_flow_stage_runs WHERE run_id IN (SELECT id FROM candidate_flow_runs WHERE flow_id = ANY(@ids))`, { ids: cleanupFlowIds })
      await tx.query(`DELETE FROM candidate_flow_runs WHERE flow_id = ANY(@ids)`, { ids: cleanupFlowIds })
      await tx.query(`DELETE FROM interview_flow_stages WHERE flow_id = ANY(@ids)`, { ids: cleanupFlowIds })
      await tx.query(`DELETE FROM interview_flows WHERE id = ANY(@ids)`, { ids: cleanupFlowIds })
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
      reportUserIds: [primary.manager.id, organizationOnlyUser.id],
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
      reportUserIds: [primary.manager.id, organizationOnlyUser.id],
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
  assert.deepEqual(
    [...editedFlow.payload.data.report_user_ids].sort((a, b) => a - b),
    [primary.manager.id, organizationOnlyUser.id].sort((a, b) => a - b)
  )

  const primaryClientTeam = informationalHeadcountTeam.payload.data.find(row => row.user_id === primary.candidate.id)
  const managerInterview = await api(`/api/templates/client/${template.payload.data.id}/team/${primaryClientTeam.id}/schedule`, {
    method: 'POST', token: managerToken,
    body: {
      type: 'offline', scheduledAt: futureIso(9 * 24 * 60 * 60), durationMinutes: 2,
      location: 'QA conference room', interviewerUserId: primary.manager.id,
      scheduleTimezone: 'Asia/Calcutta',
    },
  })
  assert.equal(managerInterview.status, 201)
  state.interviewIds.push(managerInterview.payload.data.id)
  const managerAssignments = await api('/api/interview-flows/my-assignments', { token: managerToken })
  assert.equal(managerAssignments.status, 200)
  assert.ok(managerAssignments.payload.data.some(item => item.interview_id === managerInterview.payload.data.id))

  const selfInterviewFlow = await api('/api/interview-flows', {
    method: 'POST', token: managerToken,
    body: {
      mandateId: template.payload.data.id,
      name: 'Invalid self interview flow',
      stages: [{
        name: 'Self panel', type: 'offline', scheduledAt: futureIso(8 * 24 * 60 * 60),
        durationMinutes: 15, questionCount: 10, interviewerUserId: primary.candidate.id,
        location: 'QA room',
      }],
    },
  })
  assert.equal(selfInterviewFlow.status, 201)
  const rejectedSelfInterview = await api(`/api/interview-flows/${selfInterviewFlow.payload.data.id}/runs`, {
    method: 'POST', token: managerToken, body: { clientTeamId: primaryClientTeam.id },
  })
  assert.equal(rejectedSelfInterview.status, 400)
  assert.match(rejectedSelfInterview.payload.error, /candidate and interviewer must be different/i)
  const deletedSelfInterviewFlow = await api(`/api/interview-flows/${selfInterviewFlow.payload.data.id}`, {
    method: 'DELETE', token: managerToken,
  })
  assert.equal(deletedSelfInterviewFlow.status, 200)

  const concurrentFlowStarts = await Promise.all([
    api(`/api/interview-flows/${flow.payload.data.id}/runs`, {
      method: 'POST', token: managerToken, body: { clientTeamId: primaryClientTeam.id },
    }),
    api(`/api/interview-flows/${flow.payload.data.id}/runs`, {
      method: 'POST', token: managerToken, body: { clientTeamId: primaryClientTeam.id },
    }),
  ])
  const flowRun = concurrentFlowStarts.find(result => result.status === 201)
  const duplicateFlowRun = concurrentFlowStarts.find(result => result.status === 400)
  assert.ok(flowRun)
  assert.ok(duplicateFlowRun)
  assert.equal(flowRun.status, 201)
  state.interviewIds.push(flowRun.payload.data.firstInterview.id)
  const isolatedRunDefinition = await api(`/api/interview-flows/runs/${flowRun.payload.data.id}/definition`, {
    token: managerToken,
  })
  assert.equal(isolatedRunDefinition.status, 200)
  assert.notEqual(isolatedRunDefinition.payload.data.id, flow.payload.data.id)
  const savedFlowDefinitions = await api(`/api/interview-flows/mandate/${template.payload.data.id}`, {
    token: managerToken,
  })
  assert.ok(savedFlowDefinitions.payload.data.some(item => item.id === flow.payload.data.id))
  assert.ok(!savedFlowDefinitions.payload.data.some(
    item => item.id === isolatedRunDefinition.payload.data.id
  ))
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
  assert.deepEqual(
    flowInterviewDelivery.report_emails.split(',').map(email => email.trim()).sort(),
    [`manager-${stamp}@example.test`, `organization-only-${stamp}@example.test`].sort()
  )
  assert.equal(runtimeStages[1].status, 'pending')
  assert.equal(runtimeStages[1].interview_id, null)

  const rejectedPastFlowEdit = await api(`/api/interview-flows/runs/${flowRun.payload.data.id}/definition`, {
    method: 'PATCH', token: managerToken,
    body: {
      mandateId: template.payload.data.id,
      name: isolatedRunDefinition.payload.data.name,
      reportUserIds: isolatedRunDefinition.payload.data.report_user_ids,
      stages: isolatedRunDefinition.payload.data.stages.map((stage, index) => ({
        id: stage.id,
        name: stage.name,
        type: stage.type,
        scheduledAt: index === 0 ? new Date(Date.now() - 60000).toISOString() : stage.scheduled_at,
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
  assert.equal(rejectedPastFlowEdit.status, 400)
  assert.match(rejectedPastFlowEdit.payload.error, /future date and time/i)

  const shiftedStageTimes = editedFlow.payload.data.stages.map((stage, index) => {
    const date = new Date(stage.scheduled_at)
    date.setUTCMinutes(date.getUTCMinutes() + (index === 0 ? 5 : 10))
    return date.toISOString()
  })
  const runtimeEditedFlow = await api(`/api/interview-flows/runs/${flowRun.payload.data.id}/definition`, {
    method: 'PATCH', token: managerToken,
    body: {
      mandateId: template.payload.data.id,
      name: editedFlow.payload.data.name,
      reportUserIds: [organizationOnlyUser.id],
      stages: isolatedRunDefinition.payload.data.stages.map((stage, index) => ({
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
  const unchangedSavedFlow = await api(`/api/interview-flows/mandate/${template.payload.data.id}`, {
    token: managerToken,
  })
  const unchangedTemplate = unchangedSavedFlow.payload.data.find(item => item.id === flow.payload.data.id)
  assert.notEqual(new Date(unchangedTemplate.stages[0].scheduled_at).toISOString(), shiftedStageTimes[0])
  const synchronizedInterview = (await db.query(
    `SELECT scheduled_at, duration_minutes, question_count, report_emails
     FROM interviews WHERE id = @id`,
    { id: runtimeStages[0].interview_id }
  ))[0]
  assert.equal(new Date(synchronizedInterview.scheduled_at).toISOString(), shiftedStageTimes[0])
  assert.equal(Number(synchronizedInterview.duration_minutes), 20)
  assert.equal(Number(synchronizedInterview.question_count), 7)
  assert.equal(synchronizedInterview.report_emails, `organization-only-${stamp}@example.test`)
  const updateDelivery = (await db.query(
    `SELECT status FROM email_deliveries
     WHERE interview_id = @interviewId AND kind = 'interview_schedule_update'
     ORDER BY id DESC LIMIT 1`,
    { interviewId: runtimeStages[0].interview_id }
  ))[0]
  assert.equal(updateDelivery.status, 'sent')

  const lastRuntimeStage = runtimeEditedFlow.payload.data.stages.at(-1)
  const appendedStageAt = new Date(
    new Date(lastRuntimeStage.scheduled_at).getTime()
      + Number(lastRuntimeStage.duration_minutes) * 60000
      + 60000
  ).toISOString()
  const runtimeWithDisposableStage = await api(`/api/interview-flows/runs/${flowRun.payload.data.id}/definition`, {
    method: 'PATCH', token: managerToken,
    body: {
      mandateId: template.payload.data.id,
      name: runtimeEditedFlow.payload.data.name,
      reportUserIds: runtimeEditedFlow.payload.data.report_user_ids,
      stages: [
        ...runtimeEditedFlow.payload.data.stages.map(stage => ({
          id: stage.id, name: stage.name, type: stage.type, scheduledAt: stage.scheduled_at,
          durationMinutes: stage.duration_minutes, questionCount: stage.question_count,
          requirePass: stage.require_pass, minimumScore: stage.minimum_score,
          interviewerUserId: stage.interviewer_user_id, location: stage.location,
          meetingUrl: stage.meeting_url,
        })),
        { name: 'Disposable future stage', type: 'exam', scheduledAt: appendedStageAt,
          durationMinutes: 2, questionCount: 2, requirePass: false },
      ],
    },
  })
  assert.equal(runtimeWithDisposableStage.status, 200)
  assert.equal(runtimeWithDisposableStage.payload.data.stages.length, 4)
  const runtimeWithoutDisposableStage = await api(`/api/interview-flows/runs/${flowRun.payload.data.id}/definition`, {
    method: 'PATCH', token: managerToken,
    body: {
      mandateId: template.payload.data.id,
      name: runtimeWithDisposableStage.payload.data.name,
      reportUserIds: runtimeWithDisposableStage.payload.data.report_user_ids,
      stages: runtimeWithDisposableStage.payload.data.stages.slice(0, 3).map(stage => ({
        id: stage.id, name: stage.name, type: stage.type, scheduledAt: stage.scheduled_at,
        durationMinutes: stage.duration_minutes, questionCount: stage.question_count,
        requirePass: stage.require_pass, minimumScore: stage.minimum_score,
        interviewerUserId: stage.interviewer_user_id, location: stage.location,
        meetingUrl: stage.meeting_url,
      })),
    },
  })
  assert.equal(runtimeWithoutDisposableStage.status, 200)
  assert.equal(runtimeWithoutDisposableStage.payload.data.stages.length, 3)
  const retainedRuntimeStageRuns = await db.query(
    `SELECT stage_order, status FROM candidate_flow_stage_runs
     WHERE run_id = @runId ORDER BY stage_order`,
    { runId: flowRun.payload.data.id }
  )
  assert.equal(retainedRuntimeStageRuns.length, 3)
  assert.deepEqual(retainedRuntimeStageRuns.map(stage => Number(stage.stage_order)), [1, 2, 3])
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

  await Promise.all([
    interviewFlowService.handleInterviewResult(flowRun.payload.data.firstInterview.id, 'pass', 8),
    interviewFlowService.handleInterviewResult(flowRun.payload.data.firstInterview.id, 'pass', 8),
  ])
  const advancedStages = await db.query(
    `SELECT status, interview_id FROM candidate_flow_stage_runs WHERE run_id = @runId ORDER BY stage_order`,
    { runId: flowRun.payload.data.id }
  )
  assert.equal(advancedStages[0].status, 'passed')
  assert.equal(advancedStages[1].status, 'scheduled')
  assert.ok(advancedStages[1].interview_id)
  assert.equal(advancedStages[2].status, 'pending')
  const secondStageInterviewCount = (await db.query(
    `SELECT COUNT(*)::int AS count FROM interviews WHERE flow_stage_run_id = (
       SELECT id FROM candidate_flow_stage_runs WHERE run_id = @runId AND stage_order = 2
     )`,
    { runId: flowRun.payload.data.id }
  ))[0].count
  assert.equal(secondStageInterviewCount, 1)

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
  const concurrentContinues = await Promise.all([
    api(`/api/interview-flows/runs/${flowRun.payload.data.id}/continue`, {
      method: 'POST', token: managerToken,
    }),
    api(`/api/interview-flows/runs/${flowRun.payload.data.id}/continue`, {
      method: 'POST', token: managerToken,
    }),
  ])
  const continuedRun = concurrentContinues.find(result => result.status === 200)
  const rejectedConcurrentContinue = concurrentContinues.find(result => result.status === 400)
  assert.ok(continuedRun)
  assert.ok(rejectedConcurrentContinue)
  assert.equal(continuedRun.status, 200)
  assert.equal(continuedRun.payload.data.status, 'active')
  assert.match(rejectedConcurrentContinue.payload.error, /another manager action|not paused/i)
  const statusAfterConcurrentContinue = (await db.query(
    `SELECT status FROM candidate_flow_runs WHERE id = @runId`,
    { runId: flowRun.payload.data.id }
  ))[0]
  assert.equal(statusAfterConcurrentContinue.status, 'active')
  const offlineAssignments = await api('/api/interview-flows/my-assignments', { token: managerToken })
  assert.equal(offlineAssignments.status, 200)
  const offlineAssignment = offlineAssignments.payload.data.find(
    item => item.interview_id === continuedRun.payload.data.interview.id
  )
  assert.ok(offlineAssignment)
  const feedbackForm = new FormData()
  feedbackForm.append('outcome', 'pass')
  feedbackForm.append('feedback', 'Strong offline panel result')
  feedbackForm.append(
    'file',
    new Blob(['QA interviewer attachment'], { type: 'text/plain' }),
    'panel-notes.txt'
  )
  const completedOffline = await api(`/api/interview-flows/assignments/${offlineAssignment.id}/complete`, {
    method: 'POST', token: managerToken, form: feedbackForm,
  })
  assert.equal(completedOffline.status, 200)
  const editedOfflineFeedback = await api(`/api/interview-flows/assignments/${offlineAssignment.id}/feedback`, {
    method: 'PATCH', token: managerToken, body: { feedback: 'Updated panel comment' },
  })
  assert.equal(editedOfflineFeedback.status, 200)
  assert.equal(editedOfflineFeedback.payload.data.outcome, 'pass')
  assert.equal(editedOfflineFeedback.payload.data.feedback, 'Updated panel comment')
  const completedAssignments = await api('/api/interview-flows/my-assignments', { token: managerToken })
  const reviewedAssignment = completedAssignments.payload.data.find(item => item.id === offlineAssignment.id)
  assert.equal(reviewedAssignment.outcome, 'pass')
  assert.equal(reviewedAssignment.feedback, 'Updated panel comment')
  assert.equal(reviewedAssignment.original_filename, 'panel-notes.txt')
  assert.match(reviewedAssignment.file_url, /^https?:\/\//)
  const completedCandidateInterviews = await api('/api/candidate/interviews', {
    token: flowCandidateLogin.payload.data.accessToken,
  })
  const completedCandidateInterview = completedCandidateInterviews.payload.data.find(
    item => item.id === continuedRun.payload.data.interview.id
  )
  assert.equal(completedCandidateInterview.candidate_result, 'pass')
  const mandateSchedules = await api(`/api/interview-flows/mandate/${template.payload.data.id}/schedules`, {
    token: managerToken,
  })
  assert.equal(mandateSchedules.status, 200)
  assert.ok(mandateSchedules.payload.data.some(
    item => item.interview_id === managerInterview.payload.data.id && item.flow_stage_run_id == null
  ))
  assert.ok(mandateSchedules.payload.data.some(
    item => item.interview_id === flowRun.payload.data.firstInterview.id
      && item.template_flow_id === flow.payload.data.id
      && item.flow_id !== flow.payload.data.id
  ))
  const candidateMandates = await api('/api/candidate/client-mandates', {
    token: flowCandidateLogin.payload.data.accessToken,
  })
  assert.equal(candidateMandates.status, 200)
  const candidateMandate = candidateMandates.payload.data.find(item => item.id === primaryClientTeam.id)
  assert.ok(candidateMandate)
  assert.ok(candidateMandate.interviews.some(item => item.id === managerInterview.payload.data.id))
  assert.ok(candidateMandate.interviews.some(
    item => item.id === continuedRun.payload.data.interview.id && item.candidate_result === 'pass'
  ))
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
        { name: 'Immediate second', type: 'exam', scheduledAt: futureIso(12 * 24 * 60 * 60 + 15 * 60), durationMinutes: 2, questionCount: 5 },
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
  const overdueRunRow = (await db.query(
    `SELECT flow_id FROM candidate_flow_runs WHERE id = @runId`,
    { runId: overdueRun.payload.data.id }
  ))[0]
  assert.notEqual(overdueRunRow.flow_id, overdueFlow.payload.data.id)
  await db.query(
    `UPDATE interview_flow_stages
     SET scheduled_at = CURRENT_TIMESTAMP - INTERVAL '1 minute'
     WHERE flow_id = @flowId AND stage_order = 2`,
    { flowId: overdueRunRow.flow_id }
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

  // An unattended stage must not remain scheduled forever. Expiration records a
  // no-show and applies requirePass: false, which schedules the next interviewer round.
  const noShowStageOneAt = futureIso(13 * 24 * 60 * 60)
  const noShowStageTwoAt = futureIso(13 * 24 * 60 * 60 + 2 * 60)
  const noShowFlow = await api('/api/interview-flows', {
    method: 'POST', token: managerToken,
    body: {
      mandateId: template.payload.data.id,
      name: 'No-show progression flow',
      stages: [
        { name: 'Attendance check', type: 'ai_voice', scheduledAt: noShowStageOneAt,
          durationMinutes: 2, questionCount: 2, requirePass: false },
        { name: 'Manager panel', type: 'offline', scheduledAt: noShowStageTwoAt,
          durationMinutes: 2, interviewerUserId: primary.manager.id, location: 'QA room', requirePass: true },
      ],
    },
  })
  assert.equal(noShowFlow.status, 201)
  state.flowIds.push(noShowFlow.payload.data.id)
  const noShowRun = await api(`/api/interview-flows/${noShowFlow.payload.data.id}/runs`, {
    method: 'POST', token: managerToken, body: { clientTeamId: primaryClientTeam.id },
  })
  assert.equal(noShowRun.status, 201)
  state.interviewIds.push(noShowRun.payload.data.firstInterview.id)
  await db.query(
    `UPDATE interviews
     SET scheduled_at = CURRENT_TIMESTAMP - INTERVAL '5 minutes',
         available_from = CURRENT_TIMESTAMP - INTERVAL '5 minutes',
         due_at = CURRENT_TIMESTAMP - INTERVAL '1 minute'
     WHERE id = @id`,
    { id: noShowRun.payload.data.firstInterview.id }
  )
  const runsAfterNoShow = await api(`/api/interview-flows/mandate/${template.payload.data.id}/runs`, {
    token: managerToken,
  })
  assert.equal(runsAfterNoShow.status, 200)
  const noShowRunRows = runsAfterNoShow.payload.data.filter(row => row.run_id === noShowRun.payload.data.id)
  assert.equal(noShowRunRows.find(row => Number(row.stage_order) === 1).stage_status, 'failed')
  const noShowNextStage = noShowRunRows.find(row => Number(row.stage_order) === 2)
  assert.equal(noShowNextStage.stage_status, 'scheduled')
  assert.ok(noShowNextStage.interview_id)
  state.interviewIds.push(noShowNextStage.interview_id)
  const noShowInterview = (await db.query(
    `SELECT status, result FROM interviews WHERE id = @id`,
    { id: noShowRun.payload.data.firstInterview.id }
  ))[0]
  assert.equal(noShowInterview.status, 'completed')
  assert.equal(noShowInterview.result, 'expired_no_show')
  const noShowAssignment = (await db.query(
    `SELECT interviewer_user_id, status FROM interview_assignments WHERE interview_id = @interviewId`,
    { interviewId: noShowNextStage.interview_id }
  ))[0]
  assert.equal(noShowAssignment.interviewer_user_id, primary.manager.id)
  assert.equal(noShowAssignment.status, 'assigned')
  const noShowCandidateInterviews = await api('/api/candidate/interviews', {
    token: flowCandidateLogin.payload.data.accessToken,
  })
  const candidateNoShow = noShowCandidateInterviews.payload.data.find(
    item => item.id === noShowRun.payload.data.firstInterview.id
  )
  assert.equal(candidateNoShow.candidate_result, 'fail')
  assert.ok(noShowCandidateInterviews.payload.data.some(item => item.id === noShowNextStage.interview_id))
  const deletedNoShowRun = await api(`/api/interview-flows/runs/${noShowRun.payload.data.id}`, {
    method: 'DELETE', token: managerToken,
  })
  assert.equal(deletedNoShowRun.status, 200)
  const deletedNoShowFlow = await api(`/api/interview-flows/${noShowFlow.payload.data.id}`, {
    method: 'DELETE', token: managerToken,
  })
  assert.equal(deletedNoShowFlow.status, 200)

  // A late human reviewer must not be converted into a candidate no-show.
  // The round remains assigned and the following AI stage stays pending.
  const reviewerDelayAt = futureIso(14 * 24 * 60 * 60)
  const reviewerDelayFlow = await api('/api/interview-flows', {
    method: 'POST', token: managerToken,
    body: {
      mandateId: template.payload.data.id,
      name: 'Late reviewer flow',
      stages: [
        { name: 'Human panel', type: 'offline', scheduledAt: reviewerDelayAt,
          durationMinutes: 2, interviewerUserId: primary.manager.id, location: 'QA room', requirePass: true },
        { name: 'Follow-up voice', type: 'ai_voice', scheduledAt: futureIso(14 * 24 * 60 * 60 + 2 * 60),
          durationMinutes: 2, questionCount: 2, requirePass: false },
      ],
    },
  })
  assert.equal(reviewerDelayFlow.status, 201)
  state.flowIds.push(reviewerDelayFlow.payload.data.id)
  const reviewerDelayRun = await api(`/api/interview-flows/${reviewerDelayFlow.payload.data.id}/runs`, {
    method: 'POST', token: managerToken, body: { clientTeamId: primaryClientTeam.id },
  })
  assert.equal(reviewerDelayRun.status, 201)
  state.interviewIds.push(reviewerDelayRun.payload.data.firstInterview.id)
  await db.query(
    `UPDATE interviews
     SET scheduled_at = CURRENT_TIMESTAMP - INTERVAL '5 minutes',
         available_from = CURRENT_TIMESTAMP - INTERVAL '5 minutes',
         due_at = CURRENT_TIMESTAMP - INTERVAL '1 minute'
     WHERE id = @id`,
    { id: reviewerDelayRun.payload.data.firstInterview.id }
  )
  const runsAfterReviewerDelay = await api(`/api/interview-flows/mandate/${template.payload.data.id}/runs`, {
    token: managerToken,
  })
  assert.equal(runsAfterReviewerDelay.status, 200)
  const reviewerDelayRows = runsAfterReviewerDelay.payload.data.filter(
    row => row.run_id === reviewerDelayRun.payload.data.id
  )
  const delayedHumanStage = reviewerDelayRows.find(row => Number(row.stage_order) === 1)
  assert.equal(delayedHumanStage.stage_status, 'scheduled')
  assert.equal(delayedHumanStage.interview_status, 'scheduled')
  assert.equal(delayedHumanStage.assignment_status, 'assigned')
  assert.equal(reviewerDelayRows.find(row => Number(row.stage_order) === 2).stage_status, 'pending')
  const deletedReviewerDelayRun = await api(`/api/interview-flows/runs/${reviewerDelayRun.payload.data.id}`, {
    method: 'DELETE', token: managerToken,
  })
  assert.equal(deletedReviewerDelayRun.status, 200)
  const deletedReviewerDelayFlow = await api(`/api/interview-flows/${reviewerDelayFlow.payload.data.id}`, {
    method: 'DELETE', token: managerToken,
  })
  assert.equal(deletedReviewerDelayFlow.status, 200)

  // A manager can retry a failed required stage at a new time. The retry must
  // create exactly one new attempt and restore the run to active.
  const retryFlow = await api('/api/interview-flows', {
    method: 'POST', token: managerToken,
    body: {
      mandateId: template.payload.data.id,
      name: 'Valid retry flow',
      stages: [
        { name: 'Retryable voice', type: 'ai_voice', scheduledAt: futureIso(15 * 24 * 60 * 60),
          durationMinutes: 2, questionCount: 2, requirePass: true },
      ],
    },
  })
  assert.equal(retryFlow.status, 201)
  state.flowIds.push(retryFlow.payload.data.id)
  const retryRun = await api(`/api/interview-flows/${retryFlow.payload.data.id}/runs`, {
    method: 'POST', token: managerToken, body: { clientTeamId: primaryClientTeam.id },
  })
  assert.equal(retryRun.status, 201)
  state.interviewIds.push(retryRun.payload.data.firstInterview.id)
  await interviewFlowService.handleInterviewResult(retryRun.payload.data.firstInterview.id, 'fail', 0)
  const retried = await api(`/api/interview-flows/runs/${retryRun.payload.data.id}/retry`, {
    method: 'POST', token: managerToken,
    body: { scheduledAt: futureIso(16 * 24 * 60 * 60) },
  })
  assert.equal(retried.status, 200)
  assert.equal(retried.payload.data.status, 'active')
  state.interviewIds.push(retried.payload.data.interview.id)
  const retryAttempts = await db.query(
    `SELECT attempt_number, status, interview_id
     FROM candidate_flow_stage_runs
     WHERE run_id = @runId AND stage_order = 1
     ORDER BY attempt_number`,
    { runId: retryRun.payload.data.id }
  )
  assert.equal(retryAttempts.length, 2)
  assert.equal(retryAttempts[0].status, 'failed')
  assert.equal(Number(retryAttempts[1].attempt_number), 2)
  assert.equal(retryAttempts[1].status, 'scheduled')
  assert.equal(retryAttempts[1].interview_id, retried.payload.data.interview.id)
  const deletedRetryRun = await api(`/api/interview-flows/runs/${retryRun.payload.data.id}`, {
    method: 'DELETE', token: managerToken,
  })
  assert.equal(deletedRetryRun.status, 200)
  const deletedRetryFlow = await api(`/api/interview-flows/${retryFlow.payload.data.id}`, {
    method: 'DELETE', token: managerToken,
  })
  assert.equal(deletedRetryFlow.status, 200)

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

  const abandonedSchedule = await api(`/api/templates/client/${template.payload.data.id}/team/${primaryClientTeam.id}/schedule`, {
    method: 'POST', token: managerToken,
    body: {
      type: 'ai_voice', scheduledAt: futureIso(15 * 24 * 60 * 60),
      durationMinutes: 2, questionCount: 3, scheduleTimezone: 'Asia/Calcutta',
    },
  })
  assert.equal(abandonedSchedule.status, 201)
  state.interviewIds.push(abandonedSchedule.payload.data.id)
  await db.query(
    `UPDATE interviews SET status = 'completed', result = 'failed_mid_interview' WHERE id = @id`,
    { id: abandonedSchedule.payload.data.id }
  )

  const candidateInterviews = await api('/api/candidate/interviews', { token: candidateToken })
  assert.equal(candidateInterviews.status, 200)
  assert.ok(candidateInterviews.payload.data.some(item => item.id === schedule.payload.data.id))
  assert.ok(candidateInterviews.payload.data.some(item => item.id === managerInterview.payload.data.id))
  assert.equal(
    candidateInterviews.payload.data.find(item => item.id === abandonedSchedule.payload.data.id).candidate_result,
    'fail'
  )

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
