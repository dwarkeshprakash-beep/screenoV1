-- Migration 005: Persist extracted resume tags for external candidates.
-- Internal candidates already store resume tags on users.tags.

ALTER TABLE external_candidates ADD COLUMN IF NOT EXISTS tags TEXT;
