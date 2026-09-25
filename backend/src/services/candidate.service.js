// backend/src/services/candidate.service.js
// The candidate's own dashboard: their interviews, feedback, client mandates, monthly
// plans, and client outcomes. Every read is scoped to the signed-in user.
// Expected failures throw with err.httpStatus set (and err.data when the client needs it).
const interviewRepository = require('../repositories/interview.repository')
const reportRepository = require('../repositories/report.repository')
const clientTeamRepo = require('../repositories/client-team.repository')
const clientOutcomeRoundsRepo = require('../repositories/client-outcome-rounds.repository')
const monthlyAssessmentRepository = require('../repositories/monthly-assessment.repository')
const resumeRepository = require('../repositories/resume.repository')
const userRepository = require('../repositories/user.repository')
const interviewFlowService = require('./interview-flow.service')
const interviewService = require('./interview.service')
const authService = require('./auth.service')
const resumeService = require('./resume.service')
const storageService = require('./storage.service')
const candidateIdentityService = require('./candidate-identity.service')
const { launchWindow, launchWindowMessage } = require('./interview-window.service')

const FAIL_RESULTS = ['fail', 'failed_mid_interview', 'cheating_attempt', 'expired_no_show']

function candidateError(httpStatus, message, data) {
  const err = new Error(message)
  err.httpStatus = httpStatus
  if (data !== undefined) err.data = data
  return err
}

// Pass/fail as the candidate may see it: only for completed interviews, from the
// manager's decision when there is one, else from the interview result.
function candidateResult(interview, candidateDecision) {
  if (interview.status !== 'completed') return null
  if (candidateDecision === 'pass' || interview.result === 'pass') return 'pass'
  if (candidateDecision != null || FAIL_RESULTS.includes(interview.result)) return 'fail'
  return null
}

// Replace a stored client resume reference with download URLs, keeping the raw storage path.
async function withClientResumeUrls(row) {
  const resumeDownloadUrl = await storageService.resolveFileUrl(row.client_resume_url)
  return {
    client_resume_storage_path: row.client_resume_url && !storageService.isExternalUrl(row.client_resume_url)
      ? row.client_resume_url
      : null,
    client_resume_url: resumeDownloadUrl,
    client_resume_download_url: resumeDownloadUrl,
  }
}

// Load one client_teams row, only when it belongs to the user.
async function getOwnedClientTeamEntry(userId, ctId) {
  const entry = await clientTeamRepo.getById(ctId)
  if (!entry || entry.user_id !== userId) throw candidateError(404, 'Client mandate entry not found')
  return entry
}

// ── Interviews ────────────────────────────────────────────────────────────────

async function listInterviews(user) {
  const identity = candidateIdentityService.fromUser(user)
  await interviewFlowService.processExpiredFlows({ userId: user.id })
    .catch(err => console.error('Candidate expired flow processing failed:', err.message))
  const interviews = await interviewRepository.getByCandidateIdentity(identity)
  // token, score and the raw decision are never sent to the candidate.
  return interviews.map(({ token, overall_score, candidate_decision, ...interview }) => ({
    ...interview,
    candidate_result: candidateResult(interview, candidate_decision),
  }))
}

// Launch payload for the candidate's own scheduled or in-progress interview. Launch-window
// errors from authService keep their err.code (INTERVIEW_NOT_OPEN / INTERVIEW_WINDOW_EXPIRED).
async function launchInterview(user, interviewId) {
  const identity = candidateIdentityService.fromUser(user)
  const interview = await interviewRepository.getByIdForCandidateIdentity(interviewId, identity)
  if (!interview) throw candidateError(404, 'Interview not found')
  if (!['scheduled', 'in_progress'].includes(interview.status)) {
    throw candidateError(409, interview.status === 'completed' ? 'Interview already completed' : 'Interview is not available to start')
  }
  return authService.createCandidateLaunch(interview)
}

// Meeting link for the candidate's own human interview, once its launch window is open.
async function joinInterview(user, interviewId) {
  const identity = candidateIdentityService.fromUser(user)
  const interview = await interviewRepository.getByIdForCandidateIdentity(interviewId, identity)
  if (!interview) throw candidateError(404, 'Interview not found')
  if (interview.type !== 'human') throw candidateError(400, 'Only human interviews can be joined this way')
  if (interview.status === 'cancelled') throw candidateError(409, 'Interview has been cancelled')

  const window = launchWindow(interview)
  if (window.state !== 'open') {
    throw candidateError(409, launchWindowMessage(window), {
      opensAt: window.opensAt ? window.opensAt.toISOString() : null,
      closesAt: window.closesAt ? window.closesAt.toISOString() : null,
    })
  }
  if (!interview.meeting_url && !interview.location) throw candidateError(404, 'No meeting link available')
  return { meetingUrl: interview.meeting_url || interview.location }
}

