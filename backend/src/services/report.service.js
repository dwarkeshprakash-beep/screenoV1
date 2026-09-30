// backend/src/services/report.service.js
// Report reads for the Reports module. Every read is scope-aware:
// scope.viewAll (the "View All" permission on client_mandates) sees every report in
// scope.companyId; otherwise only reports for interviews the caller owns, created,
// collaborates on, or participates in.
const reportRepository = require('../repositories/report.repository')
const reportJobRepository = require('../repositories/report-job.repository')
const transcriptRepository = require('../repositories/transcript.repository')
const storageService = require('./storage.service')

// Swap a stored PDF path for a short-lived signed URL. Legacy rows that already hold
// a full URL pass through untouched; a signing failure leaves pdf_url null.
async function attachSignedReportUrl(report) {
  if (!report || !report.pdf_url) return report
  if (storageService.isExternalUrl(report.pdf_url)) return report
  try {
    return {
      ...report,
      pdf_storage_path: report.pdf_url,
      pdf_url: await storageService.getSignedUrl(report.pdf_url),
    }
  } catch {
    return {
      ...report,
      pdf_storage_path: report.pdf_url,
      pdf_url: null,
    }
  }
}

async function attachSignedReportUrls(reports) {
  return Promise.all((reports || []).map(attachSignedReportUrl))
}

/**
 * All visible reports plus summary stats.
 * @param {string|null} source - 'client' | 'monthly' | 'general' | null for all
 */
async function getTeamReports(userId, scope, source) {
  const [reports, stats] = scope.viewAll
    ? await Promise.all([
      reportRepository.getReportsForCompany(scope.companyId, source),
      reportRepository.getStatsForCompany(scope.companyId),
    ])
    : await Promise.all([
      reportRepository.getReportsForSelf(userId, source),
      reportRepository.getStatsForSelf(userId),
    ])
  return { reports: await attachSignedReportUrls(reports), stats }
}

async function getReportJobs(managerId) {
  return reportJobRepository.getByManager(managerId)
}

// Returns the re-queued job, or null when no failed job with that id belongs to the manager.
async function retryReportJob(jobId, managerId) {
  return reportJobRepository.retryForManager(jobId, managerId)
}

// Full report for one interview, with transcripts. Null when not found or not visible.
async function getReportByInterview(interviewId, userId, scope) {
  const report = scope.viewAll
    ? await reportRepository.getDetailByInterviewForCompany(interviewId, scope.companyId)
    : await reportRepository.getDetailByInterviewForSelf(interviewId, userId)
  if (!report) return null
  report.transcripts = await transcriptRepository.getByInterview(interviewId)
  return attachSignedReportUrl(report)
}

// Full report by report id, with transcripts. Null when not found or not visible.
async function getReportById(reportId, userId, scope) {
  const report = scope.viewAll
    ? await reportRepository.getDetailByIdForCompany(reportId, scope.companyId)
    : await reportRepository.getDetailByIdForSelf(reportId, userId)
  if (!report) return null
  report.transcripts = await transcriptRepository.getByInterview(report.interview_id)
  return attachSignedReportUrl(report)
}

// Latest report for an internal user, or null.
async function getLatestReportForUser(targetUserId, userId, scope) {
  const report = scope.viewAll
    ? await reportRepository.getLatestByInternalUserForCompany(targetUserId, scope.companyId)
    : await reportRepository.getLatestByInternalUserForSelf(targetUserId, userId)
  return await attachSignedReportUrl(report) || null
}

async function getReportHistoryForUser(targetUserId, userId, scope) {
  const reports = scope.viewAll
    ? await reportRepository.getHistoryByUserForCompany(targetUserId, scope.companyId)
    : await reportRepository.getHistoryByUserForSelf(targetUserId, userId)
  return attachSignedReportUrls(reports)
}

module.exports = {
  getTeamReports,
  getReportJobs,
  retryReportJob,
  getReportByInterview,
  getReportById,
  getLatestReportForUser,
  getReportHistoryForUser,
}
