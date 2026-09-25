// backend/src/repositories/mandate-lifecycle.repository.js
// SQL for permanently deleting a mandate and everything under it, plus the pre-delete
// impact counts. Business rules (ownership errors, which paths are real storage files,
// when storage cleanup runs) live in services/mandate-lifecycle.service.js.

const db = require('../db/connection')

/**
 * Delete a mandate and all its descendants in one transaction, children first.
 * Returns the file references found on the deleted rows so the caller can clean up
 * storage, or null (and deletes nothing) if the mandate isn't owned by this manager.
 * @returns {Promise<null | {
 *   mandateJdPath: string|null, requirementJdPaths: string[],
 *   reportPdfUrls: string[], resumeAssetPaths: string[]
 * }>}
 */
async function deleteMandateCascade(mandateId, managerId) {
  return db.transaction(async (tx) => {
    const mandateCheck = await tx.query(
      `SELECT id, jd_file_path FROM client_templates WHERE id = @mandateId AND manager_id = @managerId`,
      { mandateId, managerId }
    )
    if (mandateCheck.length === 0) return null

    const requirementJdPaths = await tx.query(
      `SELECT jd_file_path FROM client_mandate_requirements WHERE mandate_id = @mandateId AND jd_file_path IS NOT NULL`,
      { mandateId }
    )

    const interviewRows = await tx.query(
      `SELECT id FROM interviews WHERE client_template_id = @mandateId`,
      { mandateId }
    )
    const interviewIds = interviewRows.map(row => row.id)

    let reportPaths = []
    if (interviewIds.length > 0) {
      reportPaths = await tx.query(
        `SELECT pdf_url
         FROM reports
         WHERE interview_id = ANY(@interviewIds)`,
        { interviewIds }
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

    // Legacy per-mandate resume copies (from migration 010's backfill).
    const resumeAssetPaths = await tx.query(
      `SELECT storage_path
       FROM resume_assets
       WHERE mandate_id = @mandateId
         AND purpose = 'mandate_submission'`,
      { mandateId }
    )

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

    return {
      mandateJdPath: mandateCheck[0].jd_file_path || null,
      requirementJdPaths: requirementJdPaths.map(row => row.jd_file_path),
      reportPdfUrls: reportPaths.map(row => row.pdf_url),
      resumeAssetPaths: resumeAssetPaths.map(row => row.storage_path),
    }
  })
}

/**
 * Row counts shown before a permanent delete, or null if the mandate isn't owned by
 * this manager. Counts come back as strings (Postgres bigint).
 */
async function getDeletionCounts(mandateId, managerId) {
  const mandateCheck = await db.query(
    `SELECT id FROM client_templates WHERE id = @mandateId AND manager_id = @managerId`,
    { mandateId, managerId }
  )
  if (mandateCheck.length === 0) return null

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
    candidates: candidates.count,
    interviews: interviews.count,
    reports: reports.count,
    inProgress: inProgressInterviews.count,
  }
}

module.exports = { deleteMandateCascade, getDeletionCounts }
