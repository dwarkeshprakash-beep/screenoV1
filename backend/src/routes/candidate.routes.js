const express = require('express')
const authMiddleware = require('../middleware/auth')
const requireRole = require('../middleware/role')
const { documentUpload } = require('../middleware/upload')
const interviewRepository = require('../repositories/interview.repository')
const interviewFlowService = require('../services/interview-flow.service')
const reportRepository = require('../repositories/report.repository')
const clientTeamRepo = require('../repositories/client-team.repository')
const userRepository = require('../repositories/user.repository')
const storageService = require('../services/storage.service')
const candidateIdentityService = require('../services/candidate-identity.service')
const authService = require('../services/auth.service')
const monthlyAssessmentRepository = require('../repositories/monthly-assessment.repository')
const clientOutcomeRoundsRepo = require('../repositories/client-outcome-rounds.repository')
const { launchWindow, launchWindowMessage } = require('../services/interview-window.service')
const db = require('../db/connection')

const router = express.Router()
router.use(authMiddleware, requireRole('candidate'))

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ''))
}

async function safeSignedResumeUrl(value) {
  if (!value) return null
  if (isHttpUrl(value)) return value
  try {
    return await storageService.getSignedUrl(value)
  } catch (err) {
    console.error('Failed to sign resume URL:', err.message)
    return null
  }
}

