const express = require('express')
const authMiddleware = require('../middleware/auth')
const { loadAccess, requireModule } = require('../middleware/access')
const { documentUpload } = require('../middleware/upload')
const interviewRepository = require('../repositories/interview.repository')
const interviewFlowService = require('../services/interview-flow.service')
const reportRepository = require('../repositories/report.repository')
const clientTeamRepo = require('../repositories/client-team.repository')
const userRepository = require('../repositories/user.repository')
const storageService = require('../services/storage.service')
const resumeService = require('../services/resume.service')
const candidateIdentityService = require('../services/candidate-identity.service')
const authService = require('../services/auth.service')
const clientOutcomeRoundsRepo = require('../repositories/client-outcome-rounds.repository')
const { launchWindow, launchWindowMessage } = require('../services/interview-window.service')
const db = require('../db/connection')

const router = express.Router()

// No single blanket gate any more - this file mixes routes for several different
// modules (interviews, feedback, outcomes, client_mandates, monthly_assessments), each
// gated per-route below. Only auth/access-context loading is common to all of them.
router.use(authMiddleware, loadAccess)

router.get('/interviews', requireModule('interviews'), async (req, res) => {
  try {
    const identity = candidateIdentityService.fromUser(req.user)
    await interviewFlowService.processExpiredFlows({ userId: req.user.id })
      .catch(err => console.error('Candidate expired flow processing failed:', err.message))
    const interviews = await interviewRepository.getByCandidateIdentity(identity)
    const safeInterviews = interviews.map(({
      token,
      overall_score,
      candidate_decision,
      ...interview
    }) => ({
      ...interview,
      candidate_result: interview.status !== 'completed'
        ? null
        : candidate_decision === 'pass' || interview.result === 'pass'
          ? 'pass'
          : candidate_decision != null || ['fail', 'failed_mid_interview', 'cheating_attempt', 'expired_no_show'].includes(interview.result)
            ? 'fail'
            : null,
    }))
    res.json({ success: true, data: safeInterviews })
  } catch (err) {
    console.error('GET /candidate/interviews failed:', err)
    res.status(500).json({ success: false, error: 'Could not load interviews' })
  }
})

// Launching/joining is about YOUR OWN interview (already scoped by candidate identity
// below), not managing anyone else's - View-level access is enough, not the POST
// default of Save.
router.post('/interviews/:id/launch', requireModule('interviews', { permission: 'View' }), async (req, res) => {
  try {
    const identity = candidateIdentityService.fromUser(req.user)
    const interview = await interviewRepository.getByIdForCandidateIdentity(req.params.id, identity)
    if (!interview) return res.status(404).json({ success: false, error: 'Interview not found' })
    if (!['scheduled', 'in_progress'].includes(interview.status)) {
      return res.status(409).json({
        success: false,
        error: interview.status === 'completed' ? 'Interview already completed' : 'Interview is not available to start',
      })
    }
    const launch = await authService.createCandidateLaunch(interview)
    res.json({ success: true, data: launch })
  } catch (err) {
    console.error('POST /candidate/interviews/:id/launch failed:', err)
    if (['INTERVIEW_NOT_OPEN', 'INTERVIEW_WINDOW_EXPIRED'].includes(err.code)) {
      return res.status(409).json({ success: false, error: err.message, data: err.data || null })
    }
    res.status(500).json({ success: false, error: 'Could not start interview' })
  }
})

