-- Migration: 014_refresh_families.sql
-- Support for refresh token families and rotation grace periods.

-- Add uuid-ossp extension if not exists for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE refresh_tokens
ADD COLUMN IF NOT EXISTS family_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS replaced_by_token_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS replacement_grace_expires TIMESTAMPTZ;

-- Backfill family_id for existing tokens
UPDATE refresh_tokens
SET family_id = gen_random_uuid()
WHERE family_id IS NULL;

ALTER TABLE refresh_tokens
ALTER COLUMN family_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);
