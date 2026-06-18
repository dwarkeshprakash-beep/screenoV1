-- Migration 006: Add missing indexes for high-traffic lookup columns.
-- These were identified during the 2026-06-17 senior audit as causing sequential
-- scans on the hottest read paths (login, token refresh, transcript fetches,
-- team list loads).

CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_company_id
  ON users(company_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash
  ON refresh_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_transcripts_interview_id
  ON transcripts(interview_id);
