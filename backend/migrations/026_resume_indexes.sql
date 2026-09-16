-- Migration: 026_resume_indexes.sql
-- Supporting indexes for multi-resume listing (per-owner) and mandate in-use checks,
-- ahead of allowing candidates to keep multiple resume_assets rows at once.

CREATE INDEX IF NOT EXISTS idx_resume_assets_owner_purpose
  ON resume_assets (owner_user_id, purpose) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_client_teams_submitted_resume_asset
  ON client_teams (submitted_resume_asset_id) WHERE submitted_resume_asset_id IS NOT NULL;