// ── Feedback ──────────────────────────────────────────────────────────────────

async function getLatestReport(user) {
  const identity = candidateIdentityService.fromUser(user)
  const report = await reportRepository.getLatestByCandidateIdentity(identity, identity.interviewId)
  if (!report) throw candidateError(404, 'No report available yet')
  return interviewService.toCandidateReportSummary(report)
}

async function listReports(user) {
  return reportRepository.getHistoryByCandidateIdentity(candidateIdentityService.fromUser(user))
}

// ── Client mandates ───────────────────────────────────────────────────────────

// Every mandate the user is on, with their scheduled interviews and published outcome
// rounds. The JD and tags are only exposed once the manager has sent the JD.
async function listClientMandates(userId) {
  const rows = await clientTeamRepo.getByUser(userId)

  // One query for every mandate's interviews (not one per mandate), grouped by row.
  const interviewRows = await interviewRepository.getCandidateViewByClientTeamIds(rows.map(row => row.id))
  const interviewsByClientTeam = new Map()
  for (const { client_team_id: clientTeamId, ...interview } of interviewRows) {
    if (!interviewsByClientTeam.has(clientTeamId)) interviewsByClientTeam.set(clientTeamId, [])
    interviewsByClientTeam.get(clientTeamId).push(interview)
  }

  return Promise.all(rows.map(async row => {
    const publishedRounds = await clientOutcomeRoundsRepo.listVisibleByClientTeamId(row.id)
    const resumeUrls = await withClientResumeUrls(row)
    return {
      ...row,
      mandate_role: row.requirement_name || row.mandate_role,
      jd_text: row.jd_sent ? (row.requirement_jd_text || row.jd_text || null) : null,
      mandate_tags: row.jd_sent ? (row.requirement_tags || row.mandate_tags || null) : null,
      resume_deadline: null,
      ...resumeUrls,
      interviews: interviewsByClientTeam.get(row.id) || [],
      published_rounds: publishedRounds,
      latest_published_round: publishedRounds[publishedRounds.length - 1] || null,
    }
  }))
}

/**
 * Link a resume to one of the user's client mandate entries. Exactly one source is used:
 * an uploaded file (added to the resume pool), an existing resumeAssetId, or
 * useExisting (the profile's current default resume).
 */
async function submitClientMandateResume(userId, ctId, { file, resumeAssetId, useExisting }) {
  await getOwnedClientTeamEntry(userId, ctId)

  let asset = null
  if (file) {
    const result = await resumeService.addResume(userId, file.buffer, file)
    if (result.error === 'limit_reached') {
      throw candidateError(400, `You can have at most ${resumeService.MAX_RESUMES_PER_OWNER} resumes - delete one to add another.`)
    }
    asset = result.asset
  } else if (resumeAssetId) {
    asset = await resumeService.getOwnedActiveAsset(userId, parseInt(resumeAssetId, 10))
    if (!asset) throw candidateError(400, 'Resume not found')
  } else if (useExisting === 'true' || useExisting === true) {
    const profile = await userRepository.getById(userId)
    if (!profile?.current_resume_asset_id) throw candidateError(400, 'No existing resume on your profile')
    asset = await resumeService.getOwnedActiveAsset(userId, profile.current_resume_asset_id)
    if (!asset) throw candidateError(400, 'Profile resume asset not found')
  } else {
    throw candidateError(400, 'Provide resumeAssetId, useExisting=true, or a resume file')
  }

  const updated = await clientTeamRepo.updateClientResume(ctId, asset.storage_path, asset.id)
  return {
    ...updated,
    ...await withClientResumeUrls(updated),
    resume_asset: asset,
  }
}

// Metadata for the resume submitted to one mandate, or null when none was submitted.
async function getClientMandateResume(userId, ctId) {
  const entry = await getOwnedClientTeamEntry(userId, ctId)

  if (entry.submitted_resume_asset_id) {
    const asset = await resumeRepository.getAssetById(entry.submitted_resume_asset_id)
    if (!asset) return null
    return {
      id: asset.id,
      filename: asset.original_filename,
      mimeType: asset.mime_type,
      size: asset.size,
      submittedAt: asset.created_at,
      downloadUrl: await storageService.resolveFileUrl(asset.storage_path),
      isSnapshot: asset.purpose === 'mandate_submission',
    }
  }

  if (entry.client_resume_url) {
    // Legacy resume without asset record
    return {
      filename: 'resume.pdf',
      submittedAt: entry.resume_updated_at,
      downloadUrl: await storageService.resolveFileUrl(entry.client_resume_url),
      isSnapshot: false,
    }
  }

  return null
}

