const db = require('../db/connection')
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
  let storagePathsToDelete = []

  await db.transaction(async (tx) => {
    const mandateCheck = await tx.query(
      `SELECT id FROM client_templates WHERE id = @mandateId AND manager_id = @managerId`,
      { mandateId, managerId }
    )
    if (mandateCheck.length === 0) {
      throw new Error('Mandate not found or not owned by manager')
    }

    const interviewRows = await tx.query(
      `SELECT id FROM interviews WHERE client_template_id = @mandateId`,
      { mandateId }
    )
    const interviewIds = interviewRows.map(row => row.id)

    if (interviewIds.length > 0) {
      const reportPaths = await tx.query(
        `SELECT pdf_url
         FROM reports
         WHERE interview_id = ANY(@interviewIds)`,
        { interviewIds }
      )
      storagePathsToDelete.push(
        ...reportPaths
          .map(row => row.pdf_url)
          .filter(url => url && !/^https?:\/\//i.test(url))
      )

      await tx.query(
        `DELETE FROM email_outbox_jobs WHERE interview_id = ANY(@interviewIds)`,
        { interviewIds }
      )
      await tx.query(
        `DELETE FROM email_deliveries WHERE interview_id = ANY(@interviewIds)`,
        { interviewIds }
      )
      await tx.query(
        `DELETE FROM transcripts WHERE interview_id = ANY(@interviewIds)`,
        { interviewIds }
      )
      await tx.query(
        `DELETE FROM reports WHERE interview_id = ANY(@interviewIds)`,
        { interviewIds }
      )
      await tx.query(
        `DELETE FROM scorecards WHERE interview_id = ANY(@interviewIds)`,
        { interviewIds }
      )
      await tx.query(
        `DELETE FROM report_jobs WHERE interview_id = ANY(@interviewIds)`,
        { interviewIds }
      )
      await tx.query(
        `DELETE FROM interviews WHERE id = ANY(@interviewIds)`,
        { interviewIds }
      )
    }

    const resumeAssetPaths = await tx.query(
      `SELECT storage_path
       FROM resume_assets
       WHERE mandate_id = @mandateId
         AND purpose = 'mandate_submission'`,
      { mandateId }
    )
    storagePathsToDelete.push(...resumeAssetPaths.map(row => row.storage_path).filter(Boolean))

    await tx.query(
      `DELETE FROM client_interview_rounds
       WHERE client_team_id IN (SELECT id FROM client_teams WHERE mandate_id = @mandateId)`,
      { mandateId }
    )
    await tx.query(
      `UPDATE client_teams SET submitted_resume_asset_id = NULL WHERE mandate_id = @mandateId`,
      { mandateId }
    )
    await tx.query(
      `DELETE FROM resume_assets
       WHERE mandate_id = @mandateId
         AND purpose = 'mandate_submission'`,
      { mandateId }
    )
    await tx.query(`DELETE FROM client_teams WHERE mandate_id = @mandateId`, { mandateId })
    await tx.query(`DELETE FROM client_mandate_requirements WHERE mandate_id = @mandateId`, { mandateId })
    await tx.query(
      `DELETE FROM client_templates WHERE id = @mandateId AND manager_id = @managerId`,
      { mandateId, managerId }
    )
  })

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
  const mandateCheck = await db.query(
    `SELECT id FROM client_templates WHERE id = @mandateId AND manager_id = @managerId`,
    { mandateId, managerId }
  )
  if (mandateCheck.length === 0) {
    throw new Error('Mandate not found or not owned by manager')
  }

  const [candidates] = await db.query(
    `SELECT COUNT(*) as count FROM client_teams WHERE mandate_id = @mandateId`,
    { mandateId }
  )
  const [interviews] = await db.query(
    `SELECT COUNT(*) as count FROM interviews WHERE client_template_id = @mandateId`,
    { mandateId }
  )
  const [reports] = await db.query(
    `SELECT COUNT(*) as count
     FROM reports r
     JOIN interviews i ON i.id = r.interview_id
     WHERE i.client_template_id = @mandateId`,
    { mandateId }
  )

  const [inProgressInterviews] = await db.query(
    `SELECT COUNT(*) as count
     FROM interviews
     WHERE client_template_id = @mandateId
       AND status = 'in_progress'`,
    { mandateId }
  )

  return {
    candidates: parseInt(candidates.count, 10),
    interviews: parseInt(interviews.count, 10),
    reports: parseInt(reports.count, 10),
    inProgressCount: parseInt(inProgressInterviews.count, 10),
    canDelete: parseInt(inProgressInterviews.count, 10) === 0
  }
}

module.exports = {
  permanentlyDeleteMandate,
  getDeletionImpact
}
