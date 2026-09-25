const mandateLifecycleRepository = require('../repositories/mandate-lifecycle.repository')
const storageService = require('./storage.service')

/**
 * Permanently deletes a mandate and all its descendants.
 * Removes related emails, transcripts, reports, scorecards, report_jobs,
 * interviews, client interview records, client-team rows, requirements, and the mandate itself.
 *
 * Storage cleanup for mandate-owned assets (reports, mandate-specific resumes)
 * is triggered asynchronously after successful DB deletion.
 *
 * @param {number|string} mandateId
 * @param {number|string} managerId
 */
async function permanentlyDeleteMandate(mandateId, managerId) {
  const deleted = await mandateLifecycleRepository.deleteMandateCascade(mandateId, managerId)
  if (!deleted) {
    throw new Error('Mandate not found or not owned by manager')
  }

  // Only real storage paths are cleaned up - legacy rows may hold full external URLs.
  const storagePathsToDelete = [
    ...(deleted.mandateJdPath ? [deleted.mandateJdPath] : []),
    ...deleted.requirementJdPaths,
    ...deleted.reportPdfUrls.filter(url => url && !storageService.isExternalUrl(url)),
    ...deleted.resumeAssetPaths.filter(Boolean),
  ]

  // Asynchronous cleanup
  if (storagePathsToDelete.length > 0) {
    storageService.cleanupOrphanedFiles(storagePathsToDelete)
  }

  return true
}

/**
 * Calculates impact before permanent deletion.
 */
async function getDeletionImpact(mandateId, managerId) {
  const counts = await mandateLifecycleRepository.getDeletionCounts(mandateId, managerId)
  if (!counts) {
    throw new Error('Mandate not found or not owned by manager')
  }

  const inProgressCount = parseInt(counts.inProgress, 10)
  return {
    candidates: parseInt(counts.candidates, 10),
    interviews: parseInt(counts.interviews, 10),
    reports: parseInt(counts.reports, 10),
    inProgressCount,
    canDelete: inProgressCount === 0
  }
}

module.exports = {
  permanentlyDeleteMandate,
  getDeletionImpact
}