router.post('/interviews/:id/join', requireModule('interviews', { permission: 'View' }), async (req, res) => {
  try {
    const identity = candidateIdentityService.fromUser(req.user)
    const interview = await interviewRepository.getByIdForCandidateIdentity(req.params.id, identity)
    if (!interview) return res.status(404).json({ success: false, error: 'Interview not found' })
    if (interview.type !== 'human') {
      return res.status(400).json({ success: false, error: 'Only human interviews can be joined this way' })
    }
    if (interview.status === 'cancelled') {
      return res.status(409).json({ success: false, error: 'Interview has been cancelled' })
    }
    const window = launchWindow(interview)
    if (window.state !== 'open') {
      return res.status(409).json({
        success: false,
        error: launchWindowMessage(window),
        data: {
          opensAt: window.opensAt ? window.opensAt.toISOString() : null,
          closesAt: window.closesAt ? window.closesAt.toISOString() : null,
        },
      })
    }
    if (!interview.meeting_url && !interview.location) {
      return res.status(404).json({ success: false, error: 'No meeting link available' })
    }
    res.json({ success: true, data: { meetingUrl: interview.meeting_url || interview.location } })
  } catch (err) {
    console.error('POST /candidate/interviews/:id/join failed:', err)
    res.status(500).json({ success: false, error: 'Could not join interview' })
  }
})

router.get('/report', requireModule('feedback'), async (req, res) => {
  try {
    const identity = candidateIdentityService.fromUser(req.user)
    const report = await reportRepository.getLatestByCandidateIdentity(identity, identity.interviewId)
    if (!report) return res.status(404).json({ success: false, error: 'No report available yet' })
    res.json({
      success: true,
      data: {
        id: report.id,
        interview_id: report.interview_id,
        status: report.status,
        summary: report.summary,
        strengths: report.strengths,
        created: report.created,
      },
    })
  } catch (err) {
    console.error('GET /candidate/report failed:', err)
    res.status(500).json({ success: false, error: 'Could not load report' })
  }
})

router.get('/reports', requireModule('feedback'), async (req, res) => {
  try {
    const identity = candidateIdentityService.fromUser(req.user)
    const reports = await reportRepository.getHistoryByCandidateIdentity(identity)
    res.json({ success: true, data: reports })
  } catch (err) {
    console.error('GET /candidate/reports failed:', err)
    res.status(500).json({ success: false, error: 'Could not load reports' })
  }
})

// ── Client mandates the candidate has been added to ───────────────────────────

router.get('/client-mandates', requireModule('client_mandates', { permission: 'View' }), async (req, res) => {
  try {
    const rows = await clientTeamRepo.getByUser(req.user.id)

    // Attach scheduled interviews and published client outcome rounds for each mandate.
    const enriched = await Promise.all(rows.map(async row => {
      const db = require('../db/connection')
      const interviews = await db.query(
        `SELECT i.id, i.type, i.status, i.scheduled_at, i.duration_minutes,
                i.location, i.created,
                CASE
                  WHEN i.status = 'completed' AND (sc.decision = 'pass' OR i.result = 'pass') THEN 'pass'
                  WHEN i.status = 'completed' AND (
                    sc.decision IS NOT NULL
                    OR i.result IN ('fail', 'failed_mid_interview', 'cheating_attempt', 'expired_no_show')
                  ) THEN 'fail'
                  ELSE NULL
                END AS candidate_result
         FROM interviews i
         LEFT JOIN scorecards sc ON sc.interview_id = i.id
         WHERE i.client_team_id = @ctId
         ORDER BY i.created DESC`,
        { ctId: row.id }
      )
      const publishedRounds = await clientOutcomeRoundsRepo.listVisibleByClientTeamId(row.id)
      const resumeDownloadUrl = await storageService.resolveFileUrl(row.client_resume_url)
      const jdText = row.jd_sent ? (row.requirement_jd_text || row.jd_text || null) : null
      const mandateTags = row.jd_sent ? (row.requirement_tags || row.mandate_tags || null) : null
      return {
        ...row,
        mandate_role: row.requirement_name || row.mandate_role,
        jd_text: jdText,
        mandate_tags: mandateTags,
        resume_deadline: null,
        client_resume_storage_path: row.client_resume_url && !storageService.isExternalUrl(row.client_resume_url)
          ? row.client_resume_url
          : null,
        client_resume_url: resumeDownloadUrl,
        client_resume_download_url: resumeDownloadUrl,
        interviews,
        published_rounds: publishedRounds,
        latest_published_round: publishedRounds[publishedRounds.length - 1] || null,
      }
    }))

    res.json({ success: true, data: enriched })
  } catch (err) {
    console.error('GET /candidate/client-mandates failed:', err)
    res.status(500).json({ success: false, error: 'Could not load client mandates' })
  }
})

