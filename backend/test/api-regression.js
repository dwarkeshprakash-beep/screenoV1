require('dotenv').config()

const assert = require('node:assert/strict')
const bcrypt = require('bcryptjs')
const db = require('../src/db/connection')

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
  departmentName: `Codex QA ${stamp}`,
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
  const password = 'Test@1234'
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
    if (interviewIds.length > 0) {
      await tx.query(`DELETE FROM report_jobs WHERE interview_id = ANY(@ids)`, { ids: interviewIds })
      await tx.query(`DELETE FROM reports WHERE interview_id = ANY(@ids)`, { ids: interviewIds })
      await tx.query(`DELETE FROM scorecards WHERE interview_id = ANY(@ids)`, { ids: interviewIds })
      await tx.query(`DELETE FROM transcripts WHERE interview_id = ANY(@ids)`, { ids: interviewIds })
      await tx.query(`DELETE FROM email_deliveries WHERE interview_id = ANY(@ids)`, { ids: interviewIds })
      await tx.query(`DELETE FROM interviews WHERE id = ANY(@ids)`, { ids: interviewIds })
    }
    if (state.assessmentIds.length > 0) {
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

  const assessment = await api('/api/assessments/monthly', {
    method: 'POST',
    token: managerToken,
    body: {
      subject: 'Backend Engineering',
      difficulty: 'medium',
      duration_months: 2,
      assessment_date: '2026-07-15',
      team_member_ids: [primary.teamMember.id],
      sub_topics: ['Node.js', 'PostgreSQL'],
      jd_text: 'Backend assessment',
    },
  })
  assert.equal(assessment.status, 201)
  state.assessmentIds.push(assessment.payload.data.id)
  assert.equal(assessment.payload.data.enrollments.length, 1)
  assert.ok(String(assessment.payload.data.enrollments[0].start_date).startsWith('2026-07-15'))

  const monthlyCalendar = await api('/api/assessments/monthly/calendar', {
    token: managerToken,
  })
  assert.equal(monthlyCalendar.status, 200)
  assert.ok(monthlyCalendar.payload.data.some(row =>
    row.assessment_id === assessment.payload.data.id
      && String(row.start_date).startsWith('2026-07-15')
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

  const schedule = await api('/api/schedule', {
    method: 'POST',
    token: managerToken,
    body: {
      teamMemberId: primary.teamMember.id,
      type: 'ai_voice',
      interviewMode: 'simple',
      difficulty: 'medium',
      questionCount: 5,
      clientTemplateId: template.payload.data.id,
    },
  })
  assert.equal(schedule.status, 201)
  assert.equal(schedule.payload.data.status, 'scheduled')
  assert.equal(schedule.payload.data.token, undefined)
  state.interviewIds.push(schedule.payload.data.id)

  const organizationSchedule = await api('/api/schedule', {
    method: 'POST',
    token: managerToken,
    body: {
      userId: organizationOnlyUser.id,
      type: 'ai_voice',
      interviewMode: 'adaptive',
      difficulty: 'hard',
      questionCount: 7,
      reportUserIds: [primary.candidate.id],
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

  const foreignRecipientSchedule = await api('/api/schedule', {
    method: 'POST',
    token: managerToken,
    body: {
      userId: organizationOnlyUser.id,
      type: 'ai_voice',
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

  const launch = await api(`/api/candidate/interviews/${schedule.payload.data.id}/launch`, {
    method: 'POST',
    token: candidateToken,
  })
  assert.equal(launch.status, 200)
  assert.ok(launch.payload.data.launchToken)
  assert.ok(launch.payload.data.sessionToken)

  const magicLink = await api(`/api/auth/magic-link/${launch.payload.data.launchToken}`, {
    method: 'POST',
  })
  assert.equal(magicLink.status, 200)
  assert.equal(magicLink.payload.data.interview.id, schedule.payload.data.id)

  const slots = await api(`/api/schedule/slots/${launch.payload.data.launchToken}`)
  assert.equal(slots.status, 200)
  assert.equal(slots.payload.data.id, schedule.payload.data.id)

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