// ── Monthly assessment plans ──────────────────────────────────────────────────

// Where one monthly occurrence stands for the candidate right now.
function occurrenceAvailability(occ, now) {
  const availableFrom = occ.available_from ? new Date(occ.available_from) : null
  const dueAt = occ.due_at ? new Date(occ.due_at) : null

  if (occ.status === 'cancelled') return { state: 'cancelled', canLaunch: false }
  if (occ.interview_status === 'completed') return { state: 'completed', canLaunch: false }
  if (dueAt && now > dueAt) return { state: 'expired', canLaunch: false }
  if (availableFrom && now >= availableFrom) return { state: 'open', canLaunch: true }
  return { state: 'upcoming', canLaunch: false }
}

async function listMonthlyPlans(userId) {
  const enrollments = await monthlyAssessmentRepository.getCandidateEnrollments(userId)

  // One query for every enrollment's occurrences (not one per enrollment), grouped by enrollment.
  const occurrenceRows = await monthlyAssessmentRepository.getOccurrencesWithInterviewByEnrollmentIds(
    enrollments.map(enrollment => enrollment.id)
  )
  const occurrencesByEnrollment = new Map()
  for (const occurrence of occurrenceRows) {
    if (!occurrencesByEnrollment.has(occurrence.enrollment_id)) occurrencesByEnrollment.set(occurrence.enrollment_id, [])
    occurrencesByEnrollment.get(occurrence.enrollment_id).push(occurrence)
  }

  const now = new Date()
  return enrollments.map(enrollment => ({
    enrollment_id: enrollment.id,
    assessment_id: enrollment.assessment_id,
    subject_name: enrollment.subject_name,
    difficulty: enrollment.difficulty,
    duration_months: enrollment.duration_months,
    study_material: enrollment.ai_generated_jd || null,
    sub_topics: enrollment.sub_topics || null,
    company_name: enrollment.company_name || null,
    start_date: enrollment.start_date,
    end_date: enrollment.end_date,
    enrollment_status: enrollment.status,
    server_now: now.toISOString(),
    occurrences: (occurrencesByEnrollment.get(enrollment.id) || []).map(occ => {
      const availability = occurrenceAvailability(occ, now)
      return {
        id: occ.id,
        enrollment_id: occ.enrollment_id,
        period_month: occ.period_month,
        available_from: occ.available_from,
        due_at: occ.due_at,
        duration_minutes: occ.i_duration_minutes || occ.duration_minutes,
        interview_id: occ.interview_id,
        occurrence_status: occ.status,
        interview_status: occ.interview_status,
        availability_state: availability.state,
        can_launch: availability.canLaunch,
      }
    }),
  }))
}

// ── Client outcomes ───────────────────────────────────────────────────────────

// Every mandate the user is on with its published outcome rounds - the list shows even
// before any round is published. manager_notes is never included (repository DTO).
async function listClientOutcomes(userId) {
  const clientTeams = await clientTeamRepo.getByUser(userId)

  return Promise.all(clientTeams.map(async ct => {
    const [rounds, resumeUrl] = await Promise.all([
      clientOutcomeRoundsRepo.listVisibleByClientTeamId(ct.id),
      storageService.resolveFileUrl(ct.client_resume_url),
    ])
    return {
      client_team_id: ct.id,
      mandate_id: ct.mandate_id,
      client_name: ct.client_name,
      mandate_title: ct.mandate_role,
      role_assigned: ct.requirement_name,
      is_archived: !!ct.mandate_archived_at,
      jd_sent: !!ct.jd_sent,
      jd_sent_at: ct.jd_sent ? ct.jd_sent_at : null,
      jd_text: ct.jd_sent ? (ct.requirement_jd_text || ct.jd_text || null) : null,
      jd_tags: ct.jd_sent ? (ct.requirement_tags || ct.mandate_tags || null) : null,
      resume_deadline: ct.requirement_resume_deadline || ct.mandate_resume_deadline || null,
      client_resume_url: resumeUrl,
      published_rounds: rounds,
    }
  }))
}

module.exports = {
  listInterviews,
  launchInterview,
  joinInterview,
  getLatestReport,
  listReports,
  listClientMandates,
  submitClientMandateResume,
  getClientMandateResume,
  listMonthlyPlans,
  listClientOutcomes,
}