// Submit a resume for a specific client mandate. Three ways to provide one:
// 1. multipart file upload - added to the candidate's resume pool and linked to this mandate
// 2. JSON { resumeAssetId } - link one of the candidate's existing resumes to this mandate
// 3. JSON { useExisting: true } - link the candidate's current default resume (back-compat)
router.post(
  '/client-mandates/:ctId/resume',
  requireModule(['client_mandates', 'outcomes'], { permission: 'View' }),
  documentUpload.single('resume'),
  async (req, res) => {
    try {
      const ctId = parseInt(req.params.ctId, 10)
      const entry = await clientTeamRepo.getById(ctId)
      if (!entry || entry.user_id !== req.user.id) {
        return res.status(404).json({ success: false, error: 'Client mandate entry not found' })
      }

      let asset = null

      if (req.file) {
        const result = await resumeService.addResume(req.user.id, req.file.buffer, req.file)
        if (result.error === 'limit_reached') {
          return res.status(400).json({
            success: false,
            error: `You can have at most ${resumeService.MAX_RESUMES_PER_OWNER} resumes - delete one to add another.`,
          })
        }
        asset = result.asset
      } else if (req.body.resumeAssetId) {
        asset = await resumeService.getOwnedActiveAsset(req.user.id, parseInt(req.body.resumeAssetId, 10))
        if (!asset) return res.status(400).json({ success: false, error: 'Resume not found' })
      } else if (req.body.useExisting === 'true' || req.body.useExisting === true) {
        const profile = await userRepository.getById(req.user.id)
        if (!profile?.current_resume_asset_id) {
          return res.status(400).json({ success: false, error: 'No existing resume on your profile' })
        }
        asset = await resumeService.getOwnedActiveAsset(req.user.id, profile.current_resume_asset_id)
        if (!asset) return res.status(400).json({ success: false, error: 'Profile resume asset not found' })
      } else {
        return res.status(400).json({ success: false, error: 'Provide resumeAssetId, useExisting=true, or a resume file' })
      }

      const updated = await clientTeamRepo.updateClientResume(ctId, asset.storage_path, asset.id)
      const resumeDownloadUrl = await storageService.resolveFileUrl(updated.client_resume_url)

      res.json({
        success: true,
        data: {
          ...updated,
          client_resume_storage_path: updated.client_resume_url && !storageService.isExternalUrl(updated.client_resume_url)
            ? updated.client_resume_url
            : null,
          client_resume_url: resumeDownloadUrl,
          client_resume_download_url: resumeDownloadUrl,
          resume_asset: asset
        }
      })
    } catch (err) {
      console.error('POST /candidate/client-mandates/:ctId/resume failed:', err)
      res.status(500).json({ success: false, error: 'Could not update client resume' })
    }
  }
)

// Get resume metadata for a specific client mandate
router.get('/client-mandates/:ctId/resume', requireModule(['client_mandates', 'outcomes'], { permission: 'View' }), async (req, res) => {
  try {
    const ctId = parseInt(req.params.ctId, 10)
    const entry = await clientTeamRepo.getById(ctId)
    if (!entry || entry.user_id !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Client mandate entry not found' })
    }

    const resumeRepository = require('../repositories/resume.repository')
    let resumeMetadata = null

    if (entry.submitted_resume_asset_id) {
      const asset = await resumeRepository.getAssetById(entry.submitted_resume_asset_id)
      if (asset) {
        const downloadUrl = await storageService.resolveFileUrl(asset.storage_path)
        resumeMetadata = {
          id: asset.id,
          filename: asset.original_filename,
          mimeType: asset.mime_type,
          size: asset.size,
          submittedAt: asset.created_at,
          downloadUrl,
          isSnapshot: asset.purpose === 'mandate_submission'
        }
      }
    } else if (entry.client_resume_url) {
      // Legacy resume without asset record
      resumeMetadata = {
        filename: 'resume.pdf',
        submittedAt: entry.resume_updated_at,
        downloadUrl: await storageService.resolveFileUrl(entry.client_resume_url),
        isSnapshot: false
      }
    }

    res.json({ success: true, data: resumeMetadata })
  } catch (err) {
    console.error('GET /candidate/client-mandates/:ctId/resume failed:', err)
    res.status(500).json({ success: false, error: 'Could not load mandate resume metadata' })
  }
})