router.get('/interviews', async (req, res) => {
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

router.post('/interviews/:id/launch', async (req, res) => {
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

router.post('/interviews/:id/join', async (req, res) => {
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

router.get('/report', async (req, res) => {
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

router.get('/reports', async (req, res) => {
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

router.get('/client-mandates', async (req, res) => {
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
      const resumeDownloadUrl = await safeSignedResumeUrl(row.client_resume_url)
      const jdText = row.jd_sent ? (row.requirement_jd_text || row.jd_text || null) : null
      const mandateTags = row.jd_sent ? (row.requirement_tags || row.mandate_tags || null) : null
      return {
        ...row,
        mandate_role: row.requirement_name || row.mandate_role,
        jd_text: jdText,
        mandate_tags: mandateTags,
        resume_deadline: null,
        client_resume_storage_path: row.client_resume_url && !isHttpUrl(row.client_resume_url)
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

// Submit resume for a specific client mandate.
// Option 1 (JSON): { useExisting: true } — creates immutable copy of current profile resume
// Option 2 (multipart): upload a new mandate-specific resume file
router.post(
  '/client-mandates/:ctId/resume',
  documentUpload.single('resume'),
  async (req, res) => {
    try {
      const ctId = parseInt(req.params.ctId, 10)
      const entry = await clientTeamRepo.getById(ctId)
      if (!entry || entry.user_id !== req.user.id) {
        return res.status(404).json({ success: false, error: 'Client mandate entry not found' })
      }

      const resumeRepository = require('../repositories/resume.repository')
      let resumeAsset = null
      let resumeUrlToStore = null

      if (req.body.useExisting === 'true' || req.body.useExisting === true) {
        // Create immutable snapshot of current profile resume
        const profile = await userRepository.getById(req.user.id)
        if (!profile?.current_resume_asset_id && !profile?.resume_url) {
          return res.status(400).json({ success: false, error: 'No existing resume on your profile' })
        }

        let sourcePath = profile.resume_url || null
        let sourceFilename = 'resume.pdf'
        let sourceMimeType = null
        let sourceSize = null

        if (profile.current_resume_asset_id) {
          const profileAsset = await resumeRepository.getAssetById(profile.current_resume_asset_id)
          if (profileAsset) {
            sourcePath = profileAsset.storage_path
            sourceFilename = profileAsset.original_filename || sourceFilename
            sourceMimeType = profileAsset.mime_type || null
            sourceSize = profileAsset.size || null
          }
        }

        if (!sourcePath) {
          return res.status(400).json({ success: false, error: 'Profile resume asset not found' })
        }

        if (isHttpUrl(sourcePath)) {
          // Legacy external URLs cannot be copied through Supabase Storage. Keep the URL,
          // but do not expose it as a raw in-app route.
          resumeUrlToStore = sourcePath
        } else {
          // Create immutable copy for this mandate
          const snapshot = await storageService.copyResumeForMandateSnapshot(
            sourcePath,
            entry.mandate_id,
            ctId
          )

          // Create new resume asset record for mandate snapshot
          resumeAsset = await resumeRepository.createAsset({
            owner_user_id: req.user.id,
            purpose: 'mandate_submission',
            client_team_id: ctId,
            mandate_id: entry.mandate_id,
            original_filename: sourceFilename,
            mime_type: sourceMimeType,
            size: sourceSize,
            storage_path: snapshot.path,
          })
          resumeUrlToStore = resumeAsset.storage_path
        }
      } else if (req.file) {
        // Upload a new mandate-specific resume
        const uploaded = await storageService.uploadResumeAsset(req.file.buffer, req.user.id, req.file)

        // Create resume asset record for uploaded file
        resumeAsset = await resumeRepository.createAsset({
          owner_user_id: req.user.id,
          purpose: 'mandate_submission',
          client_team_id: ctId,
          mandate_id: entry.mandate_id,
          original_filename: uploaded.originalName,
          mime_type: uploaded.mimeType,
          size: uploaded.size,
          storage_path: uploaded.path,
        })
        resumeUrlToStore = resumeAsset.storage_path
      } else {
        return res.status(400).json({ success: false, error: 'Provide either useExisting=true or a resume file' })
      }

      // Update client team with new resume asset
      const updated = await clientTeamRepo.updateClientResume(ctId, resumeUrlToStore, resumeAsset?.id)
      const resumeDownloadUrl = await safeSignedResumeUrl(updated.client_resume_url)

      res.json({
        success: true,
        data: {
          ...updated,
          client_resume_storage_path: updated.client_resume_url && !isHttpUrl(updated.client_resume_url)
            ? updated.client_resume_url
            : null,
          client_resume_url: resumeDownloadUrl,
          client_resume_download_url: resumeDownloadUrl,
          resume_asset: resumeAsset
        }
      })
    } catch (err) {
      console.error('POST /candidate/client-mandates/:ctId/resume failed:', err)
      res.status(500).json({ success: false, error: 'Could not update client resume' })
    }
  }
)

// Get resume metadata for a specific client mandate
router.get('/client-mandates/:ctId/resume', async (req, res) => {
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
        const downloadUrl = await safeSignedResumeUrl(asset.storage_path)
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
        downloadUrl: await safeSignedResumeUrl(entry.client_resume_url),
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

router.get('/monthly-assessments', async (req, res) => {
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

router.get('/client-outcomes', async (req, res) => {
  try {
    const userId = req.user.id

    // Fetch all client_teams this candidate belongs to
    const clientTeams = await db.query(
      `SELECT
         ct.id AS client_team_id,
         ct.mandate_id,
         ct.requirement_id,
         ct.status AS team_status,
         t.client_name,
         t.requirements AS mandate_title,
         cmr.profile_name AS role_assigned,
         t.archived_at
       FROM client_teams ct
       JOIN client_templates t ON t.id = ct.mandate_id
       LEFT JOIN client_mandate_requirements cmr ON cmr.id = ct.requirement_id
       WHERE ct.user_id = @userId
       ORDER BY ct.created DESC`,
      { userId }
    )

    const mandates = await Promise.all(
      clientTeams.map(async (ct) => {
        const rounds = await clientOutcomeRoundsRepo.listVisibleByClientTeamId(ct.client_team_id)
        return {
          client_team_id: ct.client_team_id,
          mandate_id: ct.mandate_id,
          client_name: ct.client_name,
          mandate_title: ct.mandate_title,
          role_assigned: ct.role_assigned,
          is_archived: !!ct.archived_at,
          published_rounds: rounds,
        }
      })
    )

    // Only return mandates that have at least one published round
    // (or all mandates — candidate always sees their mandate list)
    res.json({ success: true, data: mandates })
  } catch (err) {
    console.error('GET /candidate/client-outcomes failed:', err)
    res.status(500).json({ success: false, error: 'Could not load client outcomes' })
  }
})

module.exports = router
