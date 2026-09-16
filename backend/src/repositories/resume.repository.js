const db = require('../db/connection')

/**
 * Creates a new resume asset record.
 * @param {object} asset
 * @param {number|string} asset.owner_user_id
 * @param {string} asset.purpose
 * @param {number|string|null} asset.client_team_id
 * @param {number|string|null} asset.mandate_id
 * @param {string} asset.original_filename
 * @param {string} asset.mime_type
 * @param {number} asset.size
 * @param {string} asset.storage_path
 * @returns {Promise<object>} The inserted record
 */
async function createAsset(asset) {
  const rows = await db.query(
    `INSERT INTO resume_assets 
     (owner_user_id, purpose, client_team_id, mandate_id, original_filename, mime_type, size, storage_path)
     VALUES (@owner_user_id, @purpose, @client_team_id, @mandate_id, @original_filename, @mime_type, @size, @storage_path)
     RETURNING *`,
    {
      owner_user_id: asset.owner_user_id,
      purpose: asset.purpose,
      client_team_id: asset.client_team_id || null,
      mandate_id: asset.mandate_id || null,
      original_filename: asset.original_filename,
      mime_type: asset.mime_type || null,
      size: asset.size || null,
      storage_path: asset.storage_path,
    }
  )
  return rows[0]
}

/**
 * Gets a resume asset by ID.
 * @param {number|string} id 
 * @returns {Promise<object|null>}
 */
async function getAssetById(id) {
  const rows = await db.query(
    `SELECT * FROM resume_assets WHERE id = @id AND deleted_at IS NULL`,
    { id }
  )
  return rows[0] || null
}

/**
 * Soft deletes a resume asset by ID.
 * @param {number|string} id
 * @returns {Promise<object|null>} The deleted record
 */
async function softDeleteAsset(id) {
  const rows = await db.query(
    `UPDATE resume_assets SET deleted_at = NOW() WHERE id = @id RETURNING *`,
    { id }
  )
  return rows[0] || null
}

/**
 * Lists all active (non-deleted) resume assets owned by a user, newest first.
 * @param {number|string} ownerUserId
 * @param {string} purpose
 * @returns {Promise<object[]>}
 */
async function listActiveByOwner(ownerUserId, purpose = 'profile') {
  return db.query(
    `SELECT * FROM resume_assets
     WHERE owner_user_id = @ownerUserId AND purpose = @purpose AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    { ownerUserId, purpose }
  )
}

/**
 * Counts active (non-deleted) resume assets owned by a user.
 * @param {number|string} ownerUserId
 * @param {string} purpose
 * @returns {Promise<number>}
 */
async function countActiveByOwner(ownerUserId, purpose = 'profile') {
  const rows = await db.query(
    `SELECT COUNT(*)::int AS count FROM resume_assets
     WHERE owner_user_id = @ownerUserId AND purpose = @purpose AND deleted_at IS NULL`,
    { ownerUserId, purpose }
  )
  return rows[0]?.count || 0
}

/**
 * Checks whether a resume asset is linked to any client mandate submission.
 * @param {number|string} assetId
 * @returns {Promise<boolean>}
 */
async function isAssetReferencedByMandate(assetId) {
  const rows = await db.query(
    `SELECT EXISTS(
       SELECT 1 FROM client_teams WHERE submitted_resume_asset_id = @assetId
     ) AS in_use`,
    { assetId }
  )
  return !!rows[0]?.in_use
}

module.exports = {
  createAsset,
  getAssetById,
  softDeleteAsset,
  listActiveByOwner,
  countActiveByOwner,
  isAssetReferencedByMandate,
}