// ── Candidate: monthly assessment plans ───────────────────────────────────────

router.get('/monthly-assessments', requireModule('monthly_assessments', { permission: 'View' }), async (req, res) => {
  try {
    const userId = req.user.id

    // Find team_member rows that belong to this user
    const enrollments = await db.query(
      `SELECT
         e.*,
         ma.subject_name,
         ma.difficulty,
         ma.duration_months,
         ma.ai_generated_jd,
         ma.sub_topics,
         tm.manager_id,
         u.first_name AS manager_first_name,
         u.last_name AS manager_last_name,
         c.name AS company_name
       FROM monthly_assessment_enrollments e
       JOIN monthly_assessments ma ON ma.id = e.assessment_id
       JOIN team_members tm ON tm.id = e.team_member_id
       JOIN users u ON u.id = tm.manager_id
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE tm.user_id = @userId
         AND COALESCE(e.status, 'pending') != 'cancelled'
       ORDER BY e.created DESC`,
      { userId }
    )

    const now = new Date()

    const plans = await Promise.all(
      enrollments.map(async (enrollment) => {
        // Fetch occurrences for this enrollment
        const occurrences = await db.query(
          `SELECT
             o.*,
             i.status AS interview_status,
             i.available_from AS i_available_from,
             i.due_at AS i_due_at,
             i.schedule_timezone,
             i.duration_minutes AS i_duration_minutes
           FROM monthly_assessment_occurrences o
           LEFT JOIN interviews i ON i.id = o.interview_id
           WHERE o.enrollment_id = @enrollmentId
           ORDER BY o.period_month ASC`,
          { enrollmentId: enrollment.id }
        )

        const enrichedOccurrences = occurrences.map((occ) => {
          const availableFrom = occ.available_from ? new Date(occ.available_from) : null
          const dueAt = occ.due_at ? new Date(occ.due_at) : null
          let availabilityState = 'upcoming'
          let canLaunch = false

          if (occ.status === 'cancelled') {
            availabilityState = 'cancelled'
          } else if (occ.interview_status === 'completed') {
            availabilityState = 'completed'
          } else if (dueAt && now > dueAt) {
            availabilityState = 'expired'
          } else if (availableFrom && now >= availableFrom) {
            availabilityState = 'open'
            canLaunch = occ.interview_status !== 'completed'
          }

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
            availability_state: availabilityState,
            can_launch: canLaunch,
          }
        })

        return {
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
          occurrences: enrichedOccurrences,
        }
      })
    )

    res.json({ success: true, data: plans })
  } catch (err) {
    console.error('GET /candidate/monthly-assessments failed:', err)
    res.status(500).json({ success: false, error: 'Could not load monthly assessments' })
  }
})

// ── Candidate: client outcome rounds (published only) ──────────────────────────
// Returns all published outcome rounds for mandates the candidate belongs to.
// manager_notes is NEVER included (enforced in repository DTO).

router.get('/client-outcomes', requireModule('outcomes'), async (req, res) => {
  try {
    // Every client_teams row this user is on - the candidate always sees their mandate
    // list, even before any round is published. The JD is only exposed once the
    // manager has actually sent it (jd_sent), same rule as /client-mandates.
    const clientTeams = await clientTeamRepo.getByUser(req.user.id)

    const mandates = await Promise.all(
      clientTeams.map(async (ct) => {
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
      })
    )

    res.json({ success: true, data: mandates })
  } catch (err) {
    console.error('GET /candidate/client-outcomes failed:', err)
    res.status(500).json({ success: false, error: 'Could not load client outcomes' })
  }
})

module.exports = router
