-- Migration 008: State and flow fixes surfaced in the July 2026 audit.
-- Idempotent: safe to re-run.

ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_text TEXT;
ALTER TABLE external_candidates ADD COLUMN IF NOT EXISTS resume_text TEXT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash
  ON password_reset_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
  ON password_reset_tokens(user_id);
